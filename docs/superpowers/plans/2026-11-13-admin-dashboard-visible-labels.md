# Admin Dashboard Visible Chart Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin dashboard bar charts display their category labels and counts reliably, fix all horizontal bar charts, and apply distinct colors to categorical bars.

**Architecture:** Keep `AdminAnalyticsChart` as the chart presentation boundary. Replace the fragile Recharts axis-based `bar` and `column` renderers with small DOM/CSS chart primitives that explicitly render labels, counts, tracks, and deterministic colors. Keep Recharts `donut` and `area` renderers for their tooltip and geometry behavior.

**Tech Stack:** React 19, TypeScript, existing CSS variables, Recharts 2.15.4, Vitest, Testing Library.

## Global Constraints

- Frontend source and package commands remain under `camflea-frontend/`.
- Supabase schema, authorization, routes, and the read-only legacy reference app remain unchanged.
- Preserve CamFlea's green palette, typography, rounded card system, responsive layout, and existing analytics data contract.
- Do not fabricate data, weaken assertions, skip tests, or disable lint/typecheck/build checks.
- Keep visible chart labels and exact counts in normal DOM text; keep the existing screen-reader summary as a fallback.

---

### Task 1: Add failing regressions for visible bar labels and colors

**Files:**

- Modify: `camflea-test/integration/server/admin-dashboard.test.tsx` in the populated chart test

**Interfaces:**

- Consumes: the existing `populatedWorkspace` fixture and `AdminDashboard` component.
- Produces: regression assertions for `.admin-horizontal-bars` and `.admin-column-bars`.

- [ ] **Step 1: Add a second item type and report reason to the populated fixture.**

Use different counts so relative fill sizing and color assignment are exercised:

```tsx
listingsByCategory: [
  { label: "Books & School Supplies", count: 2 },
  { label: "Electronics", count: 1 },
],
reportsByReason: [
  { label: "Spam", count: 2 },
  { label: "Misleading listing", count: 1 },
],
```

- [ ] **Step 2: Assert that horizontal charts expose visible labels, counts, fills, and colors.**

```tsx
const itemTypeChart = screen.getByRole("img", {
  name: "Items by type chart showing listings by item type",
});
const horizontalRows = itemTypeChart.querySelectorAll(".admin-horizontal-bar-row");
expect(horizontalRows).toHaveLength(2);
expect(itemTypeChart.querySelector(".admin-horizontal-bar-label")).toHaveTextContent(
  "Books & School Supplies",
);
expect(itemTypeChart).toHaveTextContent("2");
expect(itemTypeChart.querySelectorAll("[data-chart-color]")).toHaveLength(2);
expect(horizontalRows[0]?.querySelector(".admin-horizontal-bar-fill")).toHaveStyle({
  width: "100%",
});
```

- [ ] **Step 3: Assert that vertical columns expose visible category and count labels.**

```tsx
const yearChart = screen.getByRole("img", {
  name: "Users by year level chart showing users by year level",
});
expect(yearChart.querySelector(".admin-column-bars")).toBeInTheDocument();
expect(yearChart.querySelector(".admin-column-bar-label")).toHaveTextContent("1st Year");
expect(yearChart.querySelector(".admin-column-bar-value")).toHaveTextContent("3");
```

- [ ] **Step 4: Run the focused test and confirm the new assertions fail before implementation.**

Run from `camflea-frontend/`:

```powershell
npm test -- --run camflea-test/integration/server/admin-dashboard.test.tsx
```

Expected: the current suite's old assertions pass, while the new selectors fail because Recharts does not render the required DOM primitives.

---

### Task 2: Replace fragile bar-axis rendering with labeled DOM primitives

**Files:**

- Modify: `camflea-frontend/src/features/admin/admin-analytics-chart.tsx`

**Interfaces:**

- Consumes: `AdminDistribution[]`, formatted labels, and the existing chart-kind contract.
- Produces: `renderHorizontalBars(values)` and `renderColumnBars(values)`; Recharts remains responsible for `donut` and `area`.

- [ ] **Step 1: Expand the deterministic palette.**

```tsx
const chartPalette = [
  "var(--cf-green)",
  "#1f8a70",
  "#d97706",
  "#2563eb",
  "#b45309",
  "#7c3aed",
];
```

Use `chartColor(index)` for categorical bars and donut `Cell`s; keep the area chart green.

- [ ] **Step 2: Add an all-zero-safe maximum helper.**

```tsx
function chartMax(values: AdminDistribution[]) {
  return Math.max(1, ...values.map((value) => value.count));
}
```

- [ ] **Step 3: Implement horizontal rows with visible labels and counts.**

Each value becomes a `.admin-horizontal-bar-row` containing `.admin-horizontal-bar-label`, `.admin-horizontal-bar-value`, a track, and a fill. Set the fill style to `width: ${value.count / maximum * 100}%` and `--chart-bar-color: chartColor(index)`; add `data-chart-color` for the regression test.

- [ ] **Step 4: Implement vertical columns with visible labels and counts.**

