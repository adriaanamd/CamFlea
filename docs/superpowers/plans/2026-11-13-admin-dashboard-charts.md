# Admin Dashboard Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each admin dashboard metric an appropriate chart type instead of rendering every distribution as the same horizontal bar.

**Architecture:** Keep the existing `AdminAnalytics` data contract and CamFlea styling. Extend the dashboard's distribution card with explicit chart variants built from the installed Recharts package, and make ordering deterministic for ordinal and monthly data. Keep an accessible text summary alongside each chart.

**Tech Stack:** React 19, TanStack Start, TypeScript, Recharts, Vitest, Testing Library, existing CamFlea CSS variables.

## Global Constraints

- Frontend source and tests remain under `camflea-frontend/` and `camflea-test/`.
- Do not change Supabase schema, authorization, or the read-only legacy reference app.
- Preserve CamFlea's existing green palette, typography, rounded card system, and responsive layout.
- Do not fabricate data, weaken assertions, skip tests, or disable lint/typecheck/build checks.

### Task 1: Lock down analytics ordering and chart contract

**Files:**

- Modify: `camflea-frontend/src/features/admin/admin-dashboard-data.ts`
- Test: `camflea-test/integration/server/admin-dashboard.test.tsx`

- [ ] **Step 1: Write the failing tests** for natural year/condition/price-range ordering and chronological months, plus the dashboard's chart labels.
- [ ] **Step 2: Run the focused admin dashboard test and confirm the new assertions fail for the current count-sorted data and bar-only markup.**
- [ ] **Step 3: Add deterministic ordering helpers without changing the analytics fields or data source.**
- [ ] **Step 4: Run the focused test again and confirm it passes.**

### Task 2: Replace the generic bar renderer with chart variants

**Files:**

- Modify: `camflea-frontend/src/features/admin/admin-dashboard.tsx`
- Modify: `camflea-frontend/src/styles.css`

- [ ] **Step 1: Add explicit chart kinds to `AnalyticsSection` and `DistributionCard`.**
- [ ] **Step 2: Render ordered column charts, horizontal bar charts, donut charts, and a chronological line chart using the existing Recharts dependency.**
- [ ] **Step 3: Add chart labels, tooltips, legends, screen-reader summaries, empty states, and responsive sizing.**
- [ ] **Step 4: Remove the duplicate Academic analytics section and keep the average sell time as a summary metric.**
- [ ] **Step 5: Run the focused admin dashboard test and fix any regressions without modifying test expectations to hide failures.**

### Task 3: Run the repository gates

**Files:**

- No additional files.

- [ ] **Step 1: Run `npm test -- --run` from `camflea-frontend/`.**
- [ ] **Step 2: Run `npm run lint` from `camflea-frontend/`.**
- [ ] **Step 3: Run `npm run build` from `camflea-frontend/`.**
- [ ] **Step 4: Inspect the diff and report the exact verification results.**
