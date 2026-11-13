# Admin Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the legacy CamFlea admin workspace as a secure TanStack Start dashboard with five tabs and route isolation for exact `admin` users.

**Architecture:** Keep public marketplace profile access on the existing least-privilege column grants. Add admin-only, audited PostgreSQL RPCs for email-bearing user data and moderation mutations. Add an `isAdmin`/`isStaff` shell access model, then render a typed React admin workspace with Dashboard, User Management, Post & Item Management, Transaction Monitoring, and Reports & Violations tabs.

**Tech Stack:** TanStack Start, React, TypeScript, Vitest, Supabase PostgreSQL/RLS/RPC, Zod, existing CamFlea UI primitives and CSS.

## Global Constraints

- Keep the marketplace in the existing TanStack Start React app.
- Use authenticated TanStack server functions and Supabase RLS/RPC for internal actions; never expose a service-role key to browser code.
- Keep marketplace roles in `public.user_roles`, separate from editable student profiles, and authorize staff actions from Supabase rather than browser state.
- Keep `camflea-legacy/camflea-new-main/` read-only.
- Preserve existing user changes outside this task.
- Do not grant `student_profiles.email` to all authenticated users merely to mask a frontend projection bug.

---

### Task 1: Lock role and profile access contracts

**Files:**
- Modify: `camflea-test/ui/components/app-shell.test.tsx`
- Modify: `camflea-test/ui/components/page-shell.test.tsx`
- Modify: `camflea-test/integration/supabase/seed-contract.test.ts`
- Modify: `camflea-frontend/src/components/camflea-page-shell.tsx`
- Modify: `camflea-frontend/src/components/app-shell.tsx`
- Modify: `camflea-frontend/src/components/nav-bar.tsx`
- Modify: `camflea-frontend/src/components/navigation.tsx`
- Modify: `camflea-frontend/src/components/camflea-app.tsx`
- Modify: `camflea-frontend/src/routes/admin.tsx`

**Interfaces:**
- `ShellData` exposes `isAdmin: boolean` in addition to `isStaff`.
- `CamFleaPageShell` accepts `mode?: "marketplace" | "admin"`, defaulting to `"marketplace"`.
- `AppShell`, `NavBar`, and `Navigation` accept `isAdmin: boolean`.

- [ ] **Step 1: Write failing tests** asserting that an admin sees only the Admin dashboard navigation, an admin visiting `/browse` is redirected to `/admin`, a student visiting `/admin` is redirected to `/browse`, and the legacy profile loads never request `email`.
- [ ] **Step 2: Run the focused tests and confirm they fail for the missing role/route behavior.**
- [ ] **Step 3: Implement the role-aware shell.** Query roles once in `loadShellData`; pass `isAdmin`; add route-mode redirects; make the brand/account links point to `/admin` for admins; hide marketplace groups for admins; pass `mode="admin"` from `/admin`.
- [ ] **Step 4: Replace `student_profiles.select("*")` and the explicit email projection in `CamFleaApp` with the granted profile projection, defining a public profile type without `email`.
- [ ] **Step 5: Run the focused UI tests and confirm they pass.

### Task 2: Add database-backed admin capabilities

**Files:**
- Create: `camflea-supabase/migrations/20261113120000_admin_workspace.sql`
- Modify: `camflea-frontend/src/integrations/supabase/types.ts`
- Create: `camflea-test/integration/supabase/admin-workspace-contract.test.ts`

**Interfaces:**
- `admin_list_student_profiles()` returns `user_id`, `email`, profile identity/academic fields, `is_banned`, account `status`, `reason`, and `warning_count` for admins only.
- `admin_warn_user(_user_id uuid, _reason text)` increments warning count and audits.
- `admin_set_account_status(_user_id uuid, _status text, _reason text)` supports `active`, `restricted`, and `banned`, synchronizes `student_profiles.is_banned`, and audits.
- `admin_set_listing_flags(_listing_id uuid, _is_pinned boolean, _is_verified boolean)` updates flags and audits.
- `admin_delete_listing(_listing_id uuid, _reason text)` removes a listing and audits.

- [ ] **Step 1: Write a migration contract test** requiring exact-admin checks, audit writes, allowed status values, warning/flag columns, and authenticated-only function grants.
- [ ] **Step 2: Run the contract test and confirm it fails because the migration is absent.
- [ ] **Step 3: Add the migration with `SECURITY DEFINER`, fixed `search_path`, exact admin checks, target existence checks, input allowlists, and audit rows. Add `is_pinned`/`is_verified` to listings and `warning_count` to account status.
- [ ] **Step 4: Add generated database function/row types for the new RPCs and columns.
- [ ] **Step 5: Run the contract test and apply the migration to the linked Supabase project with `--workdir camflea-supabase`.

