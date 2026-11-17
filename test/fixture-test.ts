/**
 * Integration test for GhostQA crawler + checks against a local haunted fixture site.
 * Verifies that all eight planted ghosts are detected:
 * 1. console-errors
 * 2. failed-requests
 * 3. a11y-alt
 * 4. dead-links
 * 5. title-missing
 * 6. heading-order
 * 7. button-no-name
 * 8. a11y-labels
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { haunt } from "../src/agent/crawler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "fixture");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".png":  "image/png",
};

function serveFixture(port: number): Promise<() => void> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const relPath = !req.url || req.url === "/" ? "index.html" : req.url.split("?")[0].replace(/^\/+/, "");
      const filePath = join(FIXTURE_DIR, relPath);
      try {
        const data = await readFile(filePath);
        const contentType = MIME[extname(filePath)] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });
    server.listen(port, "127.0.0.1", () => {
      resolve(() => server.close());
    });
  });
}

const EXPECTED_CHECKS = [
  "console-errors",
  "failed-requests",
  "a11y-alt",
  "dead-links",
  "title-missing",
  "heading-order",
  "button-no-name",
  "a11y-labels",
];

async function main(): Promise<void> {
  const port = 54320 + Math.floor(Math.random() * 100);
  const stop = await serveFixture(port);
  const target = `http://127.0.0.1:${port}/`;
  let failed = false;
  try {
    const report = await haunt("fixture-test", target, { maxPages: 5, maxDepth: 1 });
    const foundChecks = report.findings.map((f) => f.check);
    const foundSet = new Set(foundChecks);
    for (const expected of EXPECTED_CHECKS) {
      if (!foundSet.has(expected)) { console.error(`MISSING expected check: ${expected}`); failed = true; }
    }
    for (const found of foundSet) {
      if (!EXPECTED_CHECKS.includes(found)) { console.error(`UNEXPECTED check: ${found}`); failed = true; }
    }
    if (!failed) { console.log("All eight planted ghosts found — no extras."); }
  } finally {
    stop();
  }
  if (failed) { process.exit(1); }
}
main().catch((err) => { console.error("Fatal:", err); process.exit(1); });