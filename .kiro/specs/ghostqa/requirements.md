# Requirements — GhostQA

## 1. Haunt a URL
- **R1.1** When the user submits an http(s) URL, the system starts a haunt
  and returns a report.
- **R1.2** When the URL is not http(s), the system rejects it with 400 and a
  clear message.
- **R1.3** The haunt crawls same-origin links only (BFS), bounded by
  `maxPages` (default 25) and `maxDepth` (default 2).

## 2. Checks on every page
- **R2.1** Console errors are captured and reported as findings.
- **R2.2** Failed requests (4xx/5xx, DNS, timeouts) are reported as findings.
- **R2.3** Images without alt text are reported (a11y).
- **R2.4** Form inputs without labels are reported (a11y).
- **R2.5** Placeholder links (`href="#"`, `javascript:`) are reported.
- **R2.6** Mixed content on https pages is reported as critical.

## 3. The Haunt Report
- **R3.1** The report lists every finding ranked critical > poltergeist >
  major > minor, with page, check, title, detail, and evidence.
- **R3.2** The report carries a hauntedness score 0–100, a function of
  findings and pages visited only (never of the wall clock).
- **R3.3** The report is fetchable later via `GET /api/report/:id`.

## 4. The UI
- **R4.1** The UI lets the user enter a URL, start a haunt, and see the
  hauntedness score plus the ranked findings.
- **R4.2** The UI is a polished, spooky, dark theme (Costume Contest) and
  works without JavaScript frameworks.

## 5. Kiro usage (judging: Technological Implementation)
- **R5.1** The repo contains `/.kiro` with specs, steering, and hooks; it is
  never git-ignored.
- **R5.2** Development follows the spec in this folder: requirements →
  design → tasks, implemented through Kiro CLI/IDE sessions.
- **R5.3** At least one agent hook automates a dev workflow (e.g. run
  `npm run build` + the fixture haunt on save).

## 6. Submission hygiene
- **R6.1** The repo is public on GitHub with a detectable MIT licence.
- **R6.2** The app runs from a fresh clone with `npm install` +
  `npx playwright install chromium` + `npm run dev`.
- **R6.3** No secrets in the repo; the optional Gemini key is env-only.
