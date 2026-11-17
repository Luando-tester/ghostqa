export type Severity = "critical" | "major" | "minor" | "poltergeist";

export interface Finding {
  id: string;
  page: string;
  check: string;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  screenshot?: string;
  /** Concrete, actionable suggestion for fixing this finding. */
  fix?: string;
}

export interface PageResult {
  url: string;
  status: number;
  loadMs: number;
  consoleErrors: string[];
  failedRequests: string[];
  findings: Finding[];
}

export interface HauntReport {
  id: string;
  target: string;
  startedAt: string;
  finishedAt: string;
  pagesVisited: number;
  hauntedness: number; // 0-100, higher = more haunted
  findings: Finding[];
  pages: PageResult[];
  /** One-paragraph AI summary, present only when GEMINI_API_KEY is set and the call succeeds. */
  aiSummary?: string;
}

export interface HauntRequest {
  url: string;
  maxPages?: number;
  maxDepth?: number;
}