Each value becomes an `.admin-column-bar-item` containing `.admin-column-bar-value`, a track/fill pair, and `.admin-column-bar-label`. Set the fill style to `height: ${value.count / maximum * 100}%` and the same color custom property.

- [ ] **Step 5: Route `bar` and `column` kinds outside `ChartContainer`.**

Use this renderer selection so regular HTML is never passed through `ResponsiveContainer`:

```tsx
{kind === "bar"
  ? renderHorizontalBars(chartValues)
  : kind === "column"
    ? renderColumnBars(chartValues)
    : (
        <ChartContainer config={chartConfig(valueLabel)} className={`admin-chart-container admin-chart-${kind}`}>
          {kind === "donut"
            ? renderDonutChart(chartValues)
            : renderAreaChart(chartValues, categoryLabel, valueLabel)}
        </ChartContainer>
      )}
```

- [ ] **Step 6: Run the focused test and verify the new assertions pass.**

```powershell
npm test -- --run camflea-test/integration/server/admin-dashboard.test.tsx
```

Expected: all dashboard tests pass, including visible labels, counts, relative width, and color-hook assertions.

---

### Task 3: Style labeled bars and harden remaining Recharts containers

**Files:**

- Modify: `camflea-frontend/src/styles.css` in the admin chart block and mobile media query

**Interfaces:**

- Consumes: Task 2 class names and the `--chart-bar-color` custom property.
- Produces: responsive horizontal rows, responsive columns, visible labels, and non-clipping donut/area containers.

- [ ] **Step 1: Add horizontal-row styles.**

```css
.admin-horizontal-bars { display: grid; gap: 0.9rem; min-height: 220px; align-content: center; }
.admin-horizontal-bar-row { display: grid; gap: 0.35rem; }
.admin-horizontal-bar-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; color: var(--cf-ink); font-size: 0.78rem; }
.admin-horizontal-bar-label { min-width: 0; overflow-wrap: anywhere; }
.admin-horizontal-bar-value, .admin-column-bar-value { color: var(--cf-ink-muted); font-variant-numeric: tabular-nums; }
.admin-horizontal-bar-track { height: 0.6rem; overflow: hidden; border-radius: 999px; background: var(--cf-green-soft); }
.admin-horizontal-bar-fill { display: block; height: 100%; min-width: 0.2rem; border-radius: inherit; background: var(--chart-bar-color); transition: width 180ms ease; }
```

- [ ] **Step 2: Add vertical-column styles.**

Use a responsive grid with a visible plotting area, count above each fill, and label below each column:

```css
.admin-column-bars { display: grid; min-height: 250px; grid-template-columns: repeat(auto-fit, minmax(3.5rem, 1fr)); align-items: end; gap: 0.65rem; padding: 0.5rem 0.25rem 0; }
.admin-column-bar-item { display: grid; min-width: 0; height: 100%; grid-template-rows: auto minmax(8rem, 1fr) auto; align-items: end; gap: 0.35rem; text-align: center; }
.admin-column-bar-track { display: flex; min-height: 8rem; align-items: end; justify-content: center; }
.admin-column-bar-fill { display: block; width: min(3.5rem, 78%); min-height: 0.3rem; border-radius: 0.55rem 0.55rem 0 0; background: var(--chart-bar-color); }
.admin-column-bar-label { min-height: 2.2em; overflow-wrap: anywhere; color: var(--cf-ink-muted); font-size: 0.7rem; line-height: 1.25; }
```

- [ ] **Step 3: Add `min-width: 0` and `overflow: visible` to `.admin-chart-container` while retaining its current dimensions.**

- [ ] **Step 4: At the existing mobile breakpoint, set `.admin-column-bars { min-height: 235px; }` and `.admin-column-bar-track { min-height: 7rem; }` so labels remain readable.**

- [ ] **Step 5: Run the focused test and lint.**

```powershell
npm test -- --run camflea-test/integration/server/admin-dashboard.test.tsx
npm run lint
```

Expected: the focused suite passes and lint exits with code 0.

---

### Task 4: Run all quality gates and inspect the diff

**Files:**

- No additional files.

- [ ] **Step 1: Run all frontend tests.**

```powershell
npm test -- --run
```

Expected: Vitest exits 0 with zero failed or skipped tests.

- [ ] **Step 2: Run `npm run lint` and confirm exit code 0.**

- [ ] **Step 3: Run `npm run build` and confirm the Vite/TanStack Start production build exits 0.**

- [ ] **Step 4: Inspect only task-owned changes.**

```powershell
git status --short
git diff -- camflea-frontend/src/features/admin/admin-analytics-chart.tsx camflea-frontend/src/styles.css camflea-test/integration/server/admin-dashboard.test.tsx
```

Preserve any pre-existing user changes elsewhere in the worktree.

- [ ] **Step 5: Commit the coherent implementation fix.**

```powershell
git add camflea-frontend/src/features/admin/admin-analytics-chart.tsx camflea-frontend/src/styles.css camflea-test/integration/server/admin-dashboard.test.tsx
git commit -m "fix: show labels on admin dashboard charts"
```
