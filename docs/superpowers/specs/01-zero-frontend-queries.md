# PRD: Zero React Frontend Queries

**Status:** Draft  
**Date:** 2026-11-14  
**Version:** 1.0  
**Goal:** Remove ALL direct Supabase queries from React frontend components

---

## Executive Summary

This PRD documents a complete audit of the CamFlea React frontend codebase to identify all database queries and establish a comprehensive migration plan to move them entirely into Supabase Edge Functions (database-side RPC functions).

### Why This Matters

1. **Security:** Frontend queries expose database structure and risk RLS bypass
2. **Performance:** Edge Functions provide caching, query optimization, and reduced latency
3. **Maintainability:** Centralized data access logic enables consistent error handling and validation
4. **Compliance:** RLS policies are easier to audit when queries are centralized

---

## Current State Audit

### Methodology

1. Searched entire `camflea-frontend/` directory for Supabase query methods
2. Identified patterns: `from()`, `rpc()`, `select()`, `insert()`, `update()`, `delete()`
3. Categorized queries by use case and user flow
4. Documented all direct `supabase.*` calls in TypeScript/TSX files

### Search Results Summary

| Category | Files with Queries | Query Count |
|----------|-------------------|-------------|
| Browse/Discovery | 2 | 6 |
| Listing Detail | 2 | 4 |
| Messages | 3 | 8 |
| Profile Management | 3 | 4 |
| Admin Dashboard | 3 | 7 |
| Listings (CRUD) | 2 | 7 |
| **Total** | **15** | **36+** |

---

## Query Inventory by Component

### 1. Browse Page (`src/routes/browse.tsx`, `src/features/browse/browse-page.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `browse.tsx` | `from("marketplace_listings").select(...)` | Load listings for browse view |
| `browse.tsx` | `from("student_profiles").select(...)` | Load seller profiles |
| `browse-page.tsx` | (via `loadListings` prop) | Delegated to parent |

**Queries Found:** 2 direct queries per browse page load

---

### 2. Listing Detail Page (`src/routes/listing.$listingId.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `listing.$listingId.tsx` | `from("marketplace_listings").select(...)` | Load single listing |
| `listing.$listingId.tsx` | `from("student_profiles").select(...)` | Load seller profile |

**Queries Found:** 2 direct queries per listing view

---

### 3. Message System (`src/features/messages/`)

| File | Query | Purpose |
|------|-------|---------|
| `message-page.tsx` | `from("student_profiles").select(...)` | Load profile names |
| `message-page.tsx` | `from("marketplace_listings").select(...)` | Load listing titles |
| `messages.server.ts` | `from("marketplace_messages").select(...)` | List conversations |
| `messages.server.ts` | `from("marketplace_messages").select(...)` | List thread messages |
| `messages.server.ts` | `from("marketplace_listings").select(...)` | Verify listing ownership |
| `messages.server.ts` | `rpc("marketplace_send_message")` | Send message (edge) |
| `messages.server.ts` | `rpc("marketplace_mark_thread_read")` | Mark as read (edge) |

**Queries Found:** 5 direct + 2 RPC (already using edge for writes)

---

### 4. Profile Management (`src/server/profile.ts`, `src/server/profile.server.ts`)

| File | Query | Purpose |
|------|-------|---------|
| `profile.ts` | `from("student_profiles").update(...)` | Update user profile |

**Queries Found:** 1 direct update per profile save

---

### 5. Listing Creation/Editing (`src/features/listings/listing-actions.ts`)

| File | Query | Purpose |
|------|-------|---------|
| `listing-actions.ts` | `from("marketplace_listings").insert(...)` | Create listing |
| `listing-actions.ts` | `from("marketplace_listings").update(...)` | Attach photos |
| `listing-actions.ts` | `from("marketplace_listing_media").insert(...)` | Insert media metadata |
| `listing-actions.ts` | `from("marketplace_listings").update(...)` | Update listing |
| `listing-actions.ts` | `from("marketplace_listings").delete(...)` | Delete listing |

**Queries Found:** 5 direct operations per listing lifecycle

---

### 6. Admin Dashboard (`src/features/admin/`)

