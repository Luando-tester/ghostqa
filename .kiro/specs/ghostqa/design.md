# Design — GhostQA

## Architecture
```
Browser (UI) ──POST /api/haunt──▶ Express server
                                     │
                                     ▼
                              haunt(id, url, opts)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
              Playwright crawler              runChecks(page)
              (BFS, one page at a time)       (6 checks → Finding[])
                    │                                 │
                    └────────────┬────────────────────┘
                                 ▼
                          buildReport()
                          (hauntedness score,
                           severity-ranked findings)
                                 │
                                 ▼
                          HauntReport JSON
```

## Components
- **server.ts** — HTTP only: validates input, stores reports in memory,
  serves `public/`. No business logic.
- **crawler.ts** — owns the browser lifecycle and the BFS queue. Captures
  console errors and failed requests via Playwright listeners; extracts
  same-origin links; enforces maxPages/maxDepth.
- **checks.ts** — pure check functions over one loaded `Page`. Adding a
  check means adding one function here, nothing else.
- **reporter.ts** — sorts findings by severity, computes hauntedness
  (weighted sum per page, capped at 100).

## Hauntedness scoring
Weights: critical 40, poltergeist 25, major 15, minor 5. Score =
`min(100, round(totalWeight / pagesVisited))`. Deterministic: same site,
same findings, same score.

## Error handling
- A page that fails to load still produces a PageResult (status 0, the
  navigation error recorded as a console error) — one bad page never kills
  the haunt.
- The browser is always closed (`finally`), even on mid-crawl errors.
- The API never leaks stack traces; 400 for bad input, 404 for unknown
  report ids.

## Testing strategy
- Fixture site: a tiny local HTML site with planted ghosts (one console
  error, one 404 asset, one image without alt, one `href="#"`).
- `npm run build` must pass after every task; the fixture haunt must find
  exactly the planted ghosts (no more, no fewer).
- Property-style check (manual): hauntedness is monotonic — adding a
  finding never lowers the score.

## Future milestones (only if time remains)
- M1: per-finding screenshots attached to the report.
- M2: optional Gemini free-tier key → one-paragraph AI summary per report.
- M3: authenticated haunts (user-supplied cookies, judges-only field).
