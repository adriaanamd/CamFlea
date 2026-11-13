# CamFlea MVP Rebuild Design

**Date:** 2026-11-13  
**Status:** Approved for implementation  
**Source requirements:** `camflea-frontend/docs/CamFlea-rebuild-PRD.md`  
**Compatibility reference:** `camflea-legacy/camflea-new-main/`

## Goal

Deliver a complete, cohesive CamFlea MVP in the existing TanStack Start application. The rebuild must preserve the legacy application's user-visible functionality and workflow semantics while improving information hierarchy, responsive behavior, accessibility, security boundaries, and maintainability.

The first release includes authentication, profiles, public browse/search/filtering, listing detail and listing management, transactions, messaging, notifications, reporting, and role-gated staff workflows. Migration tooling and the AI help assistant remain deferred until the core trust flows are stable.

## Compatibility contract

The legacy repository is read-only source material. It is the behavior contract for the MVP, not runtime application code. Before implementing each vertical slice, the team will record its legacy route, controls, validation, state transitions, notifications, access rules, and success/error outcomes in executable tests under `camflea-test/`.

The rebuild preserves these legacy capabilities:

- Public marketplace browsing and listing detail.
- Login, signup, email verification follow-up, sign out, password recovery, and password update.
- Student profile display and permitted profile editing.
- Listing creation, editing, deletion, photos, category, condition, meeting place, and single/range/hidden price semantics.
- Cart, purchase request, seller acceptance, receipt confirmation, completion, and cancellation.
- Listing-linked buyer/seller conversations, read state, and image/video attachment behavior supported by the legacy message page, subject to the MVP upload allowlist and size limits.
- In-app notifications, unread state, individual read, and mark-all-read behavior.
- Listing/user reports and staff moderation decisions.
- Admin/staff queues and aggregate operational views, with explicit role authorization.

Security improvements are intentionally compatible at the product level: the same user actions and outcomes are available, but authorization is enforced by Supabase RLS, narrow RPCs/server functions, and server-confirmed roles instead of broad direct-client mutations or legacy service-role endpoints.

## Visual direction

Use the frontend-design Organic anchor because it matches the PRD's required Fraunces/Epilogue typography, rounded 16–32px surfaces, restrained grain, and gentle motion. Preserve the legacy CamFlea identity rather than introducing a new brand:

- Copy the legacy login and homepage logo artwork into `camflea-frontend/public/camflea-assets/`; retain an existing frontend copy only when it is byte-identical to the read-only reference asset.
- Keep the source green values `#069210`, `#057a1a`, `#037a12`, `#e8f5e8`, `#d4f3d4`, `#d8f3d8`, and `#dff4df` as the documented palette foundation.
- Use `Fraunces` for page titles and high-value display moments, `Epilogue` for interface/body text, and accessible fallbacks.
- Use a low-contrast 1–3% grain texture that never sits above content or reduces contrast.
- Use 300–500ms ease transitions with a `prefers-reduced-motion` override.
- Use Lucide icons or existing icon components; never use Unicode glyphs as icon substitutes.

The differentiator is a thumb-friendly horizontal campus category rail above an image-first listing grid. It improves the legacy catalog's discovery flow without altering filters, sorting, detail actions, or data semantics.

## Information architecture

Keep routes thin and move domain behavior into focused feature modules:

```text
camflea-frontend/src/
  routes/
    index.tsx
    auth.tsx
    listing.$listingId.tsx
    sell.tsx
    transactions.tsx
    messages.tsx
    notifications.tsx
    profile.tsx
    admin.tsx
    admin.users.tsx
    admin.listings.tsx
    admin.transactions.tsx
    admin.reports.tsx
    admin.analytics.tsx
  features/
    auth/
    browse/
    listings/
    transactions/
    messages/
    notifications/
    profile/
    admin/
  server/
    auth.server.ts
    listings.server.ts
    transactions.server.ts
    messages.server.ts
    notifications.server.ts
    moderation.server.ts
  lib/
    domain/
    validation/
    errors/
```

