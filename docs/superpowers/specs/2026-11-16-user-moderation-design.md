# CamFlea user moderation design

Date: 2026-11-16

## Context

CamFlea already has an administrator workspace, Supabase-backed account statuses (`active`, `restricted`, and `banned`), audited warning/status RPCs, and an `AdminUser` view model. The current implementation does not yet provide restriction expiry controls, complete database enforcement for all marketplace mutations, a user-facing banned-account modal, or per-user activity statistics in the admin user records.

The legacy application provides the visual direction for the banned-account modal: a blurred backdrop, red ban icon, centered card, explanatory copy, and a clear acknowledgement/action. The legacy application is read-only reference material and will not be modified or bundled.

## Goals

- Support unlimited administrator warnings with a visible count per user.
- Support manual or automatically expiring restrictions.
- Make a ban permanent until an administrator explicitly restores the account.
- Allow restricted users to browse listings but prevent marketplace actions.
- Show a blocking banned-account modal to banned users.
- Show meaningful, database-backed statistics for every user in the admin workspace.
- Keep authorization in authenticated TanStack server functions and Supabase RPC/RLS rather than trusting browser state.
- Preserve warning/status auditability and existing admin safeguards.

## Non-goals

- Modifying the legacy reference application.
- Building a separate moderation-history product or public moderation appeal workflow.
- Adding automatic user deletion or disabling Supabase Auth accounts.
- Changing marketplace branding or the existing admin navigation structure.

## Moderation model

### Warning

Warnings increment an unlimited `warning_count` on the user’s account-status record. An optional reason is recorded with the moderation action, and every warning remains represented in `marketplace_audit_log`. Warnings do not automatically change the account status.

### Restriction

Restrictions use `status = 'restricted'` and a nullable `restriction_expires_at` timestamp.

- A null expiration means the account stays restricted until an administrator restores it.
- A future expiration means the account is restricted until that timestamp.
- An expiration at or before the current time is treated as active.
- The stored restriction record remains available for audit and administrator visibility.

The administrator can choose Indefinite, 24 hours, 7 days, 30 days, or a custom expiration date. The restriction reason and chosen expiration are stored with the account-status record and audit event.

### Ban

Ban uses `status = 'banned'` with no automatic expiration. It remains in force until an administrator explicitly restores the account to active. The existing student-profile `is_banned` compatibility field continues to mirror the effective banned state for existing consumers.

## Authorization and data flow

1. An authenticated admin invokes a TanStack server function for warning, restriction, restoration, or banning.
2. The server function validates UUIDs, status values, reasons, and optional expiration values, then invokes an admin-only Supabase RPC.
3. The RPC checks the caller’s `public.user_roles` role in Supabase, prevents administrators from changing their own account, validates the target user, updates the account-status record, mirrors the banned compatibility flag, and writes an audit record.
4. Marketplace mutation RPCs and listing-write policies consult the effective account status. Only `active` users may create listings, send messages, add/request purchases, or change marketplace transactions.
5. Listing reads remain available to restricted users. Banned users receive the banned modal and cannot perform marketplace mutations.
6. The frontend reads status for presentation only. Database/RPC enforcement is authoritative.

The effective-status logic will be centralized in Supabase helper logic so expiration behavior is consistent across listing creation, messaging, transactions, the user-facing shell, and the administrator user list.

## Admin user workspace

The existing user-management records remain the primary moderation surface. Each user record will display:

- name, email, school, program, and current effective status;
- warning count and latest moderation reason;
- total listings, available listings, and sold listings;
- total transaction records and completed purchases;
- messages sent;
- reports received.

The statistics will be returned by the admin workspace data load in one server-side query/RPC rather than issuing one request per user. Counts must be derived from existing marketplace tables and contain no fabricated values. Listing counts represent persisted listings; transaction counts represent persisted transaction records associated with the user; completed purchases represent completed transactions where the user is the buyer; message and report counts represent persisted records associated with the user.

Moderation controls:

- Warn opens the existing confirmation flow and accepts an optional reason.
- Restrict opens a confirmation flow with the duration choices above and an optional reason.
- Ban opens a stronger permanent-ban confirmation.
- Restore returns a restricted or banned account to active and records the action.

After a successful action, the workspace refreshes so status, warning count, expiration, and statistics are read from the database again.

## User experience

The authenticated shell loads the current user’s effective account status alongside existing profile, notification, and role data.

Restricted users see a clear status notice explaining that they can browse listings but cannot post, message, or purchase. If the restriction has an expiration, the notice shows the expiration; otherwise it says the account remains restricted until restored by staff. Action controls are disabled for clarity, with server errors still handled safely if a stale page is used.

Banned users see a blocking modal modeled on the legacy banned-profile treatment:

- blurred dark backdrop;
- red ban icon;
- title: “You are banned from CamFlea”;
- explanation that the account was permanently banned for community-guideline violations;
- sign-out action.

The modal is keyboard accessible, has an explicit dialog label, and does not allow marketplace use behind it. The banned state is still enforced server-side even if the modal is not rendered due to a client failure.

## Failure handling

- Invalid duration, status, reason, or target user is rejected by schema validation and the RPC.
- Expiration dates in the past are rejected for new restrictions; an existing expired restriction is normalized to active when read or when an action is authorized.
- Attempts to moderate the caller’s own account continue to fail in the database.
- If a moderation action fails, the admin UI retains the current record and shows an actionable error without optimistic state changes.
- If account-status loading fails, the shell must not treat the user as active by default for protected mutations; server authorization remains the final safeguard.

## Testing and acceptance criteria

Tests will be written before implementation for the new behavior and must demonstrate the expected failure before the implementation is added.

Required coverage:

- warning count increments from zero, preserves prior counts, and supports repeated warnings;
- indefinite restrictions remain restricted;
- expiring restrictions become active after the expiration timestamp;
- banning remains active regardless of restriction-expiration fields;
- restore returns a user to active;
- restricted and banned users are denied listing creation, messaging, purchase initiation, and transaction mutation;
- restricted users can still read listings;
- admin statistics aggregate correctly for listings, transactions, purchases, messages, reports, warnings, and status;
- user-management controls submit the correct moderation payloads;
- the banned modal renders the legacy-inspired content and remains accessible;
- existing admin, listing, messaging, and transaction tests continue to pass.

The completion gate is the repository’s applicable local checks from `camflea-frontend/` plus Supabase migration validation/tests available in the repository. No completion claim is made until fresh verification output is available.

## Implementation boundaries

Expected changes are limited to:

- a new Supabase migration and regenerated/updated database types;
- admin server-action schemas and RPC adapters;
- account-status loading and banned/restricted UI in the frontend shell;
- admin user-management controls and per-user statistics presentation;
- focused tests and any required test fixtures;
- this specification and the implementation plan.

The legacy tree remains read-only.
