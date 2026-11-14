import type { Page } from "playwright";
import type { Finding, Severity } from "../types.js";

export interface PageSignals {
  consoleErrors: string[];
  failedRequests: string[];
}

let counter = 0;
function finding(
  page: string,
  check: string,
  severity: Severity,
  title: string,
  detail: string,
  evidence?: string,
): Finding {
  return { id: `f-${++counter}`, page, check, severity, title, detail, evidence };
}

/**
 * Run every check on one crawled page. Each check returns Findings;
 * the crawler attaches them to the page result.
 */
export async function runChecks(
  page: Page,
  url: string,
  signals: PageSignals,
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Console errors — the most obvious ghosts.
  for (const err of signals.consoleErrors) {
    findings.push(
      finding(url, "console-errors", "major", "Console error", err.slice(0, 300), err),
    );
  }

  // 2. Failed requests (404s, 500s, dead assets).
  for (const req of signals.failedRequests) {
    findings.push(
      finding(url, "failed-requests", "major", "Request failed", req.slice(0, 300), req),
    );
  }

  // 3. Images without alt text.
  const noAlt = await page.$$eval("img:not([alt])", (els) => els.length);
  if (noAlt > 0) {
    findings.push(
      finding(url, "a11y-alt", "minor", `${noAlt} image(s) without alt text`,
        "Screen readers cannot describe these images."),
    );
  }

  // 4. Form inputs without labels.
  const noLabel = await page.$$eval(
    "input:not([type=hidden]):not([aria-label]):not([aria-labelledby])",
    (els) =>
      els.filter((el) => !(el as HTMLInputElement).id ||
        !document.querySelector(`label[for="${(el as HTMLInputElement).id}"]`)).length,
  );
  if (noLabel > 0) {
    findings.push(
      finding(url, "a11y-labels", "minor", `${noLabel} input(s) without a label`,
        "Unlabelled inputs are unusable with assistive tech."),
    );
  }

  // 5. Links pointing nowhere useful (href="#" or javascript:).
  const deadLinks = await page.$$eval(
    "a[href='#'], a[href^='javascript:']",
    (els) => els.length,
  );
  if (deadLinks > 0) {
    findings.push(
      finding(url, "dead-links", "minor", `${deadLinks} placeholder link(s)`,
        "Links that go nowhere confuse users and crawlers."),
    );
  }

  // 6. Mixed content: page is https but loads http resources.
  if (url.startsWith("https://")) {
    const insecure = await page.$$eval(
      "img[src^='http://'], script[src^='http://'], link[href^='http://']",
      (els) => els.length,
    );
    if (insecure > 0) {
      findings.push(
        finding(url, "mixed-content", "critical", `${insecure} insecure resource(s) on an https page`,
          "Mixed content is blocked by browsers and leaks data."),
      );
    }
  }

  return findings;
}
