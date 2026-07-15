# Bulk Watch-Photo Import (Multi-Team, Auto-Save) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff select photos for many teams at once from the team list; each team's data is extracted, matched to a team, and saved straight into the results table with no per-team confirm screen — missing fields save partially and surface as a ⚠️ instead of blocking.

**Architecture:** Client-side, timestamp-gap grouping (`file.lastModified`, 60s threshold) splits a multi-select photo batch into per-team photo groups before any AI call; each group hits the existing `/api/extract-batch` endpoint unchanged, in parallel. Successful bib matches save directly via `saveResult` (no navigation, no confirm screen). `Result`'s four scoring fields become optional to allow partial saves; a `ScoreableResult`/`CompleteResult` type split keeps the leaderboard's ranking math exactly as it is today (GPS distance never gated ranking) while still letting the team-list chip flag "missing distance" as incomplete.

**Tech Stack:** React + TypeScript (Vite), IndexedDB via `idb-keyval`, existing `/api/extract-batch` Vercel function (OpenAI vision), Vitest for the (unchanged-in-scope) existing test suite.

## Global Constraints

- No new automated tests — per `CLAUDE.md` testing policy, this is a single-user tool the user has opted out of TDD for. Existing tests may be *fixed* if this change's types/behavior require it (two such fixes are called out below); do not add new test files or expand coverage.
- `npm run build` (`tsc -b && vite build`) must stay green — it typechecks `src/` and `api/` as separate project references, and `src/**/*.test.tsx` files are included in that typecheck (`tsconfig.app.json` → `"include": ["src"]`).
- `npm run dev` does not serve `/api/*` — end-to-end testing of the extract-batch call requires `vercel dev` or a real deploy.
- GPS distance (`d1_km`/`d2_km`/`d3_km`) must never affect scoring or leaderboard ranking — only completeness display. This is an existing invariant from `CLAUDE.md`, preserved by the `ScoreableResult`/`CompleteResult` split in Task 1.
- Reuse existing Tailwind utility classes/tokens already used in the touched files (`text-ink`, `text-muted`, `text-warn`, `text-ok`, `bg-signal`, `border-line`, etc.) — don't introduce new design tokens.
- All new UI copy is in Thai, matching the existing tone (see current strings in the touched files for reference).

---

### Task 1: Data model — optional scoring fields, `ScoreableResult`/`CompleteResult` split

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/scoring.ts`
- Modify: `src/components/ConfirmScreen.test.tsx:5-28` (existing test — type-only fix, see Step 3)
- Modify: `src/lib/csv.ts:1-15` (existing consumer of `scoreOf` missed during planning — see Step 3b)
- Modify: `src/lib/scoring.test.ts:1-23` (existing test — type-only fix, see Step 3c)

**Correction made during execution:** the initial version of this task only listed `ConfirmScreen.test.tsx` as an existing consumer needing a fix. Running `npm run build` after the type change surfaced two more: `src/lib/csv.ts` (CSV export also calls `scoreOf`) and `src/lib/scoring.test.ts` (a whole test file for this module that was missed when the spec was written). Both are fixed in this task, same as `ConfirmScreen.test.tsx`, because nothing else in the plan owns them.

**Expected remaining build errors after this task** (intentional — owned by later tasks, not bugs to fix here): `src/pages/Leaderboard.tsx:21` (fixed in Task 4) and `src/pages/BibEntry.tsx` at the prefill `formatSeconds` calls and the `pending`/`result` typing (fixed in Task 5). Do not touch those two files in this task.

**Interfaces:**
- Produces: `Result` (now `p1_sec?`, `p2_sec?`, `p3_sec?`, `act_sec?` all optional), `ScoreableResult = Result & Required<Pick<Result,'p1_sec'|'p2_sec'|'p3_sec'|'act_sec'>>`, `CompleteResult = ScoreableResult & Required<Pick<Result,'d1_km'|'d2_km'|'d3_km'>>`, `Scored = ScoreableResult & {d1,d2,d3,da,maxDev,total}` — all from `src/lib/types.ts`.
- Produces from `src/lib/scoring.ts`: `isScoreable(r: Result): r is ScoreableResult`, `isComplete(r: Result): r is CompleteResult`, `missingFieldLabels(r: Result): string[]`, `scoreOf(r: ScoreableResult, c: Config): Scored` (signature changed from `Result` to `ScoreableResult`), `rank` (unchanged).

- [ ] **Step 1: Update `src/lib/types.ts`**

Replace the full file contents with:

```ts
export type Team = {
  bib: string
  name: string
}