| File | Query | Purpose |
|------|-------|---------|
| `admin-actions.server.ts` | `rpc("has_role")` | Verify admin access |
| `admin-actions.server.ts` | `rpc("admin_list_student_profiles")` | List users (edge) |
| `admin-actions.server.ts` | `from("marketplace_listings").select(...)` | List listings (direct) |
| `admin-actions.server.ts` | `from("marketplace_transactions").select(...)` | List transactions (direct) |
| `admin-actions.server.ts` | `from("marketplace_reports").select(...)` | List reports (direct) |
| `report-actions.server.ts` | `rpc("has_role")` | Verify staff access |
| `report-actions.server.ts` | `from("marketplace_reports").select(...)` | List reports for queue |

**Queries Found:** 2 direct + 1 RPC for reports (edge exists for writes)

---

### 7. Shell Header (`src/components/camflea-page-shell.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `camflea-page-shell.tsx` | `supabase.auth.getUser()` | Get current user |
| `camflea-page-shell.tsx` | `from("student_profiles").select(...)` | Load user profile |
| `camflea-page-shell.tsx` | `from("marketplace_notifications").select(...)` | Get unread count |
| `camflea-page-shell.tsx` | `from("user_roles").select(...)` | Check admin/mod roles |

**Queries Found:** 3 direct queries per page load (plus auth)

---

### 8. CamFlea App (`src/components/camflea-app.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `camflea-app.tsx` | `from("marketplace_listings").select(...)` | Load recent listings |
| `camflea-app.tsx` | `from("student_profiles").select(...)` | Load user profile |
| `camflea-app.tsx` | `from("marketplace_transactions").select(...)` | Load user transactions |
| `camflea-app.tsx` | `from("marketplace_notifications").select(...)` | Load notifications |
| `camflea-app.tsx` | `from("marketplace_messages").select(...)` | Load messages |
| `camflea-app.tsx` | `from("student_profiles").select(...)` | Load linked profiles |
| `camflea-app.tsx` | `from("marketplace_messages").insert(...)` | Send message (direct) |
| `camflea-app.tsx` | `from("marketplace_reports").insert(...)` | Report listing (direct) |

**Queries Found:** 8 direct queries (mix of reads and writes)

---

### 9. Notifications (`src/routes/notifications.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `notifications.tsx` | (via `CamFleaApp`) | Delegated to main app |

**Queries Found:** 0 (uses parent component)

---

### 10. Transactions (`src/routes/transactions.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `transactions.tsx` | (via `CamFleaApp`) | Delegated to main app |

**Queries Found:** 0 (uses parent component)

---

### 11. Profile (`src/routes/profile.tsx`)

| File | Query | Purpose |
|------|-------|---------|
| `profile.tsx` | (via `CamFleaApp`) | Delegated to main app |

**Queries Found:** 0 (uses parent component)

---

## Database Tables Queried

| Table | Selects | Inserts | Updates | Deletes | Notes |
|-------|---------|---------|---------|---------|-------|
| `marketplace_listings` | 8 | 3 | 2 | 1 | Core entity |
| `marketplace_messages` | 5 | 1 | 0 | 0 | Chat system |
| `marketplace_transactions` | 2 | 0 | 0 | 0 | Order tracking |
| `marketplace_reports` | 3 | 2 | 0 | 0 | Moderation |
| `marketplace_listing_media` | 0 | 1 | 0 | 0 | Media metadata |
| `student_profiles` | 7 | 1 | 1 | 0 | User profiles |
| `marketplace_notifications` | 3 | 0 | 0 | 0 | Alerts |
| `user_roles` | 2 | 0 | 0 | 0 | RBAC |
| `marketplace_account_status` | 0 | 0 | 0 | 0 | Not queried yet |

---

## Edge Function Status

### Already Implemented (Edge Functions)

| Function Name | Purpose | Coverage |
|---------------|---------|----------|
| `marketplace_send_message` | Send chat messages | ✅ Used |
| `marketplace_mark_thread_read` | Mark messages read | ✅ Used |
| `admin_list_student_profiles` | Admin user list | ✅ Used |
| `admin_warn_user` | Admin warning | ✅ Used |
| `admin_set_account_status` | Ban/restrict users | ✅ Used |
| `admin_set_listing_flags` | Pin/verify listings | ✅ Used |
| `admin_delete_listing` | Remove listings | ✅ Used |
| `marketplace_review_report` | Review reports | ✅ Used |
| `has_role` | Role verification | ✅ Used |

### Missing Edge Functions

