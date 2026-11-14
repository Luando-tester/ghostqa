# Kiroween 2026 — submission checklist (GhostQA, Costume Contest)

## Dates
- Submission period: 30 Oct 2026 09:00 PT – **4 Dec 2026 14:00 PT (5 Dec 05:00 VN)**
- Judging: 16 Dec 2026 – 29 Jan 2027. Winners announced ~3 Feb 2027.
- Kiro credits request form: **by 1 Dec 2026 12:00 PT** (needs Kiro user ID).

## Prizes in reach
- Overall: 1st $30,000 / 2nd $20,000 / 3rd $10,000 (all submissions).
- Best Costume Contest: $5,000.
- Best Demo: $1,000 (top Presentation score + top 10% overall).
- Bonus Blog Prize: top 100 with a public blog post → 2,000 Kiro credits.
- Social Blitz: 5 winners → 3-month Kiro Pro+ (post starting with #KiroweenHackathon26).
- Best Startup $10,000 — NOT pursued (needs founder + LinkedIn + startup website).

## Judging (Stage 2, equally weighted, 10 pts each)
Potential Impact / Technological Implementation (Kiro usage depth!) / Design /
Innovation / Presentation. Stage 1 is pass/fail: fits theme + uses Kiro.

## Submission requirements
- [ ] Public GitHub repo (NOT GitLab/Bitbucket) with MIT licence, detectable
- [ ] `/.kiro` directory at repo root — specs, hooks, steering; NEVER git-ignored
- [ ] URL to working app + text description + demo video < 3 min (public YouTube)
- [ ] Category: Costume Contest
- [ ] Write-up on how Kiro was used (IDE/CLI, specs, hooks, steering, MCP, powers)
- [ ] Project newly created in the submission period (skeleton created 14 Nov 2026 — inside the window)

## Timeline (14 Nov → 4 Dec, ~20 days)
- Days 1–6: core haunt (crawler + 6 checks + reporter + fixture test)
- Days 7–13: screenshots, optional Gemini summary, report page, hooks, UI polish
- Days 14–20: fresh-clone test, GitHub push, deploy/demo, video, Devpost submit

## Blockers — need Luân
1. **Devpost account** — Luân creating it himself (in progress 14/11 ~09:17).
2. **Kiro sign-in** — GitHub / Google / AWS Builder ID, in `kiro-cli login` on this VM.
   Without it the CLI agent cannot call models; the skeleton was written by hand.
3. **Kiro credits form** (4,000 credits) — after sign-in, before 1 Dec 12:00 PT.
4. **Demo video** — record + upload to YouTube (Luân's account), < 3 min.
5. **Blog + social posts** — optional bonus prizes, Luân posts from his accounts.

## Kiro status on this VM (verified 14/11)
- Kiro CLI 3.3.0 installed at `~/.local/bin/kiro-cli` (SHA-256 verified).
- `kiro-cli --version` → 3.3.0; `kiro-cli diagnostic` OK (Ubuntu 24.04, glibc 2.39).
- kiro.dev, cli.kiro.dev, app.kiro.dev all reachable from VN (200, ~1.3–1.9s).
- `kiro-cli whoami` → "Not logged in". Model call NOT yet verified — needs sign-in.
