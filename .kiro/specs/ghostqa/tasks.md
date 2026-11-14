# Tasks — GhostQA

## Phase 1 — Core haunt (days 1–6)
- [x] 1. Repo skeleton: package.json, tsconfig, server, types, UI stub, .kiro
- [x] 2. Implement crawler BFS + Playwright listeners (console, failed requests) — verified BFS/same-origin/bounds; added `response` listener to capture HTTP 4xx/5xx (gap confirmed: `requestfailed` does not fire for them); dedupes with network failures via `networkFailedUrls` set.
- [x] 3. Implement the 6 checks in `checks.ts` — verified all 6 checks (R2.1–R2.6) present and correct; all logic confined to checks.ts; no scope added.
- [x] 4. Implement reporter + hauntedness scoring — verified weights critical 40 / poltergeist 25 / major 15 / minor 5; score formula `min(100, round(total / pages))`; deterministic and monotonic.
- [x] 5. Fixture site with planted ghosts; fixture haunt finds exactly them — created `test/fixture/` with one console error, one 404 fetch, one img without alt, one `href="#"`; `npm run test:fixture` asserts exactly the 4 check types, exits non-zero on mismatch.
- [x] 6. `npm run build` green; `npm run dev` serves UI end-to-end — build clean; `GET /` → 200; bad-URL `POST /api/haunt` → 400.
- [x] 6a. Fix crawler dedup bug — added `normalizeUrl` helper in `crawler.ts` (strips trailing slash from path, drops fragment, preserves query, lowercases host via URL parser); applied when seeding `seen`, when queueing discovered links, and when storing the URL in the queue. Prevents `http://localhost:4000` and `http://localhost:4000/` from being treated as distinct pages. `npm run build` ✅  `npm run test:fixture` ✅

## Phase 2 — Agent polish (days 7–13)
- [x] 7. Per-finding screenshots (M1) — one `page-N.png` per page-with-findings saved to `reports/<id>/`, served via `GET /reports/:id/:file`, URL stored in `finding.screenshot`.
- [x] 8. Optional Gemini summary (M2, env key only) — `GEMINI_API_KEY` env var, model `gemini-3.5-flash`, 10 s timeout; on any failure logs server-side and continues with no `aiSummary`; shown in report HTML and copy-as-markdown.
- [x] 9. Report page: shareable view, copy-as-markdown — `GET /report/:id` renders full HTML report with findings, screenshots, score bar; "Copy as Markdown" button generates a table + details block.
- [x] 10. Hook: auto `npm run build` + fixture haunt on save — verified against kiro.dev/docs; fixed schema (`version: "v1"`, `trigger: "PostFileSave"`, `matcher` regex, single `action` object).
- [x] 11. Polish UI: responsive, empty states, loading states, error states — responsive flex form, animated progress bar with rotating status messages, empty-state card, server/network error box, inline screenshot previews, link to report page.

## Phase 3 — Submission (days 14–20)
- [ ] 12. Fresh-clone test: `npm install` → `playwright install chromium` → `npm run dev` works
- [ ] 13. Push to public GitHub repo (Luân's account), MIT licence visible
- [ ] 14. Deploy demo (free host) or record local demo for judges
- [ ] 15. Demo video < 3 min, public on YouTube
- [ ] 16. Devpost submission: category Costume Contest, description, write-up on Kiro usage
- [ ] 17. Blog post (Bonus Blog Prize, top 100 get 2,000 Kiro credits)
- [ ] 18. Social post starting with #KiroweenHackathon26 (Social Blitz Prize)

## Blockers (need Luân)
- Devpost account (Luân creating it himself — in progress 14/11)
- Kiro sign-in (GitHub/Google/AWS Builder ID) on this VM to use the CLI agent
- Kiro credits request form (4,000 credits) — by 1 Dec 12:00 PT, needs Kiro user ID
- Demo video recording + YouTube upload (Luân's account)
