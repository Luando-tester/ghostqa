/**
 * Fixture haunt test.
 *
 * Serves test/fixture/ on a random port, haunts it, and asserts that the
 * haunt finds EXACTLY the four planted ghosts — no more, no fewer:
 *
 *   1. console-errors  — the inline console.error() call
 *   2. failed-requests — fetch("/ghost-404-asset") returns 404
 *   3. a11y-alt        — <img> with no alt attribute
 *   4. dead-links      — <a href="#">
 *
 * Exits with code 1 on any mismatch.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { haunt } from "../src/agent/crawler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixture");

// ── minimal static file server ────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".png":  "image/png",
};

function serveFixture(port: number): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const urlPath = (req.url ?? "/").split("?")[0];
      const filePath = join(FIXTURE_DIR, urlPath === "/" ? "index.html" : urlPath);

      try {
        const body = await readFile(filePath);
        const mime = MIME[extname(filePath)] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(body);
      } catch {
        // Any missing file → 404 (this is the planted ghost for the failed-request check)
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });

    server.listen(port, "127.0.0.1", () => {
      resolve(() => server.close());
    });
    server.on("error", reject);
  });
}

// ── expected finding checks ───────────────────────────────────────────────────

const EXPECTED_CHECKS = ["console-errors", "failed-requests", "a11y-alt", "dead-links"];

// ── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Pick a random high port to avoid conflicts
  const port = 54320 + Math.floor(Math.random() * 100);
  const stop = await serveFixture(port);
  const target = `http://127.0.0.1:${port}/`;

  let failed = false;
  try {
    console.log(`\n🔍  Haunting fixture at ${target} …\n`);
    const report = await haunt("fixture-test", target, { maxPages: 5, maxDepth: 1 });

    // Collect the check ids found
    const foundChecks = report.findings.map((f) => f.check);
    const foundSet = new Set(foundChecks);

    console.log("Findings:");
    for (const f of report.findings) {
      console.log(`  [${f.severity}] ${f.check}: ${f.title}`);
    }
    console.log(`\nHauntedness: ${report.hauntedness}`);

    // Assert every expected check is present
    for (const expected of EXPECTED_CHECKS) {
      if (!foundSet.has(expected)) {
        console.error(`\n❌  MISSING expected check: ${expected}`);
        failed = true;
      }
    }

    // Assert no unexpected checks are present
    for (const found of foundSet) {
      if (!EXPECTED_CHECKS.includes(found)) {
        console.error(`\n❌  UNEXPECTED check: ${found}`);
        failed = true;
      }
    }

    if (!failed) {
      console.log("\n✅  All four planted ghosts found — no extras.");
    }
  } finally {
    stop();
  }

  if (failed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
