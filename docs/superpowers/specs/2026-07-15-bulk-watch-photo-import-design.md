# Bulk watch-photo import (multi-team, auto-save)

## Context

The existing "✨ นำเข้าจากรูปวอทช์" flow (`WatchPhotoImport.tsx` + `api/extract-batch.ts`) handles one team per submission: staff pick 1-2 photos (bib card + watch screens), the model extracts `{bib, activity_sec, laps}`, and on a bib match the app navigates to `/bib/:bib` with the values pre-filled — staff must still tap ตรวจทาน → review → บันทึก before anything is saved.

In the field, staff want to select photos for **many teams at once** (end-of-leg batch upload) and have each team's data land straight in the results table, no per-team review screen. Staff will cross-check the auto-imported numbers against paper notes afterward and correct via the normal edit screen where needed. Anything the model couldn't read should be visibly flagged so it doesn't get missed.

## Goals

- Select photos for multiple teams in a single file picker action.
- Each team's data is extracted, matched to a team, and saved directly — no confirm screen.
- Missing or unreadable fields don't block the save; they save partially and get flagged.
- Team list and leaderboard make incomplete records visible without hiding them.

## Non-goals

- Changing the single-bib photo-assist flow (`api/extract.ts`, the tap-to-assign chips in `BibEntry.tsx`) — untouched.
- Automated tests — per project policy, no new test coverage is written for this feature; verify manually in the browser.
- Server-side grouping via the model — grouping is a client-side, pre-AI-call step (see below).

## Data model change

`src/lib/types.ts`: `Result.p1_sec`, `p2_sec`, `p3_sec`, `act_sec` become optional (`number | undefined`), matching `d1_km..d3_km` which are already optional.

Add `isComplete(result: Result): boolean` to `src/lib/scoring.ts` — true iff all seven of `p1_sec, p2_sec, p3_sec, act_sec, d1_km, d2_km, d3_km` are present (not `undefined`).

`scoreOf`/`rank` are only ever called with complete results going forward (see Leaderboard section) — they are not changed to tolerate `undefined` internally.

**Side effect, confirmed with user:** completeness now includes GPS distance for every result regardless of entry path. A manually-typed entry that skips a distance field will show ⚠️ instead of ✅ until distance is filled in too. This is a deliberate, accepted change to existing behavior, not scoped only to bulk-imported records — there is no per-record "source" flag, and none is being added.

## Photo grouping (client-side, before any AI call)

`WatchPhotoImport.tsx`'s file picker changes from "photos for one team" to "photos for as many teams as you're submitting this round." Grouping into per-team photo sets happens client-side, using `file.lastModified` (no EXIF parsing needed — camera-roll originals carry an accurate last-modified time equal to capture time):

1. Sort selected files by `lastModified` ascending.
2. Walk the sorted list; start a new group whenever the gap to the previous photo's `lastModified` exceeds a threshold (default **60s**, a top-level constant so it's easy to retune after a real field test).
3. Each resulting group is sent to the existing `/api/extract-batch` endpoint **unchanged** (same request shape, same prompt) — one HTTP call per group, fired in parallel (`Promise.all`, no concurrency cap needed at realistic team counts).

This keeps the model's job exactly as reliable as it is today (reading one team's photos) — grouping risk lives in a simple, debuggable client-side threshold, not in an unproven "segment N photos into teams" prompt.

## Auto-save per group

For each group, once `/api/extract-batch` returns:

- **Bib resolved** (`findTeamByBib` matches): build a `Result` from whatever fields the model returned (unread fields stay `undefined`), set `recorded_at: Date.now()`, and call `saveResult` immediately — **no ตรวจทาน/confirm screen**, no range validation gate (pace 4:00-25:00/km, activity 25:00-90:00 checks are skipped for this path). Values outside range are still saved; they surface via the incomplete/GPS-flag ⚠️ paths below the same way an unreviewed misread would.
- **Bib unresolved** (no bib read, or no team matches): not saved. Collected into the end-of-batch summary for manual bib entry (see UI below).

## End-of-batch summary UI

After all groups finish processing, show a per-group result list:

- ✅ `<bib>` บันทึกครบ
- ⚠️ `<bib>` บันทึกแล้วแต่ไม่ครบ — lists which of the 7 fields are missing
- ❓ ต้องพิมพ์ bib เอง — inline text input + ยืนยัน button per unresolved group (same interaction as today's single `needsBib` prompt, just able to show more than one at once)

This replaces the current single-group `needsBib`/navigate behavior in `WatchPhotoImport.tsx`.

## TeamList status chip

`StatusChip` priority, most to least severe:

1. Result exists but `!isComplete(result)` → ⚠️ ข้อมูลไม่ครบ
2. Result exists, complete, but GPS-mismatch-flagged (`computeGpsFlags`) → ⚠️ GPS ไม่ตรง
3. Result exists and clean → ✅ บันทึกแล้ว
4. No result → ⏳ รอ

Tapping a team row still goes to `/bib/:bib` as today. `BibEntry.tsx` needs to tolerate `undefined` pace/activity fields when pre-filling from an existing partial result (mirrors how it already handles optional `d1_km..d3_km`) — everything past that (validation, ตรวจทาน, confirm, save) is the existing manual flow, unchanged.

## Leaderboard

`Leaderboard.tsx` splits results into complete and incomplete:

- Complete results: `scoreOf` + `rank` exactly as today, medals/rank numbers as usual.
- Incomplete results: rendered below the ranked list, no rank/medal, with the bib/name and a note of which fields are missing — visible so staff can see what still needs finishing without it polluting the ranking.

## Error handling / edge cases

- A single group's `/api/extract-batch` call failing (network error, model error) doesn't block the other groups — each group's promise is handled independently; a failed group surfaces as its own "❌ อ่านรูปไม่สำเร็จ, ลองใหม่" row in the summary, not a full-batch failure.
- Very large selections (many teams at once): no hard cap is being added; if this proves slow or hits payload limits in practice, chunking can be added later without changing this design's shape.
- The 60s grouping threshold is a best-effort heuristic, not a guarantee — if staff photograph two teams within 60s of each other (or one team's own photos span more than 60s), the fallback is the same as any other misread: fix it manually from the team list afterward, or use the existing single-team `/bib/:bib` entry screen directly instead of the bulk path for that team.

## Testing

Per project policy (see `CLAUDE.md`): no new automated tests. Verify manually in the browser: multi-team photo selection → grouping → auto-save → summary UI → TeamList chips → Leaderboard split, using real or synthetic watch photos.
