# Admin Dashboard Chart Variety Design

## Goal

Replace the admin dashboard's repeated proportional-bar cards with visualizations that match each metric's meaning, while preserving CamFlea's existing palette, layout, and data boundaries.

## Approved visualization map

- Users by year level: ordered vertical columns.
- Students by program: horizontal bars for long labels.
- Academic analytics: remove the duplicate program card rather than repeat the same distribution.
- Items by type: horizontal bars.
- Items by status: donut chart for the marketplace status mix.
- Items by condition: ordered vertical columns.
- Items by price range: ordered vertical columns.
- Price type distribution: donut chart.
- Transaction status: donut chart; do not use a funnel because transaction statuses include separate terminal states.
- Listing trends over time: line chart with chronological month ordering.
- Reports by violation type: horizontal bars.
- Average days to sell: retain as a summary metric because the current data provides one aggregate value.

## Architecture

`DashboardOverview` will provide an explicit chart kind to each distribution card. The card will render a small Recharts visualization inside the existing CamFlea card shell, with an accessible chart label and a visually hidden data summary. The existing `recharts` dependency and chart primitives will be reused; no new dependency or Supabase change is needed.

The chart layer will sort ordinal values by their domain order and month values chronologically. Distribution counts remain sourced from the existing `AdminAnalytics` object, so the change does not fabricate data or change authorization boundaries.

## Accessibility and responsive behavior

- Every chart has a meaningful `role="img"` label based on its card title.
- Every chart includes a screen-reader-only list of labels and values.
- Tooltips expose exact values on pointer/focus interaction.
- Charts remain readable on narrow screens and respect the existing reduced-motion preference.
- Empty datasets keep the existing “No data yet.” state.

## Testing

- Add data tests for explicit year, condition, price-range, and month ordering.
- Add dashboard tests that assert the intended chart summaries render and the duplicate academic section is gone.
- Run the focused admin dashboard tests, then the complete frontend lint, test, and build gates.