| Table | Operation | Priority | Complexity |
|-------|-----------|----------|------------|
| `marketplace_listings` | Browse listings | **HIGH** | Medium |
| `marketplace_listings` | Get listing by ID | **HIGH** | Low |
| `marketplace_listings` | Create listing | **HIGH** | Medium |
| `marketplace_listings` | Update listing | **HIGH** | Medium |
| `marketplace_listings` | Delete listing | **HIGH** | Low |
| `marketplace_listings` | Attach photos | **HIGH** | Medium |
| `student_profiles` | Get profile by ID | **HIGH** | Low |
| `student_profiles` | Update profile | **HIGH** | Medium |
| `marketplace_messages` | List conversations | **HIGH** | Medium |
| `marketplace_messages` | List thread | **HIGH** | Medium |
| `marketplace_transactions` | List user transactions | **MEDIUM** | Low |
| `marketplace_transactions` | Get transaction details | **MEDIUM** | Low |
| `marketplace_reports` | List staff reports | **MEDIUM** | Medium |
| `marketplace_notifications` | Mark as read | **LOW** | Low |
| `user_roles` | Get user roles | **LOW** | Low |

---

## Migration Strategy

### Phase 1: Foundation (Week 1)

**Goal:** Establish Edge Function templates and core utilities

| Task | Deliverable |
|------|-------------|
| Create `browse_listings` Edge Function | SQL migration file |
| Create `get_listing_by_id` Edge Function | SQL migration file |
| Create `get_profile_by_id` Edge Function | SQL migration file |
| Create `update_profile` Edge Function | SQL migration file |
| Write test suite for new functions | Jest/Supabase test |

**Success Criteria:** All new Edge Functions pass unit tests

---

### Phase 2: Browse & Detail (Week 2)

**Goal:** Migrate reading core marketplace data

| Task | Deliverable |
|------|-------------|
| Update `browse.tsx` to use `browse_listings` | Backend refactored |
| Update `listing.$listingId.tsx` to use `get_listing_by_id` | Backend refactored |
| Update `camflea-page-shell.tsx` to use new profile RPC | Backend refactored |
| Update `camflea-app.tsx` browsing queries | Backend refactored |
| Update `message-page.tsx` queries | Backend refactored |

**Success Criteria:** No `from("marketplace_listings")` or `from("student_profiles")` in browse/detail flows

---

### Phase 3: Listing Management (Week 3)

**Goal:** Migrate CRUD operations for listings

| Task | Deliverable |
|------|-------------|
| Create `create_listing` Edge Function | SQL migration |
| Create `update_listing` Edge Function | SQL migration |
| Create `delete_listing` Edge Function | SQL migration |
| Create `attach_listing_photos` Edge Function | SQL migration |
| Update `listing-actions.ts` to use new RPCs | Backend refactored |
| Update `sell.tsx` to use new RPCs | Frontend refactored |

**Success Criteria:** No `from("marketplace_listings")` in create/edit/delete flows

---

### Phase 4: Messages (Week 4)

**Goal:** Complete message system migration

| Task | Deliverable |
|------|-------------|
| Create `list_conversations` Edge Function | SQL migration |
| Create `list_message_thread` Edge Function | SQL migration |
| Create `mark_thread_read` Edge Function | SQL migration |
| Update `messages.server.ts` to use RPCs | Backend refactored |
| Update `message-page.tsx` to use RPCs | Frontend refactored |

**Success Criteria:** No direct queries in message flows

---

### Phase 5: Admin Consolidation (Week 5)

**Goal:** Reduce admin dashboard queries to single RPC call

| Task | Deliverable |
|------|-------------|
| Create `admin_get_workspace_summary` Edge Function | SQL migration |
| Create `list_user_transactions` Edge Function | SQL migration |
| Create `list_user_reports` Edge Function | SQL migration |
| Update `admin-actions.server.ts` to use single RPC | Backend refactored |
| Update `report-actions.server.ts` to use RPC | Backend refactored |

**Success Criteria:** Admin dashboard loads in single RPC round trip

---

### Phase 6: Notifications & Roles (Week 6)

**Goal:** Clean up remaining infrastructure queries

| Task | Deliverable |
|------|-------------|
| Create `mark_notification_read` Edge Function | SQL migration |
| Create `get_user_roles` Edge Function | SQL migration |
| Update `camflea-page-shell.tsx` to use RPCs | Backend refactored |

**Success Criteria:** No `user_roles` or `marketplace_notifications` queries in frontend

