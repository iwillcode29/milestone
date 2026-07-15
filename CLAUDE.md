# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

Implemented and deployed. The original spec is `milestones-scoring-pwa-plan.md` (Thai) — still useful for the scoring model and the reasoning behind design choices, but several of its decisions have since been overridden by the user in actual use (see "Deviations from the original spec" below). Where this file and the spec disagree, this file reflects what's actually built.

## Commands

- `npm run dev` — Vite dev server. Does **not** serve `/api/*` (see AI photo assist below) — those need `vercel dev` or a real deploy to test.
- `npm run build` — `tsc -b && vite build`; typechecks `src/` and `api/` as separate project references, then builds the static client into `dist/`.
- `npx vitest run` — run the test suite (unit + component tests, jsdom + fake-indexeddb).
- `npm run lint` — oxlint.
- No test command is required before every change — see "Testing policy" below.

## Testing policy

**Do not write new automated tests.** This is a single-user tool; the user has explicitly opted out of TDD for this project. Implement features directly and let the user verify manually in the browser. The existing test suite (from an earlier phase of this project) can still be run as a cheap regression smoke-check (`npx vitest run`), but don't expand it, and don't block work on writing coverage for new code.

## What this project is

A PWA that lets volunteer staff transcribe lap/pace data read off runners' Amazfit watches into a scoring/leaderboard app for a trail run, used from both phones (in the field) and a computer (by the organizer). The one job the app must do: **turn what's on the watch screen into a ranked leaderboard, without typos and without losing data.**

## Deviations from the original spec

The spec document is the historical record of the *initial* design; the following decisions were made later, directly by the user, and supersede it:

- **No custom on-screen numpad.** The spec insisted on a custom digit-fill numpad and banned the native keyboard. That numpad was built, then **removed** — entry fields are now plain native inputs (`<input type="number">` for distance, `<input type="text">` for pace/activity), so both physical keyboards (desktop) and native mobile keyboards work directly. The pace/activity inputs still auto-mask digits into `mm:ss` as you type (`maskMmSs` in `src/lib/time.ts`) so staff don't have to type the colon — that part of the spec's intent survived, just not the bespoke button grid.
- **Team count is dynamic, not hardcoded to ~25.** On first launch (empty team list), `TeamCountSetup` prompts for a team count and seeds zero-padded bibs `001..N` from it.
- **Teams can be deleted individually** from `/` (tap "ลบ" then "ยืนยันลบ" to confirm) — `deleteTeam(bib)` in `src/lib/store.ts` also removes any recorded result for that bib.
- **OCR/photo assist is back, deliberately, as an opt-in assist — not the rejected "read the whole screen automatically and trust it" idea.** See below.
- The static-only, zero-server-calls constraint is now "zero server calls **except** the one optional photo-assist endpoint" — see next section. Everything else (scoring, storage, leaderboard, CSV export, backup) still works fully offline exactly as originally specified.

## AI photo assist (`api/extract.ts`)

One Vercel serverless function, added on top of the otherwise-static app:

- `POST /api/extract` takes `{ imageDataUrl }` (a client-compressed JPEG data URL, see `src/lib/imageCompress.ts`), calls OpenAI's vision-capable chat completions API (`gpt-4o-mini` by default, override via `OPENAI_MODEL` env var) with a prompt asking it to read distinct time and distance values off a watch-screen photo, and returns `{ readings: [{type:'time', seconds} | {type:'distance', km}] }`.
- **Never auto-fills.** By explicit user decision, extracted readings are shown as tappable chips on the entry screen (`src/pages/BibEntry.tsx`); staff must tap into the field they want to fill *first* (tracked via `focusedField`), then tap a chip to apply it there. This was a deliberate choice over auto-fill-then-review, because the watch's Lap Details screen has no reliable per-row labels the model can map to segments — letting staff assign values themselves avoids silent mis-mapping.
- Requires `OPENAI_API_KEY` set as a Vercel environment variable (Production + Preview) — **never** hardcode it, put it in a committed file, or pass it through client code. `.env`, `.env.*`, and `.vercel` are gitignored.
- This endpoint needs network connectivity to work. It's explicitly an optional assist: if there's no signal, staff types the mm:ss/km values manually exactly as before — the core entry → confirm → save flow has no dependency on this endpoint and still works fully offline.

