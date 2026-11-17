import express from "express";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { haunt } from "./agent/crawler.js";
import type { HauntReport, HauntRequest, Finding } from "./types.js";

// ── Gemini AI summary (optional) ─────────────────────────────────────────────

/**
 * Calls the Gemini REST API to produce a one-paragraph plain-text summary of
 * the report's findings.  Returns undefined (never throws) on any failure:
 * missing key, bad key, network error, timeout, or empty response.
 * The API key is NEVER logged or included in any response.
 */
async function fetchGeminiSummary(report: HauntReport): Promise<string | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return undefined;

  const model = "gemini-3.5-flash";
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const topFindings = report.findings.slice(0, 10).map((f) =>
    `[${f.severity}] ${f.check}: ${f.title} — ${f.detail}`
  ).join("\n");

  const prompt =
    `You are a QA assistant. Write a single plain-text paragraph (no markdown, ` +
    `no bullet points) summarising the following GhostQA haunt findings for ` +
    `${report.target}. Mention the hauntedness score (${report.hauntedness}/100), ` +
    `the most important issues, and one actionable next step. ` +
    `Keep it under 120 words.\n\nFindings:\n${topFindings}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  // Free-tier gemini-3.5-flash is slow: a trivial 2-token reply measured
  // 27.8s on 14/11/2026, and a real ~100-word summary took >45s, so the
  // 10s and 45s timeouts could never succeed. 120s gives it room; the
  // haunt still completes, just slower. (Test 14/11 ~12:53 pending.)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      // Log status only — never log the response body (may echo the key back)
      console.error(`[GhostQA] Gemini API returned HTTP ${res.status}; skipping AI summary.`);
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as any;
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || text.trim() === "") {
      console.error("[GhostQA] Gemini returned an empty response; skipping AI summary.");
      return undefined;
    }

    return text.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Strip the key from the message just in case a redirect URL leaked it
    const safe = apiKey ? msg.replace(new RegExp(apiKey, "g"), "***") : msg;
    console.error(`[GhostQA] Gemini call failed: ${safe}; skipping AI summary.`);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// reports/ lives two levels up from dist/ (the compiled location),
// i.e. at the project root.  Created lazily by the crawler.
const REPORTS_ROOT = join(__dirname, "..", "reports");

const reports = new Map<string, HauntReport>();

app.use(express.json());
// Serve the UI
app.use(express.static(join(__dirname, "..", "public")));
// Serve per-report screenshot files (reports/<id>/page-N.png)
app.use("/reports", express.static(REPORTS_ROOT));

// ── API ───────────────────────────────────────────────────────────────────────

// Start a haunt: crawl the target and run every check.
app.post("/api/haunt", async (req, res) => {
  const { url, maxPages = 25, maxDepth = 2 } = req.body as HauntRequest;
  if (!url || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: "url must be an http(s) URL" });
    return;
  }
  const id = randomUUID();
  try {
    const report = await haunt(id, url, { maxPages, maxDepth });
    reports.set(id, report);
    // Reply immediately — the haunt itself is the deliverable.
    res.json(report);
    // Optional AI summary in the background: free-tier Gemini is far too
    // slow to block on (measured 27.8s for a trivial reply, >120s for a
    // real one). It attaches to the stored report when it eventually
    // arrives, and the report page shows it on refresh.
    fetchGeminiSummary(report).then((aiSummary) => {
      if (aiSummary) report.aiSummary = aiSummary;
    });
  } catch (err) {
    console.error("Haunt failed:", err);
    res.status(500).json({ error: "haunt failed", detail: (err as Error).message });
  }
});

app.get("/api/report/:id", (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) {
    res.status(404).json({ error: "report not found" });
    return;
  }
  res.json(report);
});

// ── Report HTML page ──────────────────────────────────────────────────────────

function severityEmoji(sev: Finding["severity"]): string {
  switch (sev) {
    case "critical":    return "💀";
    case "major":       return "🔥";
    case "minor":       return "👻";
    case "poltergeist": return "🌀";
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderReportHtml(report: HauntReport): string {
  const scoreLabel =
    report.hauntedness === 0  ? "No ghosts found. Suspiciously clean…"
    : report.hauntedness < 30 ? "A few restless spirits."
    : report.hauntedness < 60 ? "Genuinely haunted."
    : "FULL POLTERGEIST. Call an exorcist (or a QA).";

  const findingsHtml = report.findings.length === 0
    ? `<p class="empty-state">🕊️ No findings. This place is clean.</p>`
    : report.findings.map((f) => `
      <li class="finding sev-${f.severity}">
        <div class="finding-header">
          <span class="badge badge-${f.severity}">${severityEmoji(f.severity)} ${escapeHtml(f.severity)}</span>
          <span class="check-id">${escapeHtml(f.check)}</span>
        </div>
        <strong>${escapeHtml(f.title)}</strong>
        <p class="finding-page">📄 ${escapeHtml(f.page)}</p>
        <p class="finding-detail">${escapeHtml(f.detail)}</p>
        ${f.fix ? `<p class="finding-fix">🔧 <strong>Suggested fix:</strong> ${escapeHtml(f.fix)}</p>` : ""}
        ${f.evidence ? `<pre class="evidence">${escapeHtml(f.evidence)}</pre>` : ""}
        ${f.screenshot ? `<details class="screenshot-wrap">
          <summary>🖼️ Screenshot</summary>
          <img class="screenshot" src="${escapeHtml(f.screenshot)}" alt="Screenshot of ${escapeHtml(f.page)}" loading="lazy" />
        </details>` : ""}
        <label class="fix-check"><input type="checkbox" class="finding-check" data-finding-id="${escapeHtml(f.id)}" /> ✅ Fixed</label>
      </li>`).join("\n");

  // Fixed counter for the interactive checklist (only when findings exist).
  const fixCounterHtml = report.findings.length > 0
    ? `<div id="fix-counter" class="fix-counter">0/${report.findings.length} fixed</div>`
    : "";

  // Build copy-as-markdown data embedded in the page as JSON.
  // Escape `<` to prevent a finding whose text contains `</script>` from
  // breaking out of the script block.  \u003c is a safe JS unicode escape.
  const mdReport = JSON.stringify(report).replace(/</g, "\\u003c");

  // AI summary section (shown only when present); when a key is configured
  // but the slow background call has not returned yet, say so honestly.
  const aiSummaryHtml = report.aiSummary
    ? `<section id="ai-summary">
        <h3>👾 Spectral Analysis</h3>
        <p class="ai-summary-text">${escapeHtml(report.aiSummary)}</p>
      </section>`
    : process.env.GEMINI_API_KEY
      ? `<section id="ai-summary-pending">
        <h3>👾 Spectral Analysis</h3>
        <p class="ai-summary-text">Still brewing — the spirits are slow today. Refresh this page in a bit.</p>
      </section>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GhostQA Report — ${escapeHtml(report.target)}</title>