---

## Edge Function Specification Template

```sql
CREATE OR REPLACE FUNCTION public.{function_name}({params})
RETURNS {return_type}
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  -- 1. Authorization check
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Input validation
  {validation logic}

  -- 3. Business logic with RLS enforcement
  RETURN {query results};
END;
$$;

REVOKE EXECUTE ON FUNCTION public.{function_name}({params}) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.{function_name}({params}) TO authenticated;
```

---

## Frontend Integration Pattern

### Before (Direct Query)
```typescript
const { data, error } = await supabase
  .from("marketplace_listings")
  .select("*")
  .eq("id", listingId)
  .maybeSingle();
```

### After (Edge Function)
```typescript
const { data, error } = await supabase.rpc("get_listing_by_id", {
  _listing_id: listingId
});
```

### Server Function Wrapper (Optional)
```typescript
export const getListingById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ listingId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: listing, error } = await context.supabase
      .rpc("get_listing_by_id", { _listing_id: data.listingId });
    if (error) throw new Error("Could not load listing");
    return listing;
  });
```

---

## Testing Requirements

### 1. Query Coverage Test
```typescript
test("no direct supabase queries in frontend", () => {
  // Search all .tsx files for from(), rpc() patterns
  // Ensure only rpc() calls exist for database operations
});
```

### 2. Edge Function Tests
```typescript
test("browse_listings returns paginated results", async () => {
  const result = await supabase.rpc("browse_listings", {
    _category: "textbooks",
    _limit: 10,
    _offset: 0
  });
  expect(result.length).toBeLessThanOrEqual(10);
});
```

### 3. RLS Validation Tests
```typescript
test("students cannot query other users' profiles", async () => {
  const { error } = await supabase.rpc("get_profile_by_id", {
    _user_id: otherUserId
  });
  expect(error).toBeDefined();
});
```

---

## Rollout Plan

### Week 7: Canary Deployment
- Deploy new Edge Functions
- Keep old queries as fallback (dual-write period)
- Monitor error rates and performance

### Week 8: Gradual Traffic Shift
- 10% of users → Edge Functions only
- 50% of users → Edge Functions only
- 100% of users → Edge Functions only

### Week 9: Code Cleanup
- Remove old query code from frontend
- Update documentation
- Train team on new patterns

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frontend queries | 0 | Code scan |
| Edge function coverage | 100% | Migration checklist |
| API response time | ≤200ms (p95) | APM monitoring |
| Error rate | <0.1% | Sentry/Rollbar |
| RLS bypass attempts | 0 | Database audit log |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policy misconfiguration | HIGH | Comprehensive test suite before deployment |
| Function performance degradation | MEDIUM | Query optimization, indexing |
| Frontend breaking changes | MEDIUM | Dual-write period, gradual rollout |
| Migration incomplete | LOW | Incremental approach, rollback plan |

---

## Rollback Plan

If critical issues occur:

1. Revert frontend changes to use old queries
2. Deploy previous Edge Function versions
3. Clear any cached responses
4. Monitor for 24 hours

---

## Dependencies

- [x] Supabase CLI configured (`camflea-supabase/`)
- [x] Database migrations folder ready
- [ ] Edge Function testing infrastructure
- [ ] Frontend test coverage (minimum 70%)
- [ ] APM/monitoring setup

---

## Related Documentation

- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Row Level Security: https://supabase.com/docs/guides/database/postgres/rls
- Database Views vs Functions: https://supabase.com/docs/guides/database/postgres/views

---

## Appendices

### Appendix A: Full Query Scan Results

See GitHub issue #42 for detailed line-by-line query inventory.

### Appendix B: Edge Function Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `get_` | Single record retrieval | `get_listing_by_id` |
| `list_` | Multiple records | `list_conversations` |
| `browse_` | Filtered/searched lists | `browse_listings` |
| `create_` | Insert new records | `create_listing` |
| `update_` | Modify records | `update_profile` |
| `delete_` | Remove records | `delete_listing` |
| `mark_` | Status updates | `mark_thread_read` |

### Appendix C: Migration Checklist

- [ ] All queries identified and documented
- [ ] Edge Functions created and tested
- [ ] Frontend components refactored
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Team trained on new patterns
- [ ] Monitoring configured
- [ ] Rollback procedures tested

---

**Approved by:** [Name]  
**Date:** [Date]  
**Next Review:** 2026-12-15
