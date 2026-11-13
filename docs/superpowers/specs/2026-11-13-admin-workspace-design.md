# CamFlea Admin Workspace Design

## Goal

Replace the current report-only `/admin` page with the legacy admin workspace in the TanStack Start app while keeping exact `admin` users out of the student marketplace routes and preserving moderator access to the marketplace and staff report queue.

## Legacy parity scope

The new workspace keeps the legacy navigation and responsibilities as React tabs:

1. Dashboard: user, academic, marketplace, pricing, transaction, trend, and report analytics.
2. User Management: search/filter users, view account state, warn, restrict, ban, and restore accounts.
3. Post & Item Management: filter listings by school/category/status, mark listings pinned or verified, and remove listings.
4. Transaction Monitoring: search/filter all transactions and inspect buyer, seller, listing, status, and timestamps.
5. Reports & Violations Center: review, dismiss, reopen, and paginate reports.

The legacy clone remains read-only reference material. Its HTML, JavaScript, CSS, and database names are not imported into the frontend bundle.

## Security and data flow

- `student_profiles.email` remains unavailable to ordinary authenticated REST queries. Marketplace profile queries use an explicit non-email projection.
- Admin-only profile/email data is returned by a `SECURITY DEFINER` PostgreSQL RPC that checks `public.has_role(auth.uid(), 'admin')` before reading `auth.users`.
- Admin mutations use `SECURITY DEFINER` RPCs that verify the exact `admin` role, reject invalid target/status values, update the relevant public tables, and append `marketplace_audit_log` records.
- Moderators continue to use the existing staff report actions, but do not receive the admin workspace or admin mutation RPCs.
- The route shell derives `isAdmin` and `isStaff` from `public.user_roles`; it redirects admins from every student route to `/admin`, redirects non-staff users away from `/admin`, and renders admins only the admin navigation.

## Database additions

The admin migration will:

- add `warning_count`, `is_pinned`, and `is_verified` state needed by the legacy tabs;
- expose `admin_list_student_profiles()` for admin-only user management data;
- expose audited `admin_warn_user()`, `admin_set_account_status()`, `admin_set_listing_flags()`, and `admin_delete_listing()` functions;
- grant those functions only to `authenticated` and keep their role checks inside the database.

## Frontend structure

- `AdminDashboard` owns the tab selection and refresh/error state.
- Each tab is a focused component with a typed loader/action boundary.
- Server functions validate all admin inputs with Zod and call the authenticated Supabase client/RPCs; browser code never receives a service-role key.
- The dashboard uses the existing CamFlea palette and UI primitives. Analytics are rendered as responsive metric cards and distribution bars/lists, preserving the legacy information architecture without copying legacy implementation code.

## Verification

- Add failing tests for admin-only navigation/redirects, non-email profile projections, admin action authorization, and all five dashboard tabs.
- Run the targeted Vitest files, the full frontend test gate, lint, build, SQL seed contract tests, and `git diff --check`.
- Apply the migration to the linked Supabase production project and verify the admin account can open all tabs while a seeded student is redirected away from `/admin`.
