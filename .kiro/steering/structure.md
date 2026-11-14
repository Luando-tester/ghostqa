# Structure

```
ghostqa/
  README.md            — what it is, how to run it
  LICENSE              — MIT
  package.json         — scripts: dev / build / start / test
  tsconfig.json        — strict TS, NodeNext
  public/              — the UI (index.html, styles.css), served statically
  src/
    server.ts          — Express app: /api/haunt, /api/report/:id
    types.ts           — Finding, PageResult, HauntReport, HauntRequest
    agent/
      crawler.ts       — BFS crawl, one browser, one page at a time
      checks.ts        — every check, each returning Finding[]
      reporter.ts      — hauntedness score + report assembly
  .kiro/
    steering/          — product, tech, structure guidance (this folder)
    specs/ghostqa/     — requirements, design, tasks
    hooks/             — agent hooks (templates — verify schema in Kiro docs)
```

## Rules for the agent
- Follow the spec in `.kiro/specs/ghostqa/`; update the spec first when a
  requirement changes, then implement.
- Keep `src/agent/checks.ts` the single home of checks; never scatter check
  logic into the crawler or the server.
- Never add `.kiro/` to `.gitignore` — Kiroween rules require it in the repo.
- Small, verifiable steps: after each task in tasks.md, run `npm run build`
  and, for behaviour changes, a real haunt against a local fixture page.
