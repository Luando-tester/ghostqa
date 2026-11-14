import type { Finding, HauntReport, PageResult, Severity } from "../types.js";

const WEIGHT: Record<Severity, number> = {
  critical: 40,
  major: 15,
  minor: 5,
  poltergeist: 25,
};

/** Score 0-100: higher means more haunted. */
export function hauntedness(findings: Finding[], pages: number): number {
  const raw = findings.reduce((sum, f) => sum + WEIGHT[f.severity], 0);
  const perPage = pages > 0 ? raw / pages : raw;
  return Math.min(100, Math.round(perPage));
}

export function buildReport(
  id: string,
  target: string,
  startedAt: string,
  pages: PageResult[],
): HauntReport {
  const findings = pages.flatMap((p) => p.findings);
  const order: Record<Severity, number> = {
    critical: 0,
    poltergeist: 1,
    major: 2,
    minor: 3,
  };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    id,
    target,
    startedAt,
    finishedAt: new Date().toISOString(),
    pagesVisited: pages.length,
    hauntedness: hauntedness(findings, pages.length),
    findings,
    pages,
  };
}
