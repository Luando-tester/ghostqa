# Tech

## Stack
- Runtime: Node.js 22+ (dev machine: Node 24), TypeScript strict mode.
- Server: Express 5, ES modules (`"type": "module"`).
- Browser automation: Playwright, headless Chromium only.
- Front-end: vanilla HTML/CSS, no framework, no build step for the UI.
- Tests: `node --test` against compiled output.

## Conventions
- TypeScript `strict: true`, `moduleResolution: NodeNext`, imports use `.js`
  extensions (NodeNext requirement).
- One browser per haunt, pages visited sequentially (no concurrent page
  calls — keeps behaviour deterministic and polite to the target).
- Every check is a pure-ish function in `src/agent/checks.ts` returning
  `Finding[]`; the crawler only orchestrates.
- No wall-clock dependence in scoring: `hauntedness` is a function of
  findings and pages visited only.
- Secrets (optional Gemini key for AI summaries) come from the environment,
  never from the repo. `.env` is git-ignored.

## Dependencies to avoid
- No heavy front-end framework, no database in v1 (in-memory reports).
- No paid APIs in the core path: every built-in check works offline of any
  vendor key.
