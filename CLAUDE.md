# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository currently contains only a spec document — `milestones-scoring-pwa-plan.md` (written in Thai) — and no code yet. It is not a git repository. Before writing any code, **read `milestones-scoring-pwa-plan.md` in full**; it is the source of truth for scope, data model, screens, and acceptance criteria. This CLAUDE.md summarizes it in English but the spec file takes precedence on any detail not covered here.

## What this project is

A PWA that lets a single volunteer staff member, using one phone, transcribe lap/pace data read off runners' Amazfit watches into a scoring/leaderboard app for a ~25-team trail run. The one job the app must do: **turn what's on the watch screen into a ranked leaderboard, without typos and without losing data.** Any feature that doesn't serve that gets cut.

## Hard scope constraints (already decided — do not re-litigate)

- **No backend, no DB, no API, no sync, no PIN/auth.** Single device, single staff member. Everything lives in IndexedDB in the browser.
- **No `/display` route** — there is no projector/screen for spectators.
- **No dark mode, no OCR, no photo attachments.** These were explicitly considered and rejected (see spec §13).
- Deploy target is **Vercel as a static site** — no serverless functions, no Cloudflare D1/Pages/R2.
- The app must work **fully offline after first load** — it never talks to a server. This is the central design constraint, not an afterthought.

## Planned stack

- Vite + React + TypeScript, Tailwind
- `vite-plugin-pwa` (service worker + manifest, `registerType: 'autoUpdate'`)
- `idb-keyval` as the sole persistence layer (IndexedDB wrapper)
- Fonts self-hosted and precached — no Google Fonts CDN (must survive offline)

Bootstrap commands (from spec §3, use these to scaffold when starting implementation):
```
npm create vite@latest -- --template react-ts
npm i idb-keyval
npm i -D vite-plugin-pwa tailwindcss @tailwindcss/vite
```

## Data model

Everything lives in three IndexedDB keys via `idb-keyval`:
- `teams` → `Team[]`, seeded from a CSV at setup
- `results` → `Record<bib, Result>`
- `config` → scoring targets/weights, editable from `/settings`

`Result` holds three pace segments (`p1_sec`/`p2_sec`/`p3_sec` — Road/Trail/Hilly), `act_sec` (total activity time), optional GPS distances (`d1_km..d3_km`, used only for flagging, not scoring), and `recorded_at` (final tiebreaker).

## Scoring logic — `src/lib/scoring.ts`

This is the one module that must be correct before any UI work happens (build order item #1 in the spec). It is pure and must have unit tests. Design:
- `scoreOf(result, config)` computes absolute deviation from target for each of the 4 segments, then `total = (d1+d2+d3) * weight_pace + d_activity * weight_act`. **Lower score wins.**
- `rank()` sorts ascending by `total`, then breaks ties in this exact order: (1) smaller `maxDev` (least-blown segment), (2) smaller `d2` (closest to Trail target), (3) earlier `recorded_at`.
- This tiebreak chain exists because pace-only scoring produces exact ties at this team count (verified against simulated data) — don't simplify it away.

## Screens (4 routes only)

| Route | Purpose |
|---|---|
| `/` | Team list, status chips (waiting/recorded/⚠️), bib search (typing `1` must match `001`), persistent Export button in header |
| `/bib/:bib` | Entry screen — the most important screen in the app |
| `/leaderboard` | Rankings |
| `/settings` | Edit targets/weights, import teams from CSV, export, wipe-data (must require typed confirmation) |

## Entry screen (`/bib/:bib`) design intent

The layout must visually mirror the Amazfit watch's own Lap Details screen (same row order, same columns: distance · pace) so staff don't have to mentally remap watch → app. Key rules from spec §7:
- Custom on-screen numpad only — **never the native keyboard** (too slow, triggers viewport jank, has irrelevant keys).
- Digits fill right-to-left like a stopwatch: pressing `8`,`2`,`3` shows `8:23` with no colon keypress.
- Tap targets ≥ 64×64px, ≥ 8px gutter.
- A mandatory confirm screen before saving (numbers ≥ 32px, colored deltas, computed score) — this screen cannot be skipped.
- Full flow for one team must complete in under 20 seconds — this is a tested acceptance criterion, not a suggestion.

## Validation tiers (spec §8)

- **Hard block:** pace outside 4:00–25:00/km, activity time outside 25:00–90:00.
- **Warn + re-confirm modal:** deviation from target > 90s/km, or activity time inconsistent with the sum of the three paces (usually indicates a misread digit).
- **Non-blocking GPS flag:** compare each team's `d1/d2/d3` against the running median of already-entered teams; >10% off flags `⚠️` on `/`. Since every team wears the same watch model, this should almost never fire — if it does, that device has a real problem.

## The #1 risk: single point of failure

There is no server safety net. If the phone is lost, dies, or someone clears site data, results are gone unrecoverable. Mitigations that must ship, not be treated as optional polish:
1. Call `navigator.storage.persist()` on first launch (iOS Safari will otherwise evict the data).
2. Auto-backup to a downloaded `.json` file every 5 entries, silently.
3. An `Export CSV` button permanently visible in the header on every screen (never buried in a menu).
4. An orange warning banner if more than 10 entries exist since the last export.

The spec notes that if this risk is unacceptable, the fallback is one small Vercel serverless function + Vercel Blob to fire-and-forget a full JSON snapshot after every save (~20 lines, no schema/migration/sync — IndexedDB stays the source of truth). Don't build this preemptively; it's an explicitly optional escalation, not the default plan.

## Design tokens (spec §10)

Built for outdoor readability in direct sunlight, not aesthetics: white background / near-black text for max contrast, a single accent color (`#FF4D00`) for the one primary action per screen, `#0B7A3B`/`#C2410C` for on-target/off-target deltas. All numerals use IBM Plex Mono (tabular figures, disambiguated 0/1/7) specifically because sunlight-squinted misreads are the failure mode being designed against — this is a legibility decision, not a style choice.

## Acceptance criteria highlights (spec §12)

The two criteria most likely to reveal real problems if skipped:
- Airplane mode from app launch through 25 team entries and an app restart — data must be fully intact.
- A rehearsal with 5 real (non-technical) staff volunteers before event day — the spec calls this more important than every other criterion combined.
