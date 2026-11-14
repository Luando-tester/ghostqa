# GhostQA — the ghost-hunter QA agent

> Your web app is haunted. GhostQA finds the ghosts.

GhostQA is an autonomous QA agent: give it a URL and it haunts your web app —
crawling every page, listening for console errors, catching broken links and
failed requests, sniffing out accessibility poltergeists, and filing a
beautifully spooky report with screenshots as evidence.

Built for **Kiroween 2026** (Costume Contest category) using Kiro — spec-driven
development, steering docs, agent hooks, and the Kiro CLI.

## How it works

1. Paste a URL, hit **Start the haunt**.
2. The agent crawls your site (same-origin, configurable depth) in headless
   Chromium via Playwright.
3. On every page it runs the checks: broken links, failed requests, console
   errors, missing alt text / labels, slow loads, mixed content.
4. You get a **Haunt Report**: every finding ranked by severity, with the
   page, the evidence, and a screenshot — plus a "hauntedness" score.

## Run it

```bash
npm install
npx playwright install chromium
npm run dev        # http://localhost:3000
```

## Stack

- Node.js 24 + TypeScript, Express
- Playwright (headless Chromium)
- Vanilla HTML/CSS front-end — no build step, no framework
- Optional: bring your own Gemini API key (free tier) for AI-written
  bug summaries in the report

## AI summary (optional)

Set `GEMINI_API_KEY` in the environment before starting the server and each
Haunt Report will include a one-paragraph AI-written summary of its findings:

```bash
GEMINI_API_KEY=your_key_here npm run dev
```

Without the key the server works exactly as before — no summary field, no
error, no delay. The key is never committed to the repo (`.env` is git-ignored)
and never logged or exposed in any HTTP response.

## Kiro usage

This repo was built spec-first with Kiro. See `.kiro/`:

- `.kiro/specs/ghostqa/` — requirements, design, tasks
- `.kiro/steering/` — product, tech, and structure guidance
- `.kiro/hooks/` — agent hooks (auto-checks on save)

## Licence

MIT — see `LICENSE`.
