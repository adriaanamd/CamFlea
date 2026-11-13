# CamFlea Demo Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repeatable Supabase seed containing 12 demo users and 120 marked demo marketplace listings, with login credentials kept in a Git-ignored Markdown file.

**Architecture:** `camflea-supabase/seed.sql` will insert fixed-UUID Auth users, profiles, marketplace roles, account status rows, and listings after migrations run. The seed will be idempotent through fixed identifiers and conflict updates, and every seeded profile/listing will carry an explicit demo marker. A local-only credentials file will document the 12 login emails and shared demo password.

**Tech Stack:** PostgreSQL/Supabase seed SQL, Supabase Auth tables, Vitest contract tests, Git ignore rules.

## Global Constraints

- Keep the marketplace in the existing TanStack Start React app and use Supabase schema conventions already present in `camflea-supabase/migrations/`.
- Keep marketplace roles in `public.user_roles`, separate from editable student profiles.
- Run Supabase CLI commands with `--workdir camflea-supabase` when the CLI is available.
- Preserve unrelated existing frontend changes in the dirty worktree.
- Seed at least 10–15 users and at least 100 items; this plan uses 12 users and 120 items.
- Store credentials in a Markdown file ignored by Git.

---

### Task 1: Add a seed contract test

**Files:**
- Create: `camflea-test/integration/supabase/seed-contract.test.ts`

**Interfaces:**
- Consumes: `camflea-supabase/seed.sql` after Task 2.
- Produces: a repository-level contract requiring 12 fixed demo Auth user rows, 120 fixed listing rows, demo labels, and the local credential ignore rule.

- [ ] **Step 1: Write the failing test**

Create a Vitest test that reads the seed file, extracts the `DEMO USERS` and `DEMO LISTINGS` sections, counts their fixed UUID rows, and checks for the credential filename in `.gitignore`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run from `camflea-frontend/`:

```sh
npm test -- camflea-test/integration/supabase/seed-contract.test.ts
```

Expected: the test fails because `camflea-supabase/seed.sql` does not yet exist.

### Task 2: Add repeatable Supabase seed data

**Files:**
- Create: `camflea-supabase/seed.sql`
- Modify: `.gitignore`
- Create: `camflea-supabase/seed-credentials.local.md`

**Interfaces:**
- Consumes: migrated `auth.users`, `public.student_profiles`, `public.user_roles`, `public.marketplace_account_status`, and `public.marketplace_listings` tables.
- Produces: 12 Auth users with confirmed email credentials, 12 profiles, staff roles for the admin and moderator demo accounts, active account-status rows, and 120 available demo listings distributed across the 12 users.

- [ ] **Step 1: Add deterministic Auth users and profile data**

Use fixed UUIDs `10000000-0000-0000-0000-000000000001` through `10000000-0000-0000-0000-000000000012`, `crypt(..., gen_salt('bf'))` for the shared local password, confirmed email timestamps, `@camflea.test` addresses, and profile metadata. Update profiles after the Auth insert so the profile trigger and explicit seed values converge.

- [ ] **Step 2: Add roles and account status**

Assign `admin` to the first demo account and `moderator` to the second in `public.user_roles`. Add `active` rows to `public.marketplace_account_status` for all 12 accounts.

- [ ] **Step 3: Add 120 marked listings**

Use fixed listing UUIDs `20000000-0000-0000-0000-000000000001` through `...0120`, valid CamFlea categories and conditions, deterministic dates, seller IDs from the 12 demo users, and a mix of `single`, `range`, and `hidden` price types. Prefix titles/descriptions with `[DEMO DATA]` and use empty `photos` arrays so the seed does not depend on storage objects.

- [ ] **Step 4: Document local credentials and ignore the file**

Create `camflea-supabase/seed-credentials.local.md` with all 12 emails, the shared password, role notes, and a warning that these are local/demo-only credentials. Add the exact filename to `.gitignore`.

- [ ] **Step 5: Run the focused contract test and verify it passes**

Run:

```sh
npm test -- camflea-test/integration/supabase/seed-contract.test.ts
```

Expected: the seed contract passes with 12 users and 120 listings.

### Task 3: Run the repository quality gates

**Files:**
- No additional files.

**Interfaces:**
- Consumes: the completed seed, contract test, and existing frontend test suite.
- Produces: fresh local verification evidence for the relevant CI-equivalent checks.

- [ ] **Step 1: Run the full test suite**

From `camflea-frontend/`, run `npm test` and confirm exit code 0.

- [ ] **Step 2: Run lint**

From `camflea-frontend/`, run `npm run lint` and confirm exit code 0.

- [ ] **Step 3: Run the production build**

From `camflea-frontend/`, run `npm run build` and confirm exit code 0.

- [ ] **Step 4: Inspect the final diff and ignored-file state**

Run `git status --short`, `git diff --check`, and `git check-ignore -v camflea-supabase/seed-credentials.local.md`; confirm only seed-related tracked files changed and the credentials file is ignored.