Existing shared UI primitives remain in `src/components/ui`. The current monolithic `src/components/camflea-app.tsx` is retired incrementally as domain components are covered by tests.

## Domain and server boundaries

The browser may request actions but does not decide whether actions are allowed.

- Public reads use explicit listing/profile projections and never expose protected profile fields.
- Authenticated internal mutations use request-scoped Supabase clients through typed TanStack server functions where the operation is not a safe public read.
- Database functions lock listing/transaction rows and own transaction transitions atomically.
- Transaction rows retain listing title and price snapshots so history remains accurate after listing edits.
- `public.user_roles` is the only source of staff role authority; editable profiles cannot grant roles.
- Banned/restricted status is checked for all protected marketplace actions in both database and UI paths.
- Listing media is private at rest, stored under generated paths, and exposed through short-lived authorized URLs.
- Messages and notifications are participant/recipient scoped, with narrow read-state updates.
- Moderation actions write an audit record with actor, target, action, reason, and safe metadata summary.

## Test architecture

All new and relocated tests live under `camflea-test/`. The frontend Vitest configuration will include this directory and keep a shared setup there. Test suites are organized by behavior rather than implementation file:

```text
camflea-test/
  setup.ts
  unit/
    domain/
    validation/
    formatting/
  integration/
    server/
    supabase/
  ui/
    routes/
    features/
  security/
  workflows/
```

Required test layers:

1. Unit tests for validation, price formatting, state-machine actions, status/copy mapping, and authorization decisions.
2. Integration tests for server functions, Supabase error mapping, and controlled mutation inputs.
3. Database/security tests for RLS, roles, banned accounts, storage access, cross-user access, and atomic transaction behavior where the local Supabase test environment is available.
4. UI tests for route rendering, labels, keyboard-accessible controls, form recovery, loading/empty/error/restricted/success states, and responsive interaction contracts.
5. Workflow tests for anonymous browse, auth, create/edit listing, purchase lifecycle, messaging, notifications, reporting, and staff moderation.

Every behavior follows strict TDD: write one focused failing test, run it and verify the expected feature-missing failure, add the smallest implementation, rerun the focused test and the affected suite, then refactor only while green.

## State and error behavior

Every data-driven surface has explicit loading, empty, error, unavailable/restricted, stale-data, and success states. Recoverable validation or network failures preserve safe user input and provide a retry or recovery action. Consequential transaction actions require confirmation and show success only after server confirmation. Authorization failures use stable, non-sensitive client messages.

## Accessibility and responsive behavior

- All form controls have visible labels or accessible names and descriptive errors.
- Icon-only controls include an accessible name; critical navigation destinations retain visible text labels.
- Focus order and dialog focus management are tested.
- Selected filters, unread state, and transaction status are represented by text/shape in addition to color.
- Browse, detail, sell, transactions, messages, notifications, profile, auth, and admin surfaces reflow from mobile through desktop.
- Motion is disabled or reduced under `prefers-reduced-motion`.
- Content uses real Supabase records or explicit empty/sample copy; fabricated activity is prohibited.

## Delivery sequence

1. Establish test discovery and domain contracts; add failing tests for core validation, routes, roles, and transaction actions.
2. Harden schema/RLS/storage foundations and typed server boundaries.
3. Build the shared visual system and responsive shell.
4. Implement identity, profiles, browse, listings, detail, and reporting.
5. Implement transaction lifecycle and notification side effects.
6. Implement messages and notification center.
7. Implement staff moderation, audit logging, and aggregate admin surfaces.
8. Run full local quality gates, visual/accessibility checks, and CI validation.

## Completion criteria

The MVP is complete only when:

- Legacy-supported user journeys have parity tests and pass end-to-end.
- UI surfaces are complete at mobile, tablet, and desktop widths with truthful states.
- Anonymous, cross-user, banned, restricted, invalid-state, and unauthorized staff actions fail safely at the database/server boundary.
- No service-role credential reaches browser code.
- `bun run lint`, `bun run test`, and `bun run build` pass from `camflea-frontend/`.
- Supabase migrations/policy checks and relevant browser/security checks pass, or limitations are explicitly reported.

