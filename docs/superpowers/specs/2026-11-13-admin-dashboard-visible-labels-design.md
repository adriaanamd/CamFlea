# Admin Dashboard Visible Chart Labels Design

## Goal

Make every admin dashboard bar chart self-explanatory at a glance: category names and counts must remain visibly attached to their bars, horizontal charts must not depend on Recharts axis measurement, and repeated bars should use distinct CamFlea-compatible colors where color adds meaning.

## Approved approach

- Render horizontal distributions as labeled DOM rows: the category name and count sit above each track, and the colored fill communicates the relative size.
- Render vertical column distributions as labeled DOM columns: each column shows its count above the fill and its category below it.
- Keep Recharts for donut and time-series charts, where its tooltip and geometry provide useful behavior.
- Use a deterministic palette of accessible, CamFlea-compatible accent colors for categorical bars and donut slices. Keep the single-series time trend green.
- Keep the existing analytics data contract, sorting, empty state, accessible chart summary, and authorization boundaries unchanged.

## Architecture

`AdminAnalyticsChart` remains the single chart presentation boundary. It will choose between CSS/DOM bar primitives for `bar` and `column` kinds and the existing `ChartContainer`/Recharts renderers for `donut` and `area` kinds. The DOM bar primitives will compute each fill width/height from the maximum count, expose labels in normal visible text, and use inline custom properties for per-item colors.

The outer chart remains labeled with the existing `role="img"`/`aria-label` contract. The visually hidden data list remains the screen-reader fallback and will continue to use the formatted category labels and exact counts. No Supabase, route, or dependency changes are required.

## Visual and responsive behavior

- Horizontal rows wrap long category names, keep counts aligned, and use full-width tracks so long labels do not disappear.
- Columns use a responsive grid, semantic category labels below the bars, count labels above the fills, and a subtle grid backdrop.
- Each categorical bar gets a deterministic palette color; the same color sequence is reused by donut slices.
- Empty distributions continue to show “No data yet.” without an empty chart shell.
- Charts remain readable at the existing mobile breakpoint and do not rely on animation.

## Testing

- Add dashboard regression assertions that populated horizontal charts contain visible category labels and counts in the dedicated horizontal-bar markup.
- Add assertions that vertical columns expose visible category labels and count labels.
- Preserve the existing analytics ordering, accessibility, empty-state, and destructive-action tests.
- Run the focused dashboard test, then the frontend lint, full test, and production build commands.
