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
  fix?: string,
): Finding {
  return { id: `f-${++counter}`, page, check, severity, title, detail, evidence, fix };
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
      finding(url, "console-errors", "major", "Console error", err.slice(0, 300), err,
        "Open the browser console, reproduce the error, and fix the failing script — a missing variable, a failed import, or an unhandled exception at the reported line."),
    );
  }

  // 2. Failed requests (404s, 500s, dead assets).
  for (const req of signals.failedRequests) {
    findings.push(
      finding(url, "failed-requests", "major", "Request failed", req.slice(0, 300), req,
        "Restore the missing file or update the reference: point the URL at an asset that exists and returns 200, or remove the dead reference."),
    );
  }

  // 3. Images without alt text.
  const noAlt = await page.$$eval("img:not([alt])", (els) => els.length);
  if (noAlt > 0) {
    findings.push(
      finding(url, "a11y-alt", "minor", `${noAlt} image(s) without alt text`,
        "Screen readers cannot describe these images.", undefined,
        "Add a descriptive alt attribute to each image, e.g. alt=\"Team photo\"; use alt=\"\" only for purely decorative images."),
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
        "Unlabelled inputs are unusable with assistive tech.", undefined,
        "Add a <label for=\"...\"> for each input, or give the input an aria-label or aria-labelledby attribute."),
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
        "Links that go nowhere confuse users and crawlers.", undefined,
        "Replace the placeholder href=\"#\" or javascript: link with the real destination URL — or use a <button> if it triggers an action instead of navigating."),
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
          "Mixed content is blocked by browsers and leaks data.", undefined,
          "Load the insecure resource over https (change the http:// URL to https://) or remove it — browsers block http subresources on https pages."),
      );
    }
  }

  // 7. Missing or empty page <title>.
  const pageTitle = await page.title();
  if (!pageTitle || pageTitle.trim().length === 0) {
    findings.push(
      finding(
        url,
        "title-missing",
        "major",
        "Page has no title",
        "The page has no <title> or the title is empty.",
        undefined,
        "Add a unique, descriptive <title> inside <head>, e.g. <title>Checkout — Acme Store</title>.",
      ),
    );
  }

  // 8. Skipped heading levels (e.g. h1 followed directly by h3).
  const headingLevels = await page.$$eval("h1, h2, h3, h4, h5, h6", (els) =>
    els.map((el) => Number(el.tagName.slice(1))),
  );
  let skippedHeadings = 0;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      skippedHeadings++;
    }
  }
  if (skippedHeadings > 0) {
    findings.push(
      finding(
        url,
        "heading-order",
        "minor",
        `${skippedHeadings} skipped heading level(s)`,
        "Heading levels should increment by one without skipping.",
        undefined,
        "Restructure the headings so levels increase by one at a time (h1 → h2 → h3); do not skip from h1 straight to h3.",
      ),
    );
  }

  // 9. Buttons without an accessible name.
  const unnamedButtons = await page.$$eval("button", (els) =>
    els.filter((el) => {
      const text = (el.textContent || "").trim();
      const ariaLabel = (el.getAttribute("aria-label") || "").trim();
      const ariaLabelledBy = (el.getAttribute("aria-labelledby") || "").trim();
      return text.length === 0 && ariaLabel.length === 0 && ariaLabelledBy.length === 0;
    }).length,
  );
  if (unnamedButtons > 0) {
    findings.push(
      finding(
        url,
        "button-no-name",
        "minor",
        `${unnamedButtons} button(s) without an accessible name`,
        "Buttons must have visible text, aria-label, or aria-labelledby.",
        undefined,
        "Give each button visible text or an aria-label, e.g. <button aria-label=\"Close dialog\">×</button>.",
      ),
    );
  }

  return findings;
}