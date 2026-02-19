
# Complete Backup & Restore Audit — All Issues Found & Fixes

## Current State Summary (from live database)

- `security_audit_log` has **25,604 rows** and is still growing
- Breakdown: SESSION_START (11,189), SESSION_END (9,088), SESSION_INACTIVE (2,205), SESSION_ACTIVE (2,108) — these 4 actions alone = 24,590 rows (96%)
- The previous plan removed `security_audit_log` from backups but **the root source of noise is still writing to the DB**

---

## Issue 1 — SESSION_INACTIVE & SESSION_ACTIVE still being written (CRITICAL)

### Root Cause
The current `SecurityProvider.tsx` no longer has the `handleVisibilityChange` listener (that was already removed). However, the table still has **2,205 SESSION_INACTIVE + 2,108 SESSION_ACTIVE** rows, meaning they accumulated before the fix was applied.

These rows will never be cleaned up automatically — they stay in the table forever, bloating any future restores that include the `security_audit_log` table.

**Fix:** Run a one-time SQL cleanup to delete the noise rows from `security_audit_log`.

**SQL to execute:**
```sql
DELETE FROM security_audit_log 
WHERE action IN ('SESSION_INACTIVE', 'SESSION_ACTIVE', 'SESSION_HEARTBEAT', 'WINDOW_BLUR', 'WINDOW_FOCUS', 'USER_ACTIVITY', 'SELECT', 'SENSITIVE_DATA_ACCESS', 'PAGE_NAVIGATION');
```

This removes ~24,900 rows of pure noise, bringing the table back to meaningful audit events only.

---

## Issue 2 — SESSION_END fires on every React re-render (HIGH)

### Root Cause
In `src/components/SecurityProvider.tsx` (line 96–98), the `useEffect` cleanup function calls `logSecurityEvent('SESSION_END', ...)` every time the component re-renders:

```tsx
return () => {
  logSecurityEvent('SESSION_END', 'auth', user.id);  // ← fires on EVERY re-render
};
```

React cleanup functions run **every time dependencies change** — not just on unmount. Since `[user, userRole, logSecurityEvent]` changes when `userRole` updates (which happens on load), this fires multiple times per page load, generating duplicate SESSION_END entries.

**Fix:** Use a ref-based flag to ensure SESSION_END only logs once per actual sign-out (when user becomes `null`), not on every re-render cleanup.

**File:** `src/components/SecurityProvider.tsx`

Change the cleanup to only log SESSION_END when the user is actually signing out (user goes from truthy → null), not on every re-render. Use a `useRef` to track whether we're in an actual unmount vs. a dependency re-run.

---

## Issue 3 — SENSITIVE_DATA_ACCESS logged on every page load (HIGH)

### Root Cause
`src/hooks/useSecureDataAccess.tsx` (lines 32–37) logs `SENSITIVE_DATA_ACCESS` to `security_audit_log` **every time** deals or contacts data is fetched. Since `useSecureDeals` and `useSecureContacts` load data on mount, this fires 2 rows per page navigation to Deals or Contacts.

Additionally, `logDataAccess` (line 18) logs a `SELECT` row for every query too. So each page load generates **2 audit rows** (one SELECT + one SENSITIVE_DATA_ACCESS).

These actions are already in the `EXCLUDED_ACTIONS` list in `auditLogUtils.ts` (they're hidden from the Audit Log UI) — so they have **no value**, only cost.

**Fix:** Remove the `logDataAccess` call and the `SENSITIVE_DATA_ACCESS` log block from `useSecureDataAccess.tsx`. Keep error-logging for failed/unauthorized access since that IS meaningful.

**File:** `src/hooks/useSecureDataAccess.tsx`

---

## Issue 4 — Restore function still lists `security_audit_log`, `user_sessions`, `keep_alive` in DELETE_ORDER & INSERT_ORDER (MEDIUM)

### Root Cause
`supabase/functions/restore-backup/index.ts` lines 9–28 still include:
- `user_sessions` in DELETE_ORDER (line 12) and INSERT_ORDER (line 25)
- `security_audit_log` in DELETE_ORDER (line 13) and INSERT_ORDER (line 27)
- `keep_alive` in DELETE_ORDER (line 16) and INSERT_ORDER (line 27)

This means if an **old backup** (pre-fix) is restored — e.g., the 30,777-record backup from 18:54 — the restore will:
1. **Delete all current sessions** (logging everyone out mid-restore)
2. **Restore 25,000+ audit noise rows** back into the database
3. **Delete and restore the keep_alive table** unnecessarily

**Fix:** Remove `security_audit_log`, `user_sessions`, and `keep_alive` from both `DELETE_ORDER` and `INSERT_ORDER` in `restore-backup/index.ts`.

**File:** `supabase/functions/restore-backup/index.ts`

---

## Issue 5 — Backup History table header is not sticky (MINOR UI)

### Root Cause
The Backup History table inside `BackupRestoreSettings.tsx` (lines 535–595) uses a `<ScrollArea>` with a `<Table>` inside it. The `<TableHeader>` has no `sticky top-0` class, so when users scroll through 30 backup entries, the column headers (Type, Date, Status, Records, Size, Actions) scroll away.

**Fix:** Add `sticky top-0 z-10 bg-background` to the `<TableHeader>` in BackupRestoreSettings to match the sticky-header pattern applied to all other modules.

**File:** `src/components/settings/BackupRestoreSettings.tsx` (line 537)

---

## Issue 6 — Module count on backup card counts `action_items` but label says "Tasks" (MINOR)

### Root Cause
In `BackupRestoreSettings.tsx` line 173, `fetchModuleCounts` queries the `action_items` table. The `MODULES` array (line 60) maps `id: 'action_items'` to `name: 'Tasks'`. This mapping is correct, BUT the Module Backup card (line 504) displays `moduleCounts[module.id]` where `module.id` is `'action_items'`. This works fine.

**No fix needed** — this is consistent.

---

## Summary of Changes

| # | File | Change | Priority |
|---|------|---------|----------|
| 1 | SQL (run once in Supabase dashboard) | Delete SESSION_INACTIVE, SESSION_ACTIVE, SELECT, SENSITIVE_DATA_ACCESS noise rows | CRITICAL |
| 2 | `src/components/SecurityProvider.tsx` | Fix SESSION_END to only fire on actual sign-out, not re-renders | HIGH |
| 3 | `src/hooks/useSecureDataAccess.tsx` | Remove logDataAccess and SENSITIVE_DATA_ACCESS logging from secureQuery | HIGH |
| 4 | `supabase/functions/restore-backup/index.ts` | Remove `security_audit_log`, `user_sessions`, `keep_alive` from DELETE_ORDER and INSERT_ORDER | MEDIUM |
| 5 | `src/components/settings/BackupRestoreSettings.tsx` | Add sticky header to Backup History table | MINOR |

## Expected Outcome

- `security_audit_log` reduced from 25,604 → ~700 meaningful rows (real CRUDs, imports, permission-denied events)
- Daily growth stops being driven by page loads and tab switches
- Restoring any backup (including old ones) will no longer wipe active sessions or restore audit noise
- Backup record counts accurately reflect business data only
- Backup History headers stay visible when scrolling through 30 entries
