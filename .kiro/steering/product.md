# Product — GhostQA

## What it is
GhostQA is an autonomous QA agent that haunts a web app and finds the ghosts:
console errors, broken links, failed requests, accessibility poltergeists,
mixed content, and slow loads. It files a Haunt Report with severity-ranked
findings, evidence, screenshots, and a "hauntedness" score.

## Who it is for
- Solo developers and small teams shipping web apps without a QA team.
- Manual QA engineers who want a first-pass sweep before hands-on testing.
- Anyone who has ever shipped a 404 and found out from a user.

## Why it matters
Most small sites ship with silent breakage: a dead asset, a console error on
one browser, an image a screen reader cannot see. A human tester finds these
one page at a time; GhostQA finds them across the whole site in minutes, with
proof attached.

## Non-goals
- Not a load tester, not a security scanner, not a replacement for a human QA.
- No login flows in v1 (public pages only); authenticated haunts are a later
  milestone, never a launch blocker.

## Tone
Spooky but useful. Halloween dressing, professional substance. Every joke in
the UI must sit next to a real, actionable finding.
