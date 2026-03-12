

# Audit Logs — Deep Audit: Missing Action Items Logging & All Bugs

## Root Cause: Action Items Not Logged

The **standalone Action Items page** (`src/pages/ActionItems.tsx`) uses `useActionItems` hook for all CRUD operations. This hook performs Supabase mutations directly but **never calls `useCRUDAudit`**. Zero audit logging occurs for:

- Creating action items from the Action Items page
- Updating action items (status, priority, assignee, due date, title)
- Deleting action items
- Bulk status changes
- Bulk deletes

By contrast, the **DealActionItemsModal** and **LeadActionItemsModal** (accessed from deal/lead cards) DO call `logCreate`, `logUpdate`, `logDelete` from `useCRUDAudit`. So action items created/edited from deal cards ARE logged, but those from the standalone page are NOT.

This is why Deepak Dongare's action item changes don't appear in logs.

---

## All Bugs & Improvements Found

### Bug 1 — No audit logging for Action Items page CRUD (CRITICAL)

**Cause:** `useActionItems.tsx` has no `useCRUDAudit` integration. The `createMutation`, `updateMutation`, `deleteMutation`, `bulkUpdateStatusMutation`, and `bulkDeleteMutation` all skip audit logging entirely.

**Fix:** Add `useCRUDAudit` calls in `onSuccess` callbacks of each mutation in `useActionItems.tsx`. Log `logCreate('action_items', ...)`, `logUpdate('action_items', ...)`, `logDelete('action_items', ...)`, `logBulkUpdate('action_items', ...)`, `logBulkDelete('action_items', ...)`.

Since `useCRUDAudit` is a hook, it cannot be called inside `useActionItems` directly (hooks can't be nested). Instead, we add audit logging at the **page level** (`ActionItems.tsx`) by wrapping the mutation calls (`handleSave`, `confirmDelete`, `handleStatusChange`, `handlePriorityChange`, `handleAssignedToChange`, `handleDueDateChange`, `handleBulkComplete`, `handleBulkDelete`) with `useCRUDAudit` calls after successful operations.

---

### Bug 2 — "Update" summary shows blank text for some entries (MEDIUM)

**Cause:** In `generateSummary()` (auditLogUtils.ts line 117-128), when `field_changes` exists but is an empty object `{}`, the summary falls through to `Updated ${module} "${name}"`. But some UPDATE logs have `field_changes: {}` AND no `deal_name`/`record_name` in `old_data` because `getRecordName` checks `old_data.deal_name` but the deal's name field is `project_name` in some cases.

Looking at the query results, the `old_data` contains both `deal_name` and `project_name`. The `getRecordName` function checks `d.old_data.deal_name` which works, but when `field_changes` is `{}`, the summary shows just "Update" because the filtered changes are empty AND the record name IS found, producing `Updated "REFU - Board Migration" — 0 fields changed` which then falls to the generic `Updated Deals "name"`.

Actually, the real issue is the summary shows just "Update" in the screenshot. This happens when `field_changes` is empty AND no meaningful name is found — the summary returns `Updated record`.

**Fix:** When `field_changes` is empty but `updated_fields` exists in details, count those fields instead. Fall back to showing what field was updated from `updated_fields` keys.

---

### Bug 3 — `getRecordName` doesn't handle `action_items` fields (MINOR)

**Cause:** `getRecordName` in auditLogUtils.ts checks for `deal_name`, `lead_name`, `contact_name`, `account_name`, `title`. The `title` check will work for action items. This is fine.

No fix needed.

---

### Bug 4 — Audit Log stats don't show "Action Items" in module badges (MINOR)

**Cause:** The stats badges at the top show module counts from `getModuleName()`. Since action items logs use `resource_type: 'action_items'` and `details.module: 'Action_items'`, the module name rendering capitalizes correctly via the `getReadableResourceType` map which includes `action_items: 'Action Items'`. This should work once logging is added.

No fix needed.

---

### Bug 5 — Filter category "Record Changes" doesn't have a filter for Action Items specifically (MINOR UX)

**Cause:** The category dropdown has: All, Record Changes, Activities, Authentication, User Management, Export. There's no way to filter specifically by "Action Items" module. Users must use the search box to find action item logs.

**Fix:** Add a module-based filter option or allow the search to filter by module name. A simple improvement: add `action_items` as a filter category option, OR add a module dropdown filter alongside the category filter.

---

### Improvement 1 — Add a "Module" filter dropdown to Audit Logs (MEDIUM)

Currently users can only filter by category type (Record Changes, Activities, etc.) but not by module (Deals, Contacts, Action Items). Adding a module filter dropdown would let users quickly see all logs for a specific module.

---

### Improvement 2 — Empty field_changes UPDATE logs show poor summaries (MEDIUM)

Some UPDATE logs have `field_changes: {}` but `updated_fields` contains the actual changed field. The `generateSummary` function should fall back to reading `updated_fields` keys when `field_changes` is empty.

---

## Implementation Plan

### File 1: `src/pages/ActionItems.tsx`
- Import `useCRUDAudit`
- Add audit logging to `handleSave` (log create or update), `confirmDelete`, `handleStatusChange`, `handlePriorityChange`, `handleAssignedToChange`, `handleDueDateChange`, `handleBulkComplete`, `handleBulkDelete`
- For updates, pass old data from `actionItems` array to capture field changes

### File 2: `src/hooks/useActionItems.tsx`
- No changes needed — audit logging happens at the page level where the hook is consumed

### File 3: `src/components/settings/audit/auditLogUtils.ts`
- Fix `generateSummary` UPDATE case: when `field_changes` is empty, fall back to `updated_fields` keys to show what changed
- Add `project_name` to `getRecordName` checks (some deals use `project_name` not `deal_name`)

### File 4: `src/components/settings/AuditLogsSettings.tsx`
- Add a module filter dropdown next to the category filter
- Add `action_items` to `canRevert` to allow reverting action item changes

### File 5: `src/components/settings/audit/AuditLogFilters.tsx`
- Add module filter UI (a second dropdown for "All Modules", "Deals", "Contacts", "Leads", "Action Items", "Accounts")

---

## Summary

| # | Issue | Type | File(s) |
|---|-------|------|---------|
| 1 | Action Items page has zero audit logging | Bug (CRITICAL) | `ActionItems.tsx` |
| 2 | UPDATE summaries show blank "Update" text | Bug (MEDIUM) | `auditLogUtils.ts` |
| 3 | No module-level filter in Audit Logs | Improvement | `AuditLogFilters.tsx`, `AuditLogsSettings.tsx`, `auditLogUtils.ts` |