export type Result = {
  bib: string
  name: string
  p1_sec?: number
  p2_sec?: number
  p3_sec?: number
  act_sec?: number
  d1_km?: number
  d2_km?: number
  d3_km?: number
  recorded_at: number
}

export type ScoreableResult = Result & Required<Pick<Result, 'p1_sec' | 'p2_sec' | 'p3_sec' | 'act_sec'>>

export type CompleteResult = ScoreableResult & Required<Pick<Result, 'd1_km' | 'd2_km' | 'd3_km'>>

export type Config = {
  target_p1_sec: number
  target_p2_sec: number
  target_p3_sec: number
  target_act_sec: number
  weight_pace: number
  weight_act: number
  gps_tolerance_pct: number
}

export type Scored = ScoreableResult & {
  d1: number
  d2: number
  d3: number
  da: number
  maxDev: number
  total: number
}
```

- [ ] **Step 2: Update `src/lib/scoring.ts`**

Replace the full file contents with:

```ts
import type { CompleteResult, Config, Result, Scored, ScoreableResult } from './types'

export const dev = (actual: number, target: number) => Math.abs(actual - target)

const REQUIRED_FIELDS = ['p1_sec', 'd1_km', 'p2_sec', 'd2_km', 'p3_sec', 'd3_km', 'act_sec'] as const

const FIELD_LABELS: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  p1_sec: 'Road เพซ',
  d1_km: 'Road ระยะ',
  p2_sec: 'Trail เพซ',
  d2_km: 'Trail ระยะ',
  p3_sec: 'Hilly เพซ',
  d3_km: 'Hilly ระยะ',
  act_sec: 'Activity',
}

export function isScoreable(r: Result): r is ScoreableResult {
  return r.p1_sec != null && r.p2_sec != null && r.p3_sec != null && r.act_sec != null
}

export function isComplete(r: Result): r is CompleteResult {
  return isScoreable(r) && r.d1_km != null && r.d2_km != null && r.d3_km != null
}

export function missingFieldLabels(r: Result): string[] {
  return REQUIRED_FIELDS.filter((key) => r[key] == null).map((key) => FIELD_LABELS[key])
}

export function scoreOf(r: ScoreableResult, c: Config): Scored {
  const d1 = dev(r.p1_sec, c.target_p1_sec)
  const d2 = dev(r.p2_sec, c.target_p2_sec)
  const d3 = dev(r.p3_sec, c.target_p3_sec)
  const da = dev(r.act_sec, c.target_act_sec)
  return {
    ...r,
    d1,
    d2,
    d3,
    da,
    maxDev: Math.max(d1, d2, d3),
    total: (d1 + d2 + d3) * c.weight_pace + da * c.weight_act,
  }
}

// คะแนนน้อยชนะ
// ตัดสินเสมอ: 1) ช่วงที่พลาดมากสุด พลาดน้อยกว่าชนะ
//             2) ใกล้เป้า Trail มากกว่าชนะ
//             3) เข้าเส้นก่อนชนะ
export const rank = (rs: Scored[]) =>
  [...rs].sort(
    (a, b) => a.total - b.total || a.maxDev - b.maxDev || a.d2 - b.d2 || a.recorded_at - b.recorded_at,
  )
