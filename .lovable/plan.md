

## Comprehensive Backup, Restore & Audit Log Fix

### Problem Summary

The `security_audit_log` table has **26,152 rows**, with **25,135 being session noise**:
- SESSION_START: 11,433 (fires on every re-render due to missing dedup guard)
- SESSION_END: 9,249 (fires in useEffect cleanup on every re-render)
- SESSION_INACTIVE: 2,275 (fires on every tab switch)
- SESSION_ACTIVE: 2,178 (fires on every tab switch)
- Actual useful CRUD logs: ~1,000

The backup system includes operational tables (`user_sessions`, `keep_alive`) inflating record counts, the `leads` module is listed separately despite being merged into Deals, restore logic has ID-type bugs, and the scheduled backup edge function does not exist.

---

### Changes by File

#### 1. `src/components/SecurityProvider.tsx` -- Stop audit log noise

**Problem:** SESSION_START fires on every re-render (no dedup), SESSION_END fires in cleanup on every re-render, and SESSION_ACTIVE/SESSION_INACTIVE fire on every tab switch. This created 25,000+ useless rows.

**Fix:**
- Add a `useRef` guard so SESSION_START only fires once per user session
- Remove the visibility change listener entirely (SESSION_ACTIVE/SESSION_INACTIVE are not actionable)
- Remove SESSION_END from the cleanup (it fires on re-renders, not actual logouts)
- Use the reference file pattern with `usePermissions()` for role instead of a separate fetch

#### 2. `src/hooks/useSecurityAudit.tsx` -- Fix redundant auth calls

**Problem:** Every call to `logSecurityEvent` makes a network call to `supabase.auth.getUser()` before logging. This is wasteful since the caller already has the user context.

**Fix:** Use the cached `user` from `useAuth()` hook (as the reference file does) instead of calling `supabase.auth.getUser()` on every log. Use fire-and-forget pattern (no await on the RPC call) to avoid blocking the UI.

#### 3. `supabase/functions/create-backup/index.ts` -- Fix backup scope

**Problem:**
- `BACKUP_TABLES` includes `user_sessions` and `keep_alive` (operational/ephemeral)
- `MODULE_TABLES.deals` does not include `leads` and `lead_action_items` (Leads merged into Deals)
- No `notifications` standalone module entry

**Fix:**
- Remove `user_sessions` and `keep_alive` from `BACKUP_TABLES`
- Update `MODULE_TABLES`:

```text
contacts: ['contacts']
accounts: ['accounts']
deals: ['deals', 'deal_action_items', 'leads', 'lead_action_items']
action_items: ['action_items']
notifications: ['notifications', 'notification_preferences']
```

#### 4. `supabase/functions/restore-backup/index.ts` -- Fix restore logic

**Problem:**
- Delete query uses `.neq('id', '00000000-0000-0000-0000-000000000000')` which crashes for tables with non-UUID IDs (e.g., `keep_alive` uses bigint)
- `profiles` and `user_roles` are missing from `DELETE_ORDER` and `INSERT_ORDER` but are in `BACKUP_TABLES`
- `user_sessions` and `keep_alive` still in the order lists

**Fix:**
- Change delete approach to `.delete().not('id', 'is', null)` (works for any column type)
- Add `profiles` and `user_roles` to correct positions
- Remove `user_sessions` and `keep_alive` from order lists

Updated orders:

```text
DELETE_ORDER:
  deal_action_items, lead_action_items, action_items,
  notifications, notification_preferences, saved_filters,
  column_preferences, dashboard_preferences,
  deals, contacts, leads, accounts,
  user_preferences, yearly_revenue_targets, page_permissions,
  user_roles, profiles

INSERT_ORDER:
  profiles, user_roles,
  accounts, leads, contacts, deals,
  lead_action_items, deal_action_items, action_items,
  notifications, notification_preferences, saved_filters,
  column_preferences, dashboard_preferences,
  user_preferences, yearly_revenue_targets, page_permissions
```

#### 5. `supabase/functions/scheduled-backup/index.ts` -- Create new edge function

**Problem:** No edge function exists to execute scheduled backups. The UI saves schedule config to `backup_schedules` but nothing triggers actual backups.

**Fix:** Create new function that:
- Reads `backup_schedules` for enabled schedules where `next_run_at <= now()`
- Uses the same `BACKUP_TABLES` and `MODULE_TABLES` as `create-backup`
- Respects `backup_scope` (full/module) and `backup_module` columns
- Updates `last_run_at` and computes `next_run_at` after execution
- Enforces the 30-backup limit

#### 6. `supabase/config.toml` -- Register new function

Add:
```toml
[functions.scheduled-backup]
verify_jwt = false
```

#### 7. `src/components/settings/BackupRestoreSettings.tsx` -- UI fixes

**7a. Legacy label fix:**
Add a fallback map for old backups with `module_name: 'leads'`:

```typescript
const LEGACY_MODULE_LABELS: Record<string, string> = {
  leads: 'Leads (Legacy)',
};
```

Update `getBackupLabel` to use it.

**7b. Remove delete button:**
- Remove the delete button from each backup row (lines 516-527)
- Remove `handleDeleteClick`, `handleDeleteConfirm` functions
- Remove delete confirmation dialog (lines 585-605)
- Remove `deleting`, `showDeleteDialog` state
- Remove `Trash2` from imports
- The edge function's 30-backup limit handles cleanup automatically

**7c. Increase scroll height:**
Change `max-h-[400px]` to `max-h-[600px]` on line 466.

**7d. Add backup scope selector to Scheduled Backups:**
Add a scope dropdown (Full System / Contacts / Accounts / Deals / Action Items / Notifications) that saves to `backup_scope` and `backup_module` in `backup_schedules`. When "Full System" is selected: `backup_scope = 'full'`, `backup_module = null`. When a module is selected: `backup_scope = 'module'`, `backup_module = module_id`.

**7e. Add frequency selector:**
The schedule UI currently only shows time but not frequency. Add a frequency dropdown (Daily / Every 2 Days / Weekly).

#### 8. Cron Job Setup (SQL)

After the scheduled-backup edge function is deployed, set up `pg_cron` to invoke it every hour:

```sql
SELECT cron.schedule(
  'scheduled-backup-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://nreslricievaamrwfrlx.supabase.co/functions/v1/scheduled-backup',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

---

### Expected Impact

| Metric | Before | After |
|---|---|---|
| Audit log growth/day | ~100+ session noise rows | Only meaningful CRUD events |
| Full backup records | ~31,000+ | ~5,200 (no audit log, no operational tables) |
| Deals module backup | Excludes leads data | Includes leads + lead_action_items |
| Scheduled backups | Non-functional (no edge function) | Fully working with scope selection |
| Restore on mixed ID types | Crashes on bigint tables | Works universally |