<link rel="stylesheet" href="/styles.css" />
<style>
  .report-meta { color: var(--dim); font-size: 0.9rem; margin-bottom: 1.5rem; }
  .report-meta span { margin-right: 1.5rem; }
  .finding { background: var(--panel); border-left: 4px solid var(--dim); border-radius: 8px; padding: 1rem; margin-bottom: 0.9rem; }
  .finding.sev-critical    { border-left-color: var(--danger); }
  .finding.sev-major       { border-left-color: var(--warn); }
  .finding.sev-minor       { border-left-color: var(--dim); }
  .finding.sev-poltergeist { border-left-color: var(--eerie); }
  .finding-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; }
  .badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; background: rgba(255,255,255,0.08); }
  .badge-critical    { color: var(--danger); }
  .badge-major       { color: var(--warn); }
  .badge-minor       { color: var(--dim); }
  .badge-poltergeist { color: var(--eerie); }
  .check-id { font-size: 0.75rem; color: var(--dim); font-family: monospace; }
  .finding-page { font-size: 0.82rem; color: var(--dim); margin: 0.25rem 0; word-break: break-all; }
  .finding-detail { margin: 0.25rem 0; }
  .evidence { background: #0a0718; border-radius: 6px; padding: 0.6rem 0.8rem; font-size: 0.8rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; color: var(--eerie); margin-top: 0.5rem; }
  .screenshot-wrap { margin-top: 0.75rem; }
  .screenshot-wrap summary { cursor: pointer; color: var(--glow); font-size: 0.9rem; }
  .screenshot { max-width: 100%; border-radius: 6px; margin-top: 0.5rem; border: 1px solid rgba(167,139,250,0.3); }
  .finding-fix { margin: 0.5rem 0 0; font-size: 0.9rem; background: rgba(167,139,250,0.08); border-left: 3px solid var(--glow); border-radius: 4px; padding: 0.5rem 0.75rem; }
  .fix-check { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; cursor: pointer; color: var(--dim); font-size: 0.9rem; }
  .fix-check input { cursor: pointer; accent-color: var(--glow); }
  .finding.is-fixed { opacity: 0.55; }
  .fix-counter { position: sticky; top: 0; z-index: 10; background: var(--panel); border: 1px solid rgba(167,139,250,0.3); border-radius: 8px; padding: 0.6rem 1rem; font-weight: bold; margin-bottom: 1rem; }
  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--dim); font-size: 1.1rem; }
  .copy-btn { margin-top: 1.5rem; }
  .ai-summary-text { font-style: italic; color: var(--eerie); background: rgba(167,139,250,0.08); border-left: 3px solid var(--eerie); border-radius: 4px; padding: 0.75rem 1rem; margin: 0.5rem 0 0; line-height: 1.6; }
  #ai-summary h3 { margin-bottom: 0.4rem; font-size: 1rem; }
  .copy-btn button { background: rgba(167,139,250,0.15); border: 1px solid var(--glow); color: var(--glow); }
  .copy-btn button:hover { background: rgba(167,139,250,0.25); filter: none; }
  .copy-feedback { font-size: 0.85rem; color: var(--eerie); margin-left: 0.75rem; opacity: 0; transition: opacity 0.3s; }
  .copy-feedback.show { opacity: 1; }
  .back-link { display: inline-block; margin-bottom: 1.5rem; color: var(--glow); text-decoration: none; font-size: 0.9rem; }
  .back-link:hover { text-decoration: underline; }
  #findings-list { list-style: none; padding: 0; }
  .score-bar-wrap { margin: 1rem 0; }
  .score-bar-track { background: rgba(255,255,255,0.08); border-radius: 999px; height: 10px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
</style>
</head>
<body>
<header>
  <h1>GhostQA</h1>
  <p class="tagline">Haunt Report</p>
</header>
<main>
  <a class="back-link" href="/">← Back to new haunt</a>

  <h2>${escapeHtml(report.target)}</h2>
  <div class="report-meta">
    <span>🕒 Started ${escapeHtml(new Date(report.startedAt).toLocaleString())}</span>
    <span>📄 ${report.pagesVisited} page${report.pagesVisited !== 1 ? "s" : ""} visited</span>
    <span>🆔 <code>${escapeHtml(report.id)}</code></span>
  </div>

  <section id="score">
    <h2>Hauntedness: <span id="score-value">${report.hauntedness}</span>/100</h2>
    <div class="score-bar-wrap">
      <div class="score-bar-track">
        <div class="score-bar-fill" id="score-bar" style="width:0%;background:${
          report.hauntedness === 0 ? "var(--eerie)"
          : report.hauntedness < 30 ? "var(--dim)"
          : report.hauntedness < 60 ? "var(--warn)"
          : "var(--danger)"}"></div>
      </div>
    </div>
    <p id="score-label">${escapeHtml(scoreLabel)}</p>
  </section>

  ${aiSummaryHtml}

  <div class="copy-btn">
    <button id="copy-md-btn">📋 Copy as Markdown</button>
    <span class="copy-feedback" id="copy-feedback">Copied!</span>
  </div>

  ${fixCounterHtml}

  <ul id="findings-list">${findingsHtml}</ul>