```

- [ ] **Step 3: Fix `src/components/ConfirmScreen.test.tsx` — `scoreOf` now requires `ScoreableResult`**

This existing test declares its fixture as `Result` and passes it straight to `scoreOf`. `Result`'s pace/activity fields are now optional, so a `Result`-typed value is no longer assignable where `ScoreableResult` is expected — this test will fail `tsc -b` otherwise (the fixture's actual values are all present; only the *type annotation* needs to change).

In `src/components/ConfirmScreen.test.tsx`, change:

```ts
import type { Config, Result } from '../lib/types'
```

to:

```ts
import type { Config, ScoreableResult } from '../lib/types'
```

and change:

```ts
const result: Result = {
```

to:

```ts
const result: ScoreableResult = {
```

(the object literal itself — bib, name, p1_sec, p2_sec, p3_sec, act_sec, recorded_at — is unchanged).

- [ ] **Step 3b: Fix `src/lib/csv.ts` — CSV export also calls `scoreOf`**

`resultsToCsv` scores every recorded result unconditionally; it needs to skip non-scoreable ones the same way it already skips bibs with no result at all (the existing `if (!scored) return ...blank row` branch already handles that — filtering first is the only change needed).

Change:

```ts
import { rank, scoreOf } from './scoring'
```

to:

```ts
import { isScoreable, rank, scoreOf } from './scoring'
```

Change:

```ts
  const ranked = rank(Object.values(results).map((r) => scoreOf(r, config)))
```

to:

```ts
  const ranked = rank(Object.values(results).filter(isScoreable).map((r) => scoreOf(r, config)))
```

- [ ] **Step 3c: Fix `src/lib/scoring.test.ts` — its `makeResult` helper needs to return `ScoreableResult`**

This existing test's `makeResult` builds a fully-populated fixture but declares it as `Result`, then passes it to `scoreOf`, `rank`. Change the import and the helper's return type:

Change:

```ts
import type { Config, Result } from './types'
```

to:

```ts
import type { Config, Result, ScoreableResult } from './types'
```

Change:

```ts
function makeResult(overrides: Partial<Result> = {}): Result {
  return {
    bib: '001',
    name: 'Test Team',
    p1_sec: 503,
    p2_sec: 675,
    p3_sec: 645,
    act_sec: 2805,
    recorded_at: 1000,
    ...overrides,
  }
}
```

to:

```ts
function makeResult(overrides: Partial<Result> = {}): ScoreableResult {
  return {
    bib: '001',
    name: 'Test Team',
    p1_sec: 503,
    p2_sec: 675,
    p3_sec: 645,
    act_sec: 2805,
    recorded_at: 1000,
    ...overrides,
  } as ScoreableResult
}
```

(the `as ScoreableResult` is needed because spreading a `Partial<Result>` after concrete defaults makes TypeScript widen the merged object's pace/activity fields back to optional, even though every call site in this file supplies concrete numbers — a narrow, deliberate assertion, not a broad unsafe cast.)

- [ ] **Step 4: Typecheck and run the affected tests**

Run: `npm run build`
Expected: TypeScript errors **only** in `src/pages/Leaderboard.tsx:21` and `src/pages/BibEntry.tsx` (the prefill/pending lines called out above) — those are owned by Tasks 4 and 5. No errors anywhere else, and specifically none in `src/lib/csv.ts` or `src/lib/scoring.test.ts`.

Run: `npx vitest run src/components/ConfirmScreen.test.tsx src/lib/scoring.test.ts src/lib/csv.test.ts`
Expected: PASS (same assertions as before — only type annotations/filters changed, no behavior change for any already-scoreable result).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/scoring.ts src/components/ConfirmScreen.test.tsx src/lib/csv.ts src/lib/scoring.test.ts
git commit -m "Make Result pace/activity fields optional; split ScoreableResult/CompleteResult

Allows partial saves for the upcoming bulk photo-import flow. Leaderboard
ranking keeps using ScoreableResult (pace+activity only) so GPS distance
still never affects ranking, per the existing scoring invariant. Also
fixes csv.ts and scoring.test.ts, two existing scoreOf consumers missed
when this task was originally scoped."
```

---

### Task 2: Photo grouping helper

**Files:**
- Create: `src/lib/groupPhotosByTime.ts`

**Interfaces:**
- Produces: `groupPhotosByTime(files: File[], gapMs?: number): File[][]` — used by Task 6.

- [ ] **Step 1: Create `src/lib/groupPhotosByTime.ts`**

```ts
// Groups a multi-select photo batch into per-team photo sets, using each
// file's lastModified (= capture time for camera-roll originals, no EXIF
// parsing needed) as a proxy for "these were taken together." A new group
// starts whenever the gap to the previous photo exceeds gapMs — staff
// naturally pause between teams (walking to the next runner, chatting)
// longer than the few seconds between two photos of the same watch.
export function groupPhotosByTime(files: File[], gapMs = 60_000): File[][] {
  const sorted = [...files].sort((a, b) => a.lastModified - b.lastModified)
  const groups: File[][] = []

  for (const file of sorted) {
    const current = groups[groups.length - 1]
    const previous = current?.[current.length - 1]
    if (previous && file.lastModified - previous.lastModified <= gapMs) {
      current.push(file)
    } else {
      groups.push([file])
    }
  }

  return groups
}
```

- [ ] **Step 2: Sanity-check the grouping logic**

This is pure, dependency-free logic — verify it with a throwaway Node check rather than a persisted test file (per the no-new-tests policy):

Run:
```bash
npx tsx -e "
import { groupPhotosByTime } from './src/lib/groupPhotosByTime.ts'
const mk = (ms) => ({ lastModified: ms }) as File
const groups = groupPhotosByTime([mk(0), mk(5000), mk(70000), mk(72000)], 60000)
console.log(groups.map((g) => g.map((f) => f.lastModified)))
"
```
Expected output: `[ [ 0, 5000 ], [ 70000, 72000 ] ]` — two groups, split at the >60s gap.

If `npx tsx` isn't available, run `npm run build` instead to confirm the file at least typechecks, and rely on Task 6's manual browser verification to exercise the grouping behavior end-to-end.

- [ ] **Step 3: Commit**

```bash
git add src/lib/groupPhotosByTime.ts
git commit -m "Add timestamp-gap photo grouping for bulk watch-photo import"
```

---

### Task 3: TeamList — incomplete-data status chip

**Files:**
- Modify: `src/pages/TeamList.tsx:1-27` (imports and `StatusChip`)
- Modify: `src/pages/TeamList.test.tsx:52-64` (existing test — fixture fix, see Step 2)

**Interfaces:**
- Consumes: `isComplete(r: Result): r is CompleteResult` from `src/lib/scoring.ts` (Task 1).

- [ ] **Step 1: Update `StatusChip` in `src/pages/TeamList.tsx`**

Add `isComplete` to the existing scoring import. Change:

```ts
import { normalizeBib } from '../lib/bib'
```

to:

```ts
import { normalizeBib } from '../lib/bib'
import { isComplete } from '../lib/scoring'
```

Then replace the `StatusChip` function:

```tsx
function StatusChip({ bib, results, flagged }: { bib: string; results: Record<string, Result>; flagged: Set<string> }) {
  if (flagged.has(bib)) {
    return <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">⚠️</span>
  }
  if (results[bib]) {
    return <span className="rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">✅ บันทึกแล้ว</span>
  }
  return <span className="px-2.5 py-1 text-xs text-muted">⏳ รอ</span>
}
```

with:

```tsx
function StatusChip({ bib, results, flagged }: { bib: string; results: Record<string, Result>; flagged: Set<string> }) {
  const result = results[bib]
  if (result && !isComplete(result)) {
    return <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">⚠️ ข้อมูลไม่ครบ</span>
  }
  if (flagged.has(bib)) {
    return <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">⚠️ GPS ไม่ตรง</span>
  }
  if (result) {
    return <span className="rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">✅ บันทึกแล้ว</span>
  }
  return <span className="px-2.5 py-1 text-xs text-muted">⏳ รอ</span>
}
```

- [ ] **Step 2: Fix `src/pages/TeamList.test.tsx` — "recorded" fixture is now "incomplete" under the new rule**

The test `shows a recorded chip for teams with a saved result` mocks a result with only pace/activity fields and no GPS distance, and asserts `'✅ บันทึกแล้ว'`. Under the new rule (confirmed with the user: completeness includes distance), a result missing distance is intentionally now ⚠️, not ✅ — the test's fixture needs GPS distance added so it still represents a genuinely *complete* record (preserving what the test is actually checking: the ✅ path).

Change the mocked result in that test from:

```ts
    mockStore({
      '001': {
        bib: '001',
        name: 'ขาแรงกาแล',
        p1_sec: 511,
        p2_sec: 698,
        p3_sec: 643,
        act_sec: 2847,
        recorded_at: 1000,
      },
    })
```

to:

```ts
    mockStore({
      '001': {
        bib: '001',
        name: 'ขาแรงกาแล',
        p1_sec: 511,
        p2_sec: 698,
        p3_sec: 643,
        act_sec: 2847,
        d1_km: 1.9,
        d2_km: 0.5,
        d3_km: 2.4,
        recorded_at: 1000,
      },
    })
```

- [ ] **Step 3: Typecheck and run the affected test**

Run: `npm run build`
Expected: no TypeScript errors.

Run: `npx vitest run src/pages/TeamList.test.tsx`
Expected: PASS, all 3 existing test cases green.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the app, go to `/`. With no results recorded, all teams show ⏳ รอ (unchanged). This task has no other visible effect until Task 6 produces incomplete results to display — full chip verification (⚠️ ข้อมูลไม่ครบ appearing) happens in Task 6's manual check.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TeamList.tsx src/pages/TeamList.test.tsx
git commit -m "Flag incomplete results (missing any field, incl. GPS distance) on TeamList"
```

---

### Task 4: Leaderboard — split scoreable vs non-scoreable results

**Files:**
- Modify: `src/pages/Leaderboard.tsx`

**Interfaces:**
- Consumes: `isScoreable(r: Result): r is ScoreableResult`, `missingFieldLabels(r: Result): string[]` from `src/lib/scoring.ts` (Task 1).

- [ ] **Step 1: Replace `src/pages/Leaderboard.tsx`**

Replace the full file contents with:

```tsx
import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { isScoreable, missingFieldLabels, rank, scoreOf } from '../lib/scoring'
import { getConfig, getResults, getTeams } from '../lib/store'
import type { Config, Result, Team } from '../lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    getTeams().then(setTeams)
    getResults().then(setResults)
    getConfig().then(setConfig)
  }, [])

  const nameByBib = new Map(teams.map((t) => [t.bib, t.name]))
  const allResults = Object.values(results)
  const scoreableResults = allResults.filter(isScoreable)
  const unscoreableResults = allResults.filter((r) => !isScoreable(r))
  const ranked = config ? rank(scoreableResults.map((r) => scoreOf(r, config))) : []

  return (
    <div>
      <Header title="อันดับ" />
      <div className="mx-auto max-w-2xl">
        {allResults.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">ยังไม่มีทีมบันทึกผล — อันดับจะขึ้นเมื่อกรอกผลทีมแรก</p>
        ) : (
          <>
            {ranked.length > 0 && (
              <ol>
                {ranked.map((r, i) => (
                  <li key={r.bib} role="listitem" className="flex items-center gap-4 border-b border-line px-4 py-3.5">
                    <span className={`w-6 font-mono text-lg ${i === 0 ? 'font-semibold text-signal' : 'text-muted'}`}>
                      {MEDALS[i] ?? i + 1}
                    </span>
                    <span className="font-mono text-base text-ink">{r.bib}</span>
                    <span className="flex-1 truncate text-base text-ink">{nameByBib.get(r.bib) ?? r.name}</span>
                    <span className="font-mono text-lg text-ink">{Math.round(r.total * 10) / 10}</span>
                  </li>
                ))}
              </ol>
            )}
            {unscoreableResults.length > 0 && (
              <ul>
                {unscoreableResults.map((r) => (
                  <li
                    key={r.bib}
                    role="listitem"
                    className="flex items-center gap-4 border-b border-line px-4 py-3.5 opacity-70"
                  >
                    <span className="w-6 font-mono text-lg text-muted">⚠️</span>
                    <span className="font-mono text-base text-ink">{r.bib}</span>
                    <span className="flex-1 truncate text-base text-ink">{nameByBib.get(r.bib) ?? r.name}</span>
                    <span className="text-xs text-warn">ขาด: {missingFieldLabels(r).join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and run the existing Leaderboard test**

Run: `npm run build`
Expected: no TypeScript errors.

Run: `npx vitest run src/pages/Leaderboard.test.tsx`
Expected: PASS — the existing test's fixtures have no GPS distance at all, and must still rank both teams (confirms `isScoreable`, not `isComplete`, gates ranking).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, go to `/leaderboard` with at least one recorded result from before this change (or record one manually via `/bib/:bib`) — confirm it still ranks normally.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Leaderboard.tsx
git commit -m "Split Leaderboard into ranked (scoreable) and unscoreable-incomplete sections"
```

---

### Task 5: BibEntry — tolerate partially-saved results

**Files:**
- Modify: `src/pages/BibEntry.tsx:1-79` (imports, prefill effect), `:136-148` (pending type/construction)

**Interfaces:**
- Consumes: `ScoreableResult` from `src/lib/types.ts` (Task 1).

- [ ] **Step 1: Update the type import**

Change:

```ts
import type { Config, Result, Team } from '../lib/types'
```

to:

```ts
import type { Config, ScoreableResult, Team } from '../lib/types'
```

- [ ] **Step 2: Make the prefill-from-existing-result effect null-safe for pace/activity**

In the `useEffect` that loads an existing result, change:

```tsx
        setFields({
          d1: r.d1_km != null ? String(r.d1_km) : '',
          p1: formatSeconds(r.p1_sec),
          d2: r.d2_km != null ? String(r.d2_km) : '',
          p2: formatSeconds(r.p2_sec),
          d3: r.d3_km != null ? String(r.d3_km) : '',
          p3: formatSeconds(r.p3_sec),
          act: formatSeconds(r.act_sec),
        })
```

to:

```tsx
        setFields({
          d1: r.d1_km != null ? String(r.d1_km) : '',
          p1: r.p1_sec != null ? formatSeconds(r.p1_sec) : '',
          d2: r.d2_km != null ? String(r.d2_km) : '',
          p2: r.p2_sec != null ? formatSeconds(r.p2_sec) : '',
          d3: r.d3_km != null ? String(r.d3_km) : '',
          p3: r.p3_sec != null ? formatSeconds(r.p3_sec) : '',
          act: r.act_sec != null ? formatSeconds(r.act_sec) : '',
        })
```

This is the same pattern the distance fields already use — a partially-saved result (from the new bulk-import path) now pre-fills whatever it has and leaves the rest blank for staff to complete, instead of crashing on `formatSeconds(undefined)`.

- [ ] **Step 3: Type `pending` and the reviewed result as `ScoreableResult`**

Change:

```ts
  const [pending, setPending] = useState<Result | null>(null)
```

to:

```ts
  const [pending, setPending] = useState<ScoreableResult | null>(null)
```

Change:

```tsx
    const result: Result = {
```

to:

```tsx
    const result: ScoreableResult = {
```

(the rest of that object literal — `bib`, `name`, `p1_sec`, `p2_sec`, `p3_sec`, `act_sec`, `d1_km`/`d2_km`/`d3_km`, `recorded_at` — is unchanged; at this point in `handleReview`, `p1_sec`/`p2_sec`/`p3_sec`/`act_sec` are already-validated numbers, so the object genuinely satisfies `ScoreableResult`).

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, go to `/bib/001` (or any seeded bib) for a team with no saved result — fill in all fields, ตรวจทาน → confirm → บันทึก, confirm it saves exactly as before. This task has no behavior change for that path; it only prevents a crash when opening a bib whose existing result is missing fields (exercised together with Task 6 once bulk-import can produce such a result).

- [ ] **Step 6: Commit**

```bash
git add src/pages/BibEntry.tsx
git commit -m "Tolerate partially-saved results when pre-filling the entry screen"
```

---

### Task 6: WatchPhotoImport — multi-team selection, grouping, auto-save

**Files:**
- Modify: `src/components/WatchPhotoImport.tsx` (full rewrite)
- Modify: `src/pages/TeamList.tsx` (wire the new `onImported` prop)

**Interfaces:**
- Consumes: `groupPhotosByTime` (Task 2), `isComplete`/`missingFieldLabels` (Task 1), `extractBatchFromPhotos`/`BatchExtraction` (existing, unchanged), `findTeamByBib` (existing, unchanged), `getResults`/`saveResult` (existing, unchanged), `maybeAutoBackup` (existing, unchanged).
- Produces: `WatchPhotoImport({ teams: Team[], onImported: () => void })` — the `onImported` callback prop is new; `TeamList` passes one that re-fetches results so status chips update immediately without a page reload.

- [ ] **Step 1: Replace `src/components/WatchPhotoImport.tsx`**

Replace the full file contents with:

```tsx
import { useState } from 'react'
import { maybeAutoBackup } from '../lib/backup'
import { findTeamByBib } from '../lib/bib'
import { extractBatchFromPhotos, type BatchExtraction } from '../lib/extractBatch'
import { groupPhotosByTime } from '../lib/groupPhotosByTime'
import { isComplete, missingFieldLabels } from '../lib/scoring'
import { getResults, saveResult } from '../lib/store'
import type { Result, Team } from '../lib/types'

type GroupOutcome =
  | { status: 'saved'; bib: string; complete: boolean; missing: string[] }
  | { status: 'unresolved'; bibGuess: string | null; extraction: BatchExtraction }
  | { status: 'failed'; error: string }

function buildResultFromExtraction(team: Team, extraction: BatchExtraction, existing?: Result): Result {
  const laps = extraction.laps
  return {
    bib: team.bib,
    name: team.name,
    p1_sec: laps[0]?.pace_sec ?? existing?.p1_sec,
    d1_km: laps[0]?.distance_km ?? existing?.d1_km,
    p2_sec: laps[1]?.pace_sec ?? existing?.p2_sec,
    d2_km: laps[1]?.distance_km ?? existing?.d2_km,
    p3_sec: laps[2]?.pace_sec ?? existing?.p3_sec,
    d3_km: laps[2]?.distance_km ?? existing?.d3_km,
    act_sec: extraction.activity_sec ?? existing?.act_sec,
    recorded_at: existing?.recorded_at ?? Date.now(),
  }
}

export function WatchPhotoImport({ teams, onImported }: { teams: Team[]; onImported: () => void }) {
  const [extracting, setExtracting] = useState(false)
  const [outcomes, setOutcomes] = useState<GroupOutcome[]>([])
  const [bibInputs, setBibInputs] = useState<Record<number, string>>({})
  const [resolveErrors, setResolveErrors] = useState<Record<number, string>>({})

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setExtracting(true)
    setOutcomes([])
    setBibInputs({})
    setResolveErrors({})

    const groups = groupPhotosByTime(files)
    const existingResults = await getResults()

    const settled = await Promise.all(
      groups.map(async (group): Promise<GroupOutcome> => {
        try {
          const extraction = await extractBatchFromPhotos(group)
          const team = extraction.bib ? findTeamByBib(teams, extraction.bib) : undefined
          if (!team) {
            return { status: 'unresolved', bibGuess: extraction.bib, extraction }
          }
          const result = buildResultFromExtraction(team, extraction, existingResults[team.bib])
          await saveResult(result)
          return { status: 'saved', bib: team.bib, complete: isComplete(result), missing: missingFieldLabels(result) }
        } catch (e) {
          return { status: 'failed', error: e instanceof Error ? e.message : 'อ่านรูปไม่สำเร็จ' }
        }
      }),
    )

    await maybeAutoBackup(await getResults())
    setOutcomes(settled)
    setExtracting(false)
    onImported()
  }

  async function handleResolveBib(index: number) {
    const outcome = outcomes[index]
    if (outcome.status !== 'unresolved') return
    const typed = (bibInputs[index] ?? '').trim()
    if (!typed) return
    const team = findTeamByBib(teams, typed)
    if (!team) {
      setResolveErrors((prev) => ({ ...prev, [index]: 'ไม่พบทีมเลข bib นี้' }))
      return
    }
    const existingResults = await getResults()
    const result = buildResultFromExtraction(team, outcome.extraction, existingResults[team.bib])
    await saveResult(result)
    await maybeAutoBackup(await getResults())
    setOutcomes((prev) =>
      prev.map((o, i) =>
        i === index
          ? { status: 'saved', bib: team.bib, complete: isComplete(result), missing: missingFieldLabels(result) }
          : o,
      ),
    )
    setResolveErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    onImported()
  }

  return (
    <div className="mx-4 mt-2 mb-2 border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">✨ นำเข้าจากรูปวอทช์ (เลือกได้หลายทีม)</span>
        <label className="cursor-pointer text-sm text-signal transition-opacity hover:opacity-70">
          📸 เลือกรูป
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              handleFiles(files)
            }}
          />
        </label>
      </div>

      {extracting && <p className="mt-3 text-sm text-muted">กำลังอ่านรูป...</p>}

      {outcomes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {outcomes.map((outcome, i) => (
            <li key={i} className="text-sm">
              {outcome.status === 'saved' && outcome.complete && <p className="text-ok">✅ {outcome.bib} บันทึกครบ</p>}
              {outcome.status === 'saved' && !outcome.complete && (
                <p className="text-warn">
                  ⚠️ {outcome.bib} บันทึกแล้วแต่ไม่ครบ — ขาด: {outcome.missing.join(', ')}
                </p>
              )}
              {outcome.status === 'failed' && <p className="text-warn">❌ {outcome.error}</p>}
              {outcome.status === 'unresolved' && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-warn">❓ อ่าน bib ไม่ได้ พิมพ์เอง:</span>
                    <input
                      aria-label="เลข bib"
                      type="text"
                      inputMode="numeric"
                      placeholder="bib"
                      value={bibInputs[i] ?? outcome.bibGuess ?? ''}
                      onChange={(e) => setBibInputs((prev) => ({ ...prev, [i]: e.target.value }))}
                      className="w-20 rounded-lg border border-line px-2 py-1 text-center font-mono text-ink focus:border-signal focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleResolveBib(i)}
                      className="rounded-lg bg-signal px-3 py-1 text-xs font-medium text-white"
                    >
                      ✅ ยืนยัน
                    </button>
                  </div>
                  {resolveErrors[i] && <p className="mt-1 text-xs text-warn">{resolveErrors[i]}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire the new prop in `src/pages/TeamList.tsx`**

Change:

```tsx
        <WatchPhotoImport teams={teams ?? []} />
```

to:

```tsx
        <WatchPhotoImport teams={teams ?? []} onImported={() => getResults().then(setResults)} />
```

(`getResults` is already imported in this file.)

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Manual end-to-end verification**

This flow calls `/api/extract-batch`, which `npm run dev` does not serve — use `vercel dev` instead (per `CLAUDE.md`; requires `OPENAI_API_KEY` set locally, e.g. in `.env`).

Run: `vercel dev`, open the app, go to `/`.

1. Pick photos for 2+ teams in one file-picker action (photos for the same team taken within ~60s of each other, teams separated by a longer gap — real photos or any test images with distinct `lastModified` timestamps work, since the model only needs to read a bib card + watch screen from each group).
2. Confirm each group produces its own outcome row (✅ / ⚠️ / ❓) without navigating away from `/`.
3. For a ✅ row, open that team from the list — confirm the values are pre-filled to match what was read.
4. For a ⚠️ row, confirm the TeamList status chip for that bib shows "⚠️ ข้อมูลไม่ครบ", and that opening `/bib/:bib` pre-fills the fields that were saved and leaves the rest blank (per Task 5).
5. For a ❓ row, type a bib and confirm — confirm it resolves to a ✅/⚠️ row in place, and the team's chip updates without a page reload.
6. Check `/leaderboard` — the ⚠️-incomplete team appears in the unranked section with the correct missing-field labels (unless it happens to be scoreable despite missing distance, in which case it's ranked normally, per Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/components/WatchPhotoImport.tsx src/pages/TeamList.tsx
git commit -m "Support multi-team photo selection with auto-save (no per-team review screen)

Groups a batch of photos by capture-time gaps into per-team sets, extracts
each in parallel via the existing /api/extract-batch endpoint, and saves
directly on a bib match instead of navigating to the entry screen. Missing
fields save partially and surface via the TeamList/Leaderboard incomplete
indicators added in earlier tasks."
```

---

## Post-ship note (final whole-branch review)

The shipped `handleFiles` diverges from this task's Step 1 snippet in one load-bearing way, found during the final whole-branch review: `saveResult` calls must run in a plain sequential `for` loop **after** the parallel extraction phase, not inside the same `Promise.all` with a per-group `getResults()`. `saveResult` is a non-atomic get→mutate→set on one IndexedDB key — running it concurrently across groups (even the "re-fetch existingResults per group" shape this task originally specified) is a lost-update race for any two groups, not just same-bib ones. The final shape: `Promise.all` covers only the read-only AI-extraction calls; all saves happen one at a time afterward. See commits `7783344` and `8aace3e` for the two-round fix history.

## Self-review notes

- **Spec coverage:** Data model (Task 1), photo grouping (Task 2), TeamList chip (Task 3), Leaderboard split (Task 4), BibEntry tolerance (Task 5), WatchPhotoImport auto-save + summary UI (Task 6) — all spec sections have a task. The end-of-batch summary UI and per-group bib resolution are both in Task 6, matching the spec's "End-of-batch summary UI" section.
- **Placeholder scan:** No TBD/TODO; every step has literal, complete code.
- **Type consistency:** `isScoreable`/`isComplete`/`missingFieldLabels`/`scoreOf` signatures introduced in Task 1 are used identically (same names, same types) in Tasks 3, 4, and 6. `groupPhotosByTime(files, gapMs?)` from Task 2 is called with just `files` in Task 6, using the default threshold — consistent with its signature.
- **Existing-test fallout found during planning (both fixed above, not skipped):** `ConfirmScreen.test.tsx` (Task 1, Step 3) and `TeamList.test.tsx` (Task 3, Step 2) both encoded the *old* "distance is irrelevant to completeness" behavior and needed updates to match the (user-approved) new rules. `Leaderboard.test.tsx` and `Header.test.tsx` were checked and need no changes — ranking is gated on `isScoreable`, which their fixtures already satisfy.
