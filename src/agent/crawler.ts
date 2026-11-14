import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "./checks.js";
import { buildReport } from "./reporter.js";
import type { HauntReport, PageResult } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// reports/ lives two levels up from dist/agent/ (the compiled location)
const REPORTS_ROOT = join(__dirname, "..", "..", "reports");

export interface HauntOptions {
  maxPages: number;
  maxDepth: number;
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

/**
 * Haunt a site: crawl same-origin pages (BFS, bounded), run the checks on
 * every page, and build the report. One browser, pages visited one at a time.
 *
 * NOTE on failed-request capture: Playwright's `requestfailed` event fires
 * for network-level failures (DNS, timeout, connection refused) but NOT for
 * HTTP error responses (4xx, 5xx) — those arrive as ordinary `response`
 * events with a non-2xx status. We therefore listen to both:
 *   - requestfailed  → network errors (kept in failedUrls to avoid double-
 *                       counting if the same URL somehow also fires a response)
 *   - response       → HTTP >= 400, excluding any URL already in failedUrls
 */
export async function haunt(
  id: string,
  target: string,
  opts: HauntOptions,
): Promise<HauntReport> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch();
  const pages: PageResult[] = [];
  const seen = new Set<string>([target]);
  const queue: Array<{ url: string; depth: number }> = [
    { url: target, depth: 0 },
  ];

  // Prepare per-report screenshots directory (created lazily on first need).
  const reportDir = join(REPORTS_ROOT, id);
  let reportDirCreated = false;

  async function ensureReportDir(): Promise<void> {
    if (!reportDirCreated) {
      await mkdir(reportDir, { recursive: true });
      reportDirCreated = true;
    }
  }

  try {
    while (queue.length > 0 && pages.length < opts.maxPages) {
      const { url, depth } = queue.shift()!;
      const page = await browser.newPage();
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      // Track URLs that fired requestfailed to avoid double-counting them
      // when a response event also fires (e.g. some proxy scenarios).
      const networkFailedUrls = new Set<string>();

      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      // Network-level failures (DNS, timeout, connection refused, etc.)
      page.on("requestfailed", (req) => {
        networkFailedUrls.add(req.url());
        failedRequests.push(`${req.url()} (${req.failure()?.errorText ?? "unknown"})`);
      });

      // HTTP-level failures (4xx, 5xx). Playwright does NOT fire requestfailed
      // for these; they come through as normal responses with a bad status.
      page.on("response", (resp) => {
        if (resp.status() >= 400 && !networkFailedUrls.has(resp.url())) {
          failedRequests.push(`${resp.url()} (HTTP ${resp.status()})`);
        }
      });

      const t0 = Date.now();
      let status = 0;
      try {
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        status = resp?.status() ?? 0;
      } catch (err) {
        consoleErrors.push(`navigation failed: ${(err as Error).message}`);
      }
      const loadMs = Date.now() - t0;

      const findings = await runChecks(page, url, { consoleErrors, failedRequests });

      // Capture a screenshot if this page has any findings — one screenshot
      // serves as evidence for all findings on the page.
      let screenshotUrl: string | undefined;
      if (findings.length > 0) {
        try {
          await ensureReportDir();
          const filename = `page-${pages.length}.png`;
          const filePath = join(reportDir, filename);
          await writeFile(filePath, await page.screenshot({ fullPage: true }));
          screenshotUrl = `/reports/${id}/${filename}`;
        } catch {
          // Screenshot capture is best-effort; a failure must never abort the haunt.
        }
      }

      // Attach the screenshot URL to every finding on this page.
      if (screenshotUrl) {
        for (const f of findings) {
          f.screenshot = screenshotUrl;
        }
      }

      pages.push({ url, status, loadMs, consoleErrors, failedRequests, findings });

      if (depth < opts.maxDepth) {
        const links = await page.$$eval("a[href]", (els) =>
          els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean),
        );
        for (const link of links) {
          const clean = link.split("#")[0];
          if (sameOrigin(clean, target) && !seen.has(clean)) {
            seen.add(clean);
            queue.push({ url: clean, depth: depth + 1 });
          }
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  return buildReport(id, target, startedAt, pages);
}