</main>
<script>
  // Animate score bar on load
  window.addEventListener("load", () => {
    const bar = document.getElementById("score-bar");
    if (bar) setTimeout(() => { bar.style.width = "${report.hauntedness}%"; }, 100);
  });

  // Copy-as-Markdown
  document.getElementById("copy-md-btn").addEventListener("click", () => {
    const report = ${mdReport};
    const lines = [];
    lines.push("# GhostQA Haunt Report");
    lines.push("");
    lines.push(\`**Target:** \${report.target}\`);
    lines.push(\`**Started:** \${new Date(report.startedAt).toLocaleString()}\`);
    lines.push(\`**Pages visited:** \${report.pagesVisited}\`);
    lines.push(\`**Hauntedness score:** \${report.hauntedness}/100\`);
    lines.push("");
    if (report.aiSummary) {
      lines.push("## Spectral Analysis (AI Summary)");
      lines.push("");
      lines.push(report.aiSummary);
      lines.push("");
    }
    if (report.findings.length === 0) {
      lines.push("*No findings — this site is clean.*");
    } else {
      lines.push("## Findings");
      lines.push("");
      lines.push("| Severity | Check | Title | Page |");
      lines.push("| -------- | ----- | ----- | ---- |");
      for (const f of report.findings) {
        const title = f.title.replace(/\\|/g, "\\\\|");
        const page  = f.page.replace(/\\|/g, "\\\\|");
        lines.push(\`| \${f.severity} | \${f.check} | \${title} | \${page} |\`);
      }
      lines.push("");
      lines.push("## Finding Details");
      for (const f of report.findings) {
        lines.push(\`\\n### [\${f.severity.toUpperCase()}] \${f.title}\`);
        lines.push(\`- **Check:** \${f.check}\`);
        lines.push(\`- **Page:** \${f.page}\`);
        lines.push(\`- **Detail:** \${f.detail}\`);
        if (f.evidence) lines.push(\`- **Evidence:** \\\`\${f.evidence}\\\`\`);
      }
      lines.push("");
      lines.push("## Pages Visited");
      lines.push("");
      lines.push("| URL | Status | Load (ms) | Findings |");
      lines.push("| --- | ------ | --------- | -------- |");
      for (const p of report.pages) {
        lines.push(\`| \${p.url} | \${p.status} | \${p.loadMs} | \${p.findings.length} |\`);
      }
    }
    navigator.clipboard.writeText(lines.join("\\n")).then(() => {
      const fb = document.getElementById("copy-feedback");
      fb.classList.add("show");
      setTimeout(() => fb.classList.remove("show"), 2000);
    });
  });

  // Interactive fix checklist — checked state persists in localStorage per report id
  (function () {
    const STORAGE_KEY = "ghostqa-fixed-${report.id}";
    const boxes = Array.prototype.slice.call(document.querySelectorAll(".finding-check"));
    const counterEl = document.getElementById("fix-counter");
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { saved = []; }
    if (!Array.isArray(saved)) saved = [];
    const savedSet = {};
    saved.forEach((id) => { savedSet[id] = true; });
    function refresh() {
      const checked = boxes.filter((b) => b.checked);
      if (counterEl) counterEl.textContent = checked.length + "/" + boxes.length + " fixed";
      boxes.forEach((b) => {
        const li = b.closest("li.finding");
        if (li) li.classList.toggle("is-fixed", b.checked);
      });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked.map((b) => b.dataset.findingId))); } catch (e) {}
    }
    boxes.forEach((b) => {
      if (savedSet[b.dataset.findingId]) b.checked = true;
      b.addEventListener("change", refresh);
    });
    refresh();
  })();
</script>
</body>
</html>`;
}

app.get("/report/:id", (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) {
    res.status(404).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not found — GhostQA</title><link rel="stylesheet" href="/styles.css"></head><body><header><h1>GhostQA</h1></header><main><p style="text-align:center;padding:3rem;color:var(--dim)">👻 This report has vanished into the ether.<br><a href="/" style="color:var(--glow)">← Start a new haunt</a></p></main></body></html>`);
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderReportHtml(report));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`GhostQA haunting on http://localhost:${PORT}`);
});