### Task 3: Add typed server-side admin data/actions

**Files:**
- Create: `camflea-frontend/src/features/admin/admin-actions.ts`
- Create: `camflea-frontend/src/features/admin/admin-actions.server.ts`
- Create: `camflea-test/integration/server/admin-workspace.server.test.ts`

**Interfaces:**
- `loadAdminWorkspace()` returns typed users, listings, transactions, reports, and dashboard analytics.
- `adminWarnUser({ data: { userId, reason } })` validates and calls `admin_warn_user`.
- `adminSetAccountStatus({ data: { userId, status, reason } })` validates and calls `admin_set_account_status`.
- `adminSetListingFlags({ data: { listingId, isPinned, isVerified } })` validates and calls `admin_set_listing_flags`.
- `adminDeleteListing({ data: { listingId, reason } })` validates and calls `admin_delete_listing`.

- [ ] **Step 1: Write failing server tests** proving students are rejected before data queries/RPCs, admin data includes the five tab datasets, and invalid statuses/IDs are rejected by Zod.
- [ ] **Step 2: Run the focused server tests and confirm the expected failures.
- [ ] **Step 3: Implement the authenticated server functions and server-side data aggregation with explicit projections; use the admin profile RPC for email-bearing user rows.
- [ ] **Step 4: Run the focused server tests and confirm they pass.

### Task 4: Build the five-tab admin workspace

**Files:**
- Create: `camflea-frontend/src/features/admin/admin-dashboard.tsx`
- Create: `camflea-frontend/src/features/admin/admin-dashboard-data.ts`
- Modify: `camflea-frontend/src/features/admin/report-queue.tsx`
- Modify: `camflea-frontend/src/routes/admin.tsx`
- Modify: `camflea-frontend/src/styles.css`
- Create: `camflea-test/integration/server/admin-dashboard.test.tsx`

**Interfaces:**
- `AdminDashboard` renders tabs with stable labels: `Dashboard`, `User Management`, `Post & Item Management`, `Transaction Monitoring`, and `Reports & Violations Center`.
- Dashboard analytics include the legacy sections: User Analytics, Academic Analytics, Marketplace Analytics, Pricing Analytics, Transaction Analytics, and Trends & Reports.
- User rows expose search, school/status filters, warning/restrict/ban/restore actions.
- Item rows expose school/category/status filters, pin/verify toggles, and delete.
- Transaction rows expose search/status filtering and buyer/seller/item/status/date columns.
- Report tab preserves pagination and adds reviewed/dismissed/reopen actions.

- [ ] **Step 1: Write failing component tests** asserting all five tabs render, key legacy section headings appear on Dashboard, user/item/transaction filters render, and admin actions call injected handlers.
- [ ] **Step 2: Run the focused component tests and confirm failure before implementation.
- [ ] **Step 3: Implement the dashboard shell and tab state with accessible tab buttons; preserve current report queue behavior in the fifth tab.
- [ ] **Step 4: Implement analytics and data tables with loading, empty, error, and retry states; use existing `Card`, `Button`, `Input`, `Label`, and chart primitives.
- [ ] **Step 5: Implement moderation controls with confirmation for destructive actions and refresh data after successful RPCs.
- [ ] **Step 6: Add responsive admin styling consistent with the current CamFlea palette and the legacy information hierarchy.
- [ ] **Step 7: Run focused component tests and confirm all five tabs pass.

### Task 5: Integrate, deploy, and verify

**Files:**
- Modify: `camflea-frontend/src/routeTree.gen.ts` only if TanStack generation changes it
- Modify: `docs/superpowers/plans/2026-11-13-admin-workspace.md` to check completed steps

- [ ] **Step 1: Run the targeted admin/profile tests, then the full frontend Vitest gate.
- [ ] **Step 2: Run frontend lint and build, SQL contract tests, and `git diff --check`.
- [ ] **Step 3: Apply the admin migration and verify remote RPC/data behavior with the seeded admin and student accounts; confirm admin login lands on `/admin`, student login cannot access it, and the profile requests no longer contain `email`.
- [ ] **Step 4: Inspect `git status` and preserve unrelated existing frontend changes.
