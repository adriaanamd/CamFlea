# CamFlea Full-Scale Rebuild PRD

**Status:** Draft for product and engineering approval  
**Date:** 2026-11-13  
**Product:** CamFlea campus marketplace  
**Reference application:** [adriaanamd/camflea-new](https://github.com/adriaanamd/camflea-new)  
**Target application:** This TanStack Start React application in `CamFlea-SE2`

## 1. Executive summary

CamFlea is a campus marketplace where students can discover, list, discuss, and complete second-hand item transactions within their academic community. The rebuild must preserve the reference application's meaningful user journeys while replacing its fragmented Node/Express and static-page architecture with one maintainable TanStack Start application backed by Supabase Auth, PostgreSQL, Row Level Security, Storage, Realtime, and authenticated TanStack server functions.

The existing local application already has route coverage, marketplace tables, transaction RPCs, private-media foundations, and workflow tests. It is not yet a full rebuild: the UI shell is largely unstyled, the primary component contains multiple unrelated domains, several policies are broader than the desired mutation model, and migration inputs from the original system have not been supplied.

The product will be delivered in staged vertical slices. Each slice must be usable, testable, and protected against direct-client authorization bypasses before the next slice begins.

## 2. Product context

### Problem

Students need a trustworthy way to buy and sell useful items near campus, but the current reference system spreads the experience across many static pages, inconsistent data paths, and server endpoints that are difficult to reason about as one product.

### Audience

- **Student buyer:** discovers an item, asks questions, requests a purchase, and confirms receipt.
- **Student seller:** lists an item, manages availability, answers messages, accepts or cancels requests, and confirms completion.
- **Campus moderator/admin:** reviews reports, manages marketplace safety, and monitors activity without gaining unnecessary access to private student data.
- **Unauthenticated visitor:** browses available listings and understands how to sign in or join the campus marketplace.

### Product principles

1. **Local trust:** proximity, student identity, clear item condition, and meet-up details matter more than marketplace scale.
2. **Database authority:** the browser may request an action; Supabase policies, constraints, and atomic functions decide whether it is allowed.
3. **Small truthful surfaces:** show real data or clearly labeled empty/sample states. Never invent listings, users, metrics, or activity to fill space.
4. **Progressive disclosure:** browsing stays simple; transaction, moderation, and account complexity appears when it becomes relevant.
5. **Accessible by default:** keyboard access, readable contrast, focus visibility, reduced motion, and mobile usability are release requirements.

## 3. Goals and non-goals

### Goals

- Rebuild the reference application's student marketplace capability in the existing React/TanStack Start app.
- Preserve the reference feature domains: authentication, profiles, browse/search/filtering, item posting, item detail, transactions, messaging, notifications, reporting, and administration.
- Establish a single typed domain model and route structure instead of independent HTML pages and ad hoc browser storage.
- Enforce ownership, role access, transaction state transitions, media access, and moderation authority in Supabase.
- Provide a rehearsable migration path for approved users, listings, photos, transactions, messages, notifications, reports, and feedback.
- Ship a visually distinctive, responsive, and accessible campus marketplace rather than a generic admin dashboard.
- Add local and GitHub Actions quality gates for lint, type/build validation, unit tests, authorization tests, and browser journeys.

### Non-goals for the initial release

- Integrated payments, escrow, shipping, or delivery tracking. The initial transaction model supports campus meet-ups and an offline exchange.
- Public student email addresses or unrestricted profile data.
- Password extraction or password database migration from the original system.
- Service-role credentials in browser code, static HTML, or public environment variables.
- An unbounded social feed, ranking system, or recommendation engine.
- Replacing Supabase with a second application database.

## 4. Source parity baseline

The reference repository describes a Node/Express and Supabase application with static HTML/CSS/JavaScript pages, Vercel serverless routing, and feature areas for students and administrators. The observed source includes:

| Reference capability | Rebuild treatment |
| --- | --- |
| Login, signup, email verification, password recovery, role-aware access | Rebuild as Supabase Auth flows in `/auth` with server-aware session handling. |
| Student marketplace browse, search, filters, detail pages | Rebuild as public and authenticated React routes using typed listing queries. |
| Post item with photos, categories, price, condition, and meet-up details | Rebuild with validated forms and private storage uploads. |
| Cart, purchase request, reservation, receipt, completion, cancellation | Rebuild as one database-enforced transaction state machine. |
| Buyer/seller messaging | Rebuild as participant-only listing-linked conversations with Realtime refresh. |
| Notifications | Rebuild as event-backed in-app notifications with read state. |
| Reports and violations | Rebuild with student submission, staff review, status history, and audit records. |
| Admin dashboard, user/item/transaction/report management, analytics | Rebuild as role-gated staff routes with least-privilege queries. |
| Dark mode and loading states | Preserve if product approval confirms they remain part of parity; implement through the same design-token system. |
| AI/help chatbot present in the reference server | Defer to the trust-and-help phase; expose only through a server function with bounded, document-grounded responses. |

Before migration estimates are final, perform a parity inventory against the reference repository and available live behavior. Record every page, action, validation, role, status, notification, and asset in a traceability matrix. The source repository is the compatibility reference; the local schema and current component behavior are not assumed to be complete or correct merely because they exist.

## 5. Visual and interaction direction

### Brand direction: reference-faithful CamFlea

The reference application is the brand source of truth. This rebuild must use the same CamFlea color palette and logo assets as `camflea-new`; it is a UX and implementation rebuild, not a rebrand. The cloned legacy source is under `camflea-legacy/camflea-new-main/` and is used as a read-only visual reference for assets, colors, page identity, and parity checks.

The redesign may improve typography, spacing, hierarchy, responsive behavior, states, and interaction quality. It must not replace CamFlea's recognizable green identity or redraw the logo.

### Differentiator

The memorable interaction is an image-first catalog with a horizontal “campus noticeboard” category rail: filters remain thumb-friendly and visible while listing cards feel like carefully pinned finds rather than rows in an inventory database.

### Brand fidelity contract

- `camflea-legacy/camflea-new-main/` is the read-only source snapshot for logo, color, page identity, and parity comparison. It must not be imported into the TanStack bundle, deployed as runtime application code, or edited as part of the rebuild.
- Reuse the original login and homepage logo assets from the legacy snapshot, including the light and white logo variants. Compare them with `camflea-legacy/camflea-new-main/public/` and the current frontend public assets before deciding whether local copies can remain.
- Extract the complete color inventory from the cloned source and define the new CSS variables from those values. The currently observed source values include primary green `#069210`, darker green `#057a1a`, hover green `#037a12`, and pale green surfaces `#e8f5e8`, `#d4f3d4`, `#d8f3d8`, and `#dff4df`.
- The values above are an initial inventory, not permission to invent a new palette. Any additional accessible derivative must be documented against a legacy source color.
- Preserve the same logo artwork and recognizable green identity while improving layout, typography, spacing, responsive behavior, states, and interactions.

### Token system

- **Surface:** use the exact CamFlea green and pale-green values inventoried from `camflea-legacy/camflea-new-main/`; do not use the earlier Organic earth-tone palette.
- **Typography:** Fraunces for display moments and Epilogue for interface/body text, with accessible fallbacks. Typography may improve the experience while the logo and color identity remain unchanged.
- **Shape:** 16–32px radii for cards, dialogs, inputs, and image frames. Avoid sharp dashboard rectangles.
- **Texture:** a restrained 1–3% SVG grain layer or equivalent CSS texture. It must not reduce text contrast or interfere with screenshots/tests.
- **Motion:** 300–500ms gentle ease, one orchestrated page-load reveal, meaningful hover/focus feedback, and `prefers-reduced-motion` support.
- **Icons:** Lucide or another actual icon set already present in the project. Do not use Unicode glyphs as icon substitutes.

The legacy CamFlea logo remains the brand asset. UI colors must follow the legacy source palette rather than default shadcn tokens or unrelated gradients; spacing, typography, texture, and motion may be redesigned when they improve usability.

### Content rules

- Use standard labels for standard actions: “Log in,” “Create account,” “Post item,” “Cancel,” “Save,” and “Send.”
- Use real listing/profile/transaction data from Supabase. If no data exists, show a useful empty state rather than fabricated cards.
- All currency is Philippine peso (`PHP`) unless a product decision changes the campus market. Display prices consistently and preserve hidden/range pricing semantics.
- Copy must explain what the student can do next; avoid ornamental all-caps kickers, fake telemetry, and invented activity.
- All generated or seeded records must be explicitly marked as demo/sample data and must never appear in production-like environments without that label.

### Frontend reconstruction blueprint

The redesign must improve clarity and confidence without changing the reference application's approved functionality. Every legacy capability must retain an obvious destination, control, and success/failure outcome in the new interface. The visual system should support the student's task in this order: item imagery, title, price, condition, availability, next permitted action, then secondary metadata.

| Surface | Reconstruction guidance |
| --- | --- |
| Browse | Put search and the horizontal category rail above an image-first listing grid. On mobile, the rail scrolls horizontally and filters open in a compact sheet with visible selected state and a clear reset action. |
| Listing detail | Lead with the gallery, then title, price, availability, condition, seller, description, and meet-up information. Place message, purchase, and report actions near the relevant context. Stack the gallery and information on mobile; use a two-column layout at wider widths. |
| Sell/edit | Group photos, item details, price, and meet-up fields in the order a seller completes them. Show requirements beside fields, preview selected photos, show upload progress, preserve safe input after errors, and distinguish `Post item` from `Save changes`. |
| Transactions | Separate cart, active hand-offs, and history. Each row/card shows the price snapshot, counterpart, current state, and only the next action permitted for the current user. Consequential actions require confirmation; success is shown only after server confirmation. |
| Messages | Use a conversation list and thread side by side on wide screens, and one pane at a time on mobile with an obvious back action. Keep the listing context, participant identity, composer, send errors, and retry behavior visible. |
| Notifications | Prioritize unread state, event text, linked listing/transaction context, and mark-read actions. Do not use color alone to distinguish unread or urgent states. |
| Admin | Preserve the reference staff areas, but prioritize report queues, filters, statuses, and decisions over decorative metrics. Use responsive table rows that become readable detail cards on small screens. Hide fields and actions outside the staff member's permission. |
| Auth | Present one task at a time: sign in, create account, verify email, or recover password. Use plain labels and errors, preserve safe input, and provide visible links between related flows. |

Navigation remains consistent across breakpoints and always preserves access to browse, selling, transactions, messages, notifications, profile, and authorized staff functions. Icons supplement labels; critical destinations must not be hidden behind ambiguous icon-only controls.

### Interaction, accessibility, and state requirements

- Use familiar labels such as `Search`, `Filter`, `Post item`, `Send`, `Save`, and `Cancel`. Do not replace standard actions with themed copy.
- Give every icon-only control an accessible name. Selected filters, unread items, active navigation, and transaction status must be recognizable through text or shape as well as color.
- Provide visible keyboard focus, logical focus order, associated labels, descriptive field errors, and dialog focus management.
- Verify WCAG 2.2 AA intent for contrast, touch target size, reflow, screen-reader names, live-region announcements, and reduced motion. Test actual CamFlea palette combinations instead of assuming the legacy colors pass contrast.
- Every data-driven surface needs distinct loading, empty, error, permission, stale-data, and success states. Loading placeholders must not look like real listings or metrics.
- Preserve user input after recoverable validation or network errors. Offer retry/recovery and reconcile optimistic UI with confirmed server state.
- Use gentle 300-500ms transitions for meaningful changes only. Disable non-essential motion when `prefers-reduced-motion` is enabled.

### Frontend component boundaries

Build shared primitives for navigation, buttons, fields, dialogs, status labels, feedback states, and responsive layouts. Keep domain components separate for listing cards/galleries, the filter rail, listing forms, transaction action panels, conversation threads, notification rows, and moderation queues. Components receive explicit data, permissions, and state; authorization and transaction decisions remain server-enforced. Do not force buyer, seller, and staff workflows into one generic dashboard component.

### Frontend visual acceptance

Each frontend slice is accepted only after:

1. Browse, detail, sell, transactions, messages, notifications, admin, and auth are reviewed at representative mobile, tablet, and desktop widths.
2. Loading, empty, error, unavailable, restricted, and successful states are exercised with real or clearly labeled sample data.
3. Keyboard journeys, screen-reader names, focus visibility, contrast, touch targets, and reduced motion are checked.
4. Logo assets and color tokens match the legacy source, while typography, radii, grain, motion, and imagery remain intentional and accessible without drifting into default shadcn or generic SaaS styling.
5. Rendered content is reviewed for fabricated records, filler copy, Unicode icon substitutes, inaccessible color combinations, and cropped/broken listing imagery.

## 6. Information architecture and routes

Keep file-based TanStack routes thin. Feature components, server functions, schemas, and data access must live in focused modules rather than expanding `src/components/camflea-app.tsx` indefinitely.

### Public and student routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Browse available listings, search, filters, sort, and listing detail | Public browse; sign-in for actions |
| `/auth` | Sign in, sign up, verification follow-up, password recovery | Public |
| `/sell` | Create a listing | Authenticated student |
| `/transactions` | Cart, requested, active hand-offs, completed history | Authenticated participant |
| `/messages` | Conversation list and thread | Authenticated participant |
| `/notifications` | In-app event notifications | Authenticated recipient |
| `/profile` | Editable student profile and account settings | Authenticated owner |
| `/listing/$listingId` | Shareable listing detail and seller summary | Public if listing is public; restricted otherwise |

### Staff routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/admin` | Staff overview and queue counts | Admin/moderator role |
| `/admin/users` | User status, role review, and account actions | Admin only unless explicitly delegated |
| `/admin/listings` | Listing moderation and removal | Moderator/admin |
| `/admin/transactions` | Transaction monitoring and exception review | Moderator/admin with minimized fields |
| `/admin/reports` | Reports, violations, decisions, and audit trail | Moderator/admin |
| `/admin/analytics` | Approved marketplace aggregates | Admin/moderator, no private message content |

The current admin navigation guard is disabled by a hard-coded false expression. Replace it with a server-confirmed role result; never infer staff access from browser state or editable profile fields.

## 7. Functional requirements

### 7.1 Identity, onboarding, and account status

1. A visitor can browse available listings without an account.
2. A student can create an account with an approved campus email or configured verification method.
3. Email confirmation is required before protected marketplace actions.
4. A student can sign in, sign out, request a reset link, and complete a password reset.
5. A banned or restricted account cannot create listings, message, request purchases, or access protected history. The decision is enforced in Supabase, not only in React.
6. Account status and staff roles are stored outside editable profile fields. `public.user_roles` is authoritative for marketplace roles.
7. The application never stores access tokens in arbitrary local storage keys or exposes service credentials to the browser.
8. The app provides a clear recovery path when a profile is missing, email is unverified, or a session expires.

### 7.2 Profiles

Profile fields include first name, last name, school, program, year level, profile image, and bio. Public seller summaries expose only approved fields. Email, role assignments, ban/restriction reasons, and internal moderation data are not editable through the profile form and are not included in public profile queries.

Required behavior:

- Create a profile automatically after Auth signup through a controlled trigger or server workflow.
- Allow the owner to edit permitted fields only.
- Allow signed-in users to view only the public projection of another student's profile.
- Keep account email under Auth/account settings rather than duplicating it as a freely editable marketplace field.

### 7.3 Browse, search, filters, and listing detail

Listings must support title, description, category, condition, price type, price or range, photos, meet-up place, status, seller, timestamps, and moderation visibility.

The browse experience must support:

- Search across title, description, category, and meet-up place.
- Category filtering for books/school supplies, clothes/accessories, gadgets/electronics, sports/outdoors, crafted/collectibles, and other, with categories stored as controlled values.
- Condition filtering for new, like new, good, and fair.
- Sort by newest, price low-to-high, and price high-to-low.
- Listing cards with image, title, price, condition, and seller summary.
- Detail view with all approved photos, description, price semantics, meet-up place, seller summary, report action, message action, and purchase action.
- Clear unavailable/reserved/sold states without leaking private transactions.
- Empty, loading, error, and stale-data states.

Favorites are not part of the current verified schema. Add them only after the parity inventory confirms the reference behavior; if added, use a dedicated `marketplace_favorites` table with a unique `(user_id, listing_id)` constraint rather than browser-only state.

### 7.4 Listing creation and media

Students can create, edit, and remove their own listings. The form requires item name, description, category, condition, meet-up place, price style, and at least the fields required by the selected price style.

Price styles:

- `single`: one non-negative PHP amount.
- `range`: minimum and maximum non-negative PHP amounts, with minimum less than or equal to maximum.
- `hidden`: no numeric price is exposed; the buyer is told to discuss price.

Media requirements:

- Maximum five photos per listing in the initial release.
- Allowlist image MIME types and extensions; verify the actual content server-side.
- Enforce per-file and total upload limits in the server function and storage policy.
- Normalize filenames; never use a client-controlled path as an authorization boundary.
- Store media metadata in a dedicated listing-media relation or an equivalent controlled projection, including storage path, ordering, MIME type, byte size, and upload status.
- Keep the storage bucket private. Issue short-lived signed URLs only after checking listing visibility and viewer authorization.
- Remove or quarantine orphaned objects when listing creation fails.

### 7.5 Transaction state machine

The transaction domain is the highest-risk product workflow. The database must be the only authority for state changes.

```text
cart -> requested -> sent -> received -> completed
  |         |          |          |
  +---------+----------+----------+--> cancelled
```

Allowed actions:

| Current state | Actor | Action | Result |
| --- | --- | --- | --- |
| `cart` | Buyer | Request purchase | `requested`; listing becomes reserved; seller is notified |
| `cart` | Buyer | Cancel | `cancelled`; listing remains or becomes available according to reservation rules |
| `requested` | Seller | Accept | `sent`; buyer is notified |
| `requested` | Buyer or seller | Cancel | `cancelled`; reserved listing becomes available |
| `sent` | Buyer | Mark received | `received`; seller is notified |
| `sent` | Buyer or seller | Cancel | `cancelled`; apply approved exception policy |
| `received` | Seller | Complete | `completed`; listing becomes sold; buyer is notified |
| `received` | Buyer or seller | Cancel | `cancelled`; staff-visible exception record |
| `completed`/`cancelled` | Any | No transition | Reject atomically |

Requirements:

- Store a price snapshot and listing-title snapshot on the transaction so history remains accurate after listing edits.
- Enforce one active transaction per listing/buyer pair and one successful reservation per listing.
- Lock the listing/transaction rows during reservation and transition.
- Reject stale, duplicate, self-purchase, cross-account, and invalid-state requests.
- Use narrowly scoped RPCs/server functions; do not expose broad participant `UPDATE` access as the primary workflow.
- Create notifications inside the same transaction where possible, or record a reliable outbox event if delivery is asynchronous.
- Support a cancellation reason and staff-visible audit record without exposing private moderation details to the other participant.

### 7.6 Messaging

- A student can message another student from a listing or existing conversation.
- Sender and recipient are derived/validated from the authenticated user and listing/transaction context.
- A user can only read messages where they are sender or recipient.
- A user cannot edit sender, recipient, listing, read state for another recipient, or timestamps.
- Message body length, attachment policy, and rate limits are enforced server-side.
- Read-state updates are limited to the recipient and only to the read fields.
- Realtime updates refresh the authorized thread; subscriptions must not become a data-exfiltration channel.
- Deleted/removed listings do not erase required transaction history, but their public detail should no longer be reachable.

### 7.7 Notifications

Initial event types: purchase request, purchase accepted, item received, transaction completed, transaction cancelled, new message, listing moderation decision, and account status change.

Each notification has recipient, optional sender/listing/transaction references, kind, content, read state, created time, and updated time. The application supports list, unread count, mark read, and mark all read. Notification creation is tied to authorized domain events rather than arbitrary browser inserts.

Email/push delivery is out of scope for the first release unless required by campus operations. In-app notifications must remain reliable when Realtime is unavailable by reloading from the database.

### 7.8 Reporting, moderation, and staff workflows

Students can report a listing or user with a required reason and optional details. Staff can view reports permitted by role, inspect the minimal evidence necessary, mark a decision, and record the actor and timestamp.

Staff capabilities:

- Review open reports and filter by status/date/type.
- Hide or restore a listing through an auditable action.
- Restrict or ban an account through a server-authorized role/status action.
- Review transaction exceptions without reading unrelated private messages.
- View aggregate counts for listings, transactions, reports, and account status.
- Never assign staff roles from a student-editable form.

Add `marketplace_audit_log` with actor, action, target type/id, reason, metadata summary, and timestamp. Do not store raw passwords, access tokens, or unnecessary private message bodies in audit records.

### 7.9 Help assistant

The reference contains an AI/chat help capability backed by a server endpoint and document context. Rebuild it only after core trust flows are stable:

- Use a server-only provider key and a typed TanStack server function.
- Ground answers in approved CamFlea policy/help documents.
- Limit request size, response size, frequency, and provider spend.
- Treat user text as untrusted prompt content; never allow it to change system instructions or retrieve private rows.
- Do not send messages, profile data, transaction data, or moderation records to the provider unless separately approved.
- Display a clear fallback when the assistant cannot answer from approved content.

## 8. Target architecture

### Repository layout

The rebuild will separate the application concerns into explicit directories:

```text
CamFlea-SE2/
  camflea-frontend/       # TanStack Start React application
  camflea-supabase/       # Supabase CLI config, migrations, seeds, and tests
  camflea-legacy/
    camflea-new-main/     # Read-only reference clone for parity and brand assets
```

`camflea-supabase/config.toml` keeps the existing hosted project reference and must not be renamed to the folder name. The Supabase CLI must be run with `--workdir camflea-supabase` or the equivalent `SUPABASE_WORKDIR` environment variable. Frontend commands and deployment configuration must use `camflea-frontend/` as their working directory. CI must set both working directories explicitly rather than relying on root-level auto-detection.

The legacy clone is reference material only: it is not bundled, deployed, or imported by the frontend. Moving files into these directories is a repository-organization task; runtime behavior must remain unchanged during the move.

### Frontend

- TanStack Start with file-based TanStack Router routes.
- React feature modules for browse, auth, listings, transactions, messages, notifications, profile, and admin.
- Shared UI primitives remain in `src/components/ui`.
- Replace the current all-in-one `src/components/camflea-app.tsx` incrementally with focused feature components and typed view-models.
- Use React Query for cache/invalidation where it materially reduces duplicate loads; keep server authority in Supabase and server functions.
- Keep route components responsible for page composition and metadata, not database mutation details.

Suggested boundaries:

```text
src/
  routes/
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
    moderation.server.ts
  integrations/supabase/
  lib/
    validation/
    domain/
    errors/
```

### Server and data access

- Authenticated TanStack server functions are the application boundary for internal actions.
- Use a request-scoped Supabase client carrying the authenticated session for ordinary reads and writes.
- A service-role client, if needed for migration or tightly controlled staff operations, is server-only, never imported into client modules, and covered by explicit tests.
- Preserve RLS even when a server function exists. A function must not be the only authorization layer.
- Prefer `SECURITY INVOKER` database functions where possible. Any `SECURITY DEFINER` function must set a safe `search_path`, use explicit grants, validate the authenticated actor, and have tests for anonymous, cross-user, and role-escalation attempts.
- Use Zod schemas at every server-function input boundary. Validate enum values, string lengths, numeric ranges, UUIDs, pagination limits, and upload metadata.
- Return stable, non-sensitive error codes/messages to clients; log diagnostic context server-side without secrets or raw tokens.

### Database model

Retain or evolve the current tables into a domain model with these authoritative entities:

- `student_profiles`: public profile projection plus protected account metadata not exposed through broad selects.
- `user_roles`: authoritative role assignments, managed only by trusted staff/migration operations.
- `marketplace_listings`: listing content and lifecycle status.
- `marketplace_listing_media`: private object metadata and ordered photos.
- `marketplace_transactions`: participants, listing, state, snapshots, cancellation, and timestamps.
- `marketplace_messages`: participant-only message rows and read state.
- `marketplace_notifications`: recipient event rows.
- `marketplace_reports`: student reports and staff decisions.
- `marketplace_audit_log`: security and moderation actions.
- `marketplace_feedback`: optional feedback submissions and staff aggregates.
- `marketplace_favorites`: only if parity inventory confirms the feature.

Add constraints and indexes for active transaction lookup, listing status/category, message thread ordering, unread notifications, report queue status, and role checks. Avoid `SELECT *` for protected data; create safe projections/views or explicit column lists.

### Storage and Realtime

All listing media is private at rest. A server-authorized media URL flow decides whether a viewer may see the object. Realtime channels are scoped by user/conversation/listing and are treated as a convenience layer; database reads remain the source of truth after reconnect.

## 9. Security requirements

### Authentication and session security

- Supabase Auth handles password storage and verification.
- Use secure, HttpOnly, SameSite cookies for server-rendered/session-aware flows where supported by the integration.
- Do not place refresh/access tokens in arbitrary local storage keys.
- Enforce email verification and session expiration/recovery behavior.
- Rate-limit sign-in, password recovery, message sends, listing creation, reports, and AI requests.
- Do not reveal whether an email exists during password recovery.

### Authorization and RLS

- Anonymous users may read only approved public listing projections and approved media URLs.
- Students may mutate only their own permitted profile/listing rows and participate only in their own transactions/messages.
- Role assignments and account restrictions are server-controlled and stored separately from editable profiles.
- Admin/moderator permissions are explicit and tested per action, not inferred from route visibility.
- Replace broad participant updates with column-restricted grants and atomic functions.
- Test all important operations with anonymous, buyer, seller, unrelated student, moderator, admin, banned, and deleted-account identities.

### HTTP and application security

- Add CSP, HSTS in production, `X-Content-Type-Options`, `Referrer-Policy`, frame-ancestors protection, and safe cache directives for private pages.
- Use strict CORS only where cross-origin access is required.
- Validate Origin/Referer or equivalent CSRF defenses for cookie-authenticated state changes.
- Enforce JSON content types, body limits, pagination limits, and request timeouts.
- Sanitize/encode user content by context. Do not render listing descriptions or messages as unsanitized HTML.
- Use generic client errors for authorization failures and detailed server logs only when safe.

### Upload and external-provider security

- Allowlist image types and sizes; verify file signatures and reject polyglot or executable content.
- Keep object paths generated by the server; prevent traversal and cross-user folder access.
- Treat external image/provider URLs as untrusted; do not proxy arbitrary URLs without an allowlist and SSRF controls.
- Keep AI/provider credentials in server environment variables and redact provider errors before returning them.

## 10. Migration strategy

Migration cannot begin until source exports and authority are confirmed. The rebuild must not invent data or silently discard private records.

### Source-to-target mapping

| Reference/source concept | Target |
| --- | --- |
| `student` profile/auth linkage | Supabase Auth user plus `student_profiles`; legacy role maps to `user_roles` |
| `item` | `marketplace_listings` plus `marketplace_listing_media` |
| `transactions` | `marketplace_transactions` with normalized statuses and snapshots |
| `conversation`/`message` | `marketplace_messages`, preserving only approved participant history |
| `notifications` | `marketplace_notifications` with normalized event kinds |
| `report`/violations | `marketplace_reports` plus `marketplace_audit_log` |
| `feedback` | `marketplace_feedback` |
| static image folders | Private storage bucket plus media metadata rows |

### Migration phases

1. **Inventory:** export schemas, row counts, foreign-key relationships, roles, media paths, and last-updated timestamps. Obtain written approval for private data retention.
2. **Transform:** map IDs, normalize enums/statuses, scrub unsafe content, validate required fields, and produce a dry-run report.
3. **Media transfer:** copy files to generated private paths, validate content types and sizes, create metadata rows, and quarantine failures.
4. **Load:** import into a staging Supabase project or isolated migration schema; never write directly to production during the first rehearsal.
5. **Reconcile:** compare counts, orphan references, status totals, media totals, and sampled relationships. Require zero unexplained loss before cutover.
6. **Identity continuity:** do not assume passwords are transferable. Use verified email invitations or reset flows, and document accounts that require manual recovery.
7. **Cutover:** freeze legacy writes, take a final delta export, load it, verify smoke journeys, switch traffic, and retain rollback snapshots.

Migration tooling should be idempotent, dry-run capable, resumable, and explicit about skipped rows. Keep migration scripts outside ordinary schema migrations and record each run's input/export checksum.

## 11. Delivery plan

### Phase 0 — parity discovery and decisions

**Deliverables:** the read-only clone at `camflea-legacy/camflea-new-main/`, a source color/logo manifest, source traceability matrix, route/action inventory, data dictionary, role/access matrix, transaction state diagram, migration data contract, and approved product decisions.

**Exit criteria:** every known reference capability is classified as rebuild, replace, defer, or remove; the rebuilt app resolves its logo and color tokens against the legacy snapshot; missing exports and identity decisions are documented; no implementation estimate is treated as final before this inventory.

### Phase 1 — security and domain foundation

**Deliverables:** hardened Supabase schema/policies, role model, audit log, validation schemas, server-function conventions, session handling, safe media URL flow, and authorization test harness.

**Exit criteria:** direct anonymous/cross-user mutation attempts fail; staff access is server-confirmed; transaction transitions are atomic; private media cannot be retrieved by guessed paths; no service-role client reaches the browser.

### Phase 2 — design system and application shell

**Deliverables:** reference CamFlea color/logo tokens, fonts, responsive shell, navigation, loading/error/empty states, accessible primitives, route metadata, dark-mode decision implementation, and a visual QA checklist.

**Exit criteria:** browse, auth, and protected shells render at mobile/tablet/desktop widths; focus states and reduced motion are verified; no custom surface class is left without an intentional style; copy contains no fabricated data or filler labels.

### Phase 3 — identity and marketplace core

**Deliverables:** auth, profiles, browse/search/filter/sort, listing detail, create/edit/delete, media upload, seller summary, and report entry point.

**Exit criteria:** anonymous browse works; a student can create a valid listing with approved photos; another student can view it; owners cannot edit another user's listing; invalid media and fields are rejected.

### Phase 4 — transaction lifecycle

**Deliverables:** cart, request, seller acceptance, buyer receipt, completion, cancellation, notifications, status UI, price snapshots, and concurrency tests.

**Exit criteria:** buyer/seller journeys complete end-to-end; one listing cannot be successfully reserved by two buyers; all invalid transitions fail without partial writes; cancelled listings follow the approved availability rule.

### Phase 5 — communications and trust

**Deliverables:** messages, unread/read state, Realtime refresh, notification center, reports, moderation queue, audit log UI, and account restriction actions.

**Exit criteria:** participants see only their conversations; notification events match authorized actions; staff can resolve a report with a recorded decision; banned/restricted accounts are blocked in the database and UI.

### Phase 6 — administration and analytics

**Deliverables:** staff navigation, user/listing/transaction/report pages, aggregate dashboards, filters, pagination, and least-privilege projections.

**Exit criteria:** each admin action is role-tested and audited; analytics exclude private message content and unauthorized profile fields; large queues paginate without loading all records.

### Phase 7 — migration, hardening, and launch

**Deliverables:** migration scripts, staging rehearsal, reconciliation report, cutover/rollback runbook, production headers, monitoring, backups, accessibility review, and CI workflow.

**Exit criteria:** migration passes reconciliation; smoke journeys pass after cutover rehearsal; build/lint/tests/browser checks pass; remote CI is green; rollback has been exercised or explicitly approved with evidence.

## 12. Quality strategy and CI gates

Every code, schema, dependency, or workflow change must run the smallest complete local checks for the affected area, followed by the full relevant gate before completion.

### Required checks

- `bun run lint`
- `bun run test`
- `bun run build`
- Type-check through the build or an explicit TypeScript check.
- Supabase migration validation and database policy/RPC tests.
- Browser smoke tests for anonymous browse, auth, listing creation, purchase lifecycle, messaging, notification read, report review, and denied cross-account access.
- Accessibility checks for keyboard navigation, focus order, labels, contrast, reduced motion, and representative screen-reader names.
- Dependency and secret scanning in CI.

Test lanes must be deterministic, timezone-pinned where dates are involved, and bounded below the project’s 110-second per-lane target. No focused tests, skipped assertions, weakened gates, or advisory conversion of required failures is permitted.

### Test layers

1. **Unit:** validation schemas, price formatting, state-machine transition rules, copy-safe error mapping.
2. **Database/security:** RLS, grants, RPC transitions, role checks, direct mutation denial, storage access, and concurrency.
3. **Integration:** server functions with mocked or local Supabase responses and error paths.
4. **Browser:** critical student/staff journeys at mobile and desktop sizes.
5. **Migration:** dry-run, idempotence, checksum, reconciliation, orphan detection, and rollback validation.

## 13. Non-functional requirements

- **Performance:** target LCP under 2.5 seconds on a representative mobile connection for the public browse route, lazy-load listing media, and paginate large queues.
- **Availability:** core browse remains useful when Realtime is unavailable; mutations fail visibly and safely rather than appearing successful.
- **Privacy:** private profile fields, messages, moderation details, and storage paths are not exposed through public queries or logs.
- **Accessibility:** meet WCAG 2.2 AA intent for keyboard, focus, semantics, contrast, motion, and form errors.
- **Observability:** capture structured server errors, authorization failures, migration results, and critical workflow failures without secrets or raw tokens.
- **Maintainability:** feature modules have focused responsibilities, typed inputs/outputs, and tests at the domain boundary.
- **Localization readiness:** keep labels, currency formatting, dates, and error copy centralized enough to support future campus/localization decisions.

## 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Reference behavior is larger than its README | Maintain a traceability matrix from source files, live behavior, and stakeholder review before final estimates. |
| Broad RLS/grants allow direct client bypasses | Replace broad mutation paths, add cross-account tests, and require database-level authorization evidence. |
| Reservation races create double sales | Lock rows and transition atomically; test concurrent purchase requests. |
| Legacy identities or private data cannot be transferred | Define reset/invite and retention rules before migration; never assume password portability. |
| Private media becomes public through bucket/object paths | Private bucket, server-issued signed URLs, generated paths, and guessed-path tests. |
| Monolithic component slows delivery | Split by domain after each vertical slice; keep route-level composition small. |
| Visual redesign drifts from product identity | Treat `camflea-legacy/camflea-new-main/` logo assets and color values as canonical; improve layout and interaction without rebranding. |
| Missing CI/runtime tooling hides regressions | Add reproducible Bun setup and GitHub Actions early; report local environment limitations honestly. |
| AI assistant leaks data or hallucinates policy | Defer until core trust features ship; server-only provider, approved documents, strict limits, and no private context. |

## 15. Decisions required before implementation estimates

The following defaults are used by this PRD unless product owners choose otherwise:

1. Campus eligibility: approved school email plus email verification.
2. Currency: PHP.
3. Exchange model: in-person campus meet-up; no integrated payment in the first release.
4. Public access: available listings are public; private profiles, messages, and transaction history are not.
5. Media: up to five private listing photos with short-lived authorized URLs.
6. Notification channel: in-app first; email later if operations require it.
7. Roles: student, moderator, admin, and banned/restricted authority states managed outside editable profiles.
8. Favorites: defer until confirmed by parity inventory.
9. Dark mode: preserve only if stakeholder parity review confirms it is required; if preserved, derive its surfaces and contrast states from the legacy CamFlea palette.
10. AI assistant: post-core phase, document-grounded and server-only.
11. Brand identity: use the same `camflea-new` palette and logo artwork; improve the interface without rebranding CamFlea.

## 16. Definition of done for the full rebuild

CamFlea is ready for launch when:

- The approved reference traceability matrix has no unresolved must-have capability.
- Public browse, auth, listing, transaction, messaging, notification, report, profile, and staff journeys work end-to-end.
- Database policies and server functions reject anonymous, cross-user, banned, and invalid-state actions.
- Media, profile, message, and moderation privacy rules have executable tests.
- Migration rehearsal reconciles approved source records and media with zero unexplained loss.
- The legacy CamFlea logo and color identity are implemented consistently with accessible responsive layouts and truthful product copy.
- `lint`, `test`, `build`, security/database tests, browser smoke tests, accessibility checks, and GitHub Actions pass with fresh evidence.
- Deployment, monitoring, backup, cutover, and rollback runbooks exist and have named owners.

## 17. Legacy API endpoint parity audit

**Audit source:** the local read-only clone at `camflea-legacy/camflea-new-main/`, specifically `server.js`, `vercel.json`, and legacy frontend fetch consumers.  
**Audit result:** 22 legacy HTTP endpoints were identified. The current TanStack app has no explicit endpoint or `createServerFn` layer yet; it performs direct Supabase Auth, table, storage, and RPC calls. Therefore, no endpoint-for-endpoint parity is claimed. Some operations are capability-level equivalents, but their validation, authorization, side effects, and error behavior still require verification.

Matching the old URL is not required unless an external consumer is confirmed. The target implementation should use authenticated TanStack server functions plus Supabase RLS/RPC. The table below is the required parity backlog.

| Legacy endpoint | Current status | Target treatment |
| --- | --- | --- |
| `GET /api/health` | Missing | Add a minimal deployment/monitoring health endpoint if the hosting contract requires it. Never expose credentials or internal diagnostics. |
| `GET /api/config` | Partially equivalent | Current frontend uses public `VITE_*` configuration. Document the public-config contract and never return a service-role key. |
| `POST /api/create-student` | Needs typed replacement | Implement validated student registration/profile creation, identity binding, email verification, and failure recovery through Auth plus a server function/trigger. |
| `POST /api/verify-admin` | Needs typed replacement | Replace with an authenticated role check backed by `public.user_roles`; authorize each staff action independently. |
| `GET /api/admin/transactions` | Needs typed replacement | Provide staff-authorized, explicit-field, filtered, paginated transaction access. Do not reuse an unrestricted table query as the API contract. |
| `GET /api/admin/debug/tables` | Intentionally not ported | Debug-only schema/table inspection must not be exposed in the application. Use restricted development tooling when needed. |
| `GET /notifications` | Needs typed replacement | Retrieve only the authenticated recipient's notifications with agreed ordering, pagination, and unread semantics. |
| `POST /item/:item_id/mark-sold` | Needs typed replacement | Map to the approved seller/transaction lifecycle and enforce actor, state, listing, and notification effects atomically. |
| `POST /notifications/:notif_id/read` | Needs typed replacement | Allow only the notification recipient to mark it read. Consolidate with bulk-read behavior where safe. |
| `POST /signup` | Partially equivalent | Supabase Auth signup exists; verify campus eligibility, profile creation, email verification, and error behavior before claiming parity. |
| `POST /post-item` | Needs typed replacement | Implement authenticated, validated listing creation and media handling; do not treat direct client table/storage calls as the final API boundary. |
| `GET /student-info` | Needs typed replacement | Define self versus public profile projections and return only fields allowed for the requester. |
| `POST /notifications` | Needs typed replacement | Generate notifications only from authorized domain events. Do not allow arbitrary client-controlled recipient/sender notification creation. |
| `POST /notifications/last-checked` | Missing | Decide whether legacy timestamp semantics are required. Implement a protected equivalent only if they differ from per-notification read state. |
| `POST /item/:item_id/status` | Needs typed replacement | Define allowed listing/status transitions and actors; consolidate with transaction operations where user-visible behavior is preserved. |
| `POST /item/:item_id/buy` | Partially equivalent | Current `marketplace_add_to_cart` and `marketplace_request_purchase` cover the likely flow. Verify legacy semantics, concurrency, price behavior, authorization, and notifications. |
| `POST /item/:item_id/set-available` | Needs typed replacement | Define who may reopen a listing and under which transaction conditions; enforce the change atomically. |
| `POST /complete-transaction` | Partially equivalent | Current `marketplace_transition_transaction` supports completion. Verify actors, state transitions, listing updates, notifications, and audit effects. |
| `POST /update-password` | Missing | Add the password-reset completion/update flow. Reset-email initiation alone is not endpoint parity. |
| `POST /message/send` | Needs typed replacement | Validate sender, recipient, conversation/listing membership, body limits, rate limits, and notification behavior in a server function. |
| `POST /api/chat` | Missing/deferred | Inspect the legacy provider, policy documents, data handling, and product need. If retained, make it server-only, bounded, document-grounded, and isolated from private marketplace data. |
| `POST /mark-notifications-read` | Needs typed replacement | Add an authorized bulk-read operation if the legacy UX requires it; define its scope relative to individual read and last-checked state. |

### API parity requirements

1. For every legacy endpoint, record its inputs, outputs, authentication, validation, side effects, frontend consumers, and retirement/replacement decision.
2. Verify the existing purchase and transaction RPCs against the legacy behavior and the approved transaction state machine; RPC existence alone is not parity evidence.
3. Prefer typed server functions and database-enforced operations over recreating insecure legacy URLs. Keep service-role credentials server-only.
4. Derive identity from the authenticated session, validate ownership/participation/role server-side, constrain mutation columns, rate-limit abuse-prone actions, and make multi-record transitions atomic.
5. Do not port debug/schema inspection endpoints or arbitrary notification creation merely for URL compatibility.

### Endpoint parity acceptance checklist

- Every legacy endpoint has a source-verified mapping to a supported operation or an explicitly approved retirement decision.
- Buyer, seller, and staff journeys preserve the agreed behavior, including state changes and notifications.
- Tests cover anonymous, cross-user, unauthorized staff, invalid input, repeated requests, and concurrent purchase attempts.
- Password recovery/update and notification read behavior are tested, including any approved last-checked semantics.
- No public response or frontend bundle contains a service-role key; debug data remains inaccessible to ordinary users.
- Relevant local and CI gates pass before endpoint parity is claimed.