## Data model

Everything else lives in three IndexedDB keys via `idb-keyval` (`src/lib/store.ts`):
- `teams` → `Team[]` — starts empty, seeded via `TeamCountSetup` on first launch, editable via CSV import in `/settings`, or deleted individually from `/`.
- `results` → `Record<bib, Result>`
- `config` → scoring targets/weights, editable from `/settings`

`Result` holds three pace segments (`p1_sec`/`p2_sec`/`p3_sec` — Road/Trail/Hilly), `act_sec` (total activity time), optional GPS distances (`d1_km..d3_km`, used only for flagging, not scoring), and `recorded_at` (final tiebreaker).

## Scoring logic — `src/lib/scoring.ts`

Pure module, still exactly as originally spec'd:
- `scoreOf(result, config)` computes absolute deviation from target for each of the 4 segments, then `total = (d1+d2+d3) * weight_pace + d_activity * weight_act`. **Lower score wins.**
- `rank()` sorts ascending by `total`, then breaks ties in this exact order: (1) smaller `maxDev` (least-blown segment), (2) smaller `d2` (closest to Trail target), (3) earlier `recorded_at`.
- This tiebreak chain exists because pace-only scoring produces exact ties at this team count — don't simplify it away.

## Screens (4 routes, shared `Header` with nav + persistent Export CSV button)

| Route | Purpose |
|---|---|
| `/` | Team list — status chips (รอ/บันทึกแล้ว/⚠️), bib search (typing `1` matches `001`), per-team delete, first-launch team-count setup popup |
| `/bib/:bib` | Entry screen → confirm screen (`ConfirmScreen`) before save |
| `/leaderboard` | Rankings, empty state when nothing recorded yet |
| `/settings` | Edit targets/weights, import teams from CSV, wipe-data (requires typing a confirm phrase) |

## Entry screen (`/bib/:bib`)

Layout mirrors the Amazfit watch's Lap Details screen (distance · pace columns, one row per segment, target shown inline under each pace field). Native inputs throughout (see "Deviations" above); pace/activity fields mask digits into `mm:ss`. Validation on "ตรวจทาน": hard-block errors (pace outside 4:00–25:00/km, activity outside 25:00–90:00, or unparseable mm:ss) block inline; >90s-off-target or activity/pace inconsistency show a confirm-again modal. Only then does the `ConfirmScreen` render (colored deltas, computed score) before `บันทึก` persists via `saveResult` + triggers `maybeAutoBackup`.

## The #1 risk: single point of failure

No server-backed safety net for the core data (the AI photo-assist endpoint is unrelated to this). Mitigations that ship:
1. `navigator.storage.persist()` on first launch.
2. Auto-backup to a downloaded `.json` file every 5 entries (`src/lib/backup.ts`).
3. `Export CSV` permanently visible in the header on every screen.
4. An orange warning banner once results outpace the last export by more than 10.

## Design tokens

White background / near-black text for max sunlight contrast, one accent color (`#FF4D00`, "signal"), `#0B7A3B`/`#C2410C` for on-target/off-target deltas. All numerals in **IBM Plex Mono**, Thai text in **IBM Plex Sans Thai** — both self-hosted via `@fontsource` (latin+thai subsets only, imported in `main.tsx`) and precached by the service worker, not loaded from a CDN. Content is capped at `max-w-2xl` and centered, since this app is used from both phones and a computer.

## Deploying

Static Vite app + one serverless function, deployed to Vercel (see `vercel.json` — sets `no-cache` headers on `sw.js`/`registerSW.js`/`manifest.webmanifest` so the CDN never serves a stale service worker). Needs `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) set in the Vercel project's environment variables for the photo-assist endpoint to work; everything else deploys with zero configuration.
