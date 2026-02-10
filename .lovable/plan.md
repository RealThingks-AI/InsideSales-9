

## Details Panel Updates - History and Action Items

This plan updates the `DealExpandedPanel.tsx` component with the requested changes to both the History and Action Items sections.

---

### History Section Changes

1. **Remove checkbox, add serial number** -- Replace any row selection with a "#" column showing sequential numbers (1, 2, 3...).

2. **Add color icon with text for Type** -- Instead of plain text in the Type column, show a colored (Note, Call, Meeting, Email) icon alongside the type label 

3. **Fix eye icon detail dialog** -- The detail dialog currently only shows `field_changes` parsing. For manual log entries (Note, Call, Meeting, Email), it should also display the `message`, `log_type`, and full details from the `details` JSON. Will ensure all relevant fields are shown.

4. **Log action item status updates in history** -- When an action item's status changes via `handleStatusChange`, insert an audit log entry into `security_audit_log` recording the old and new status values.

5. **Changes field full width** -- In the Changes column, remove `max-w-[200px] truncate` so the text uses the full available width, matching the action items task record style.

6. **Sticky column header on scroll** -- Add `sticky top-0 z-10` to the `TableHeader` so it stays fixed while the records scroll beneath it.

7. **Default sort by date ascending (oldest first)** -- Change the initial `historySortDirection` from `'desc'` to `'asc'` so oldest records appear at the top by default.

---

### Action Items Section Changes

1. **Remove checkbox, add serial number** -- Replace the checkbox column (and select-all logic) with a "#" column showing sequential numbers.

2. **Rename "Due Date" to "Due"** -- Change the column header text from "Due Date" to "Due".

3. **Log status updates in history** -- Same as History item 4 above; when action item status changes, write an audit log.

4. **Sticky column header on scroll** -- Add `sticky top-0 z-10` to the Action Items `TableHeader`.

5. **Default sort by Status** -- Change `actionItemSortField` initial state from `'due_date'` to `'status'` so items are sorted by status by default.

---

### Technical Details

**File modified:** `src/components/DealExpandedPanel.tsx`

**Key changes:**
- Remove `selectedActionIds`, `toggleAllActions`, `toggleActionItem`, `allActionsSelected`, `someActionsSelected` state and logic (no longer needed without checkboxes)
- Remove `Checkbox` import
- Change initial state: `historySortDirection` from `'desc'` to `'asc'`, `actionItemSortField` from `'due_date'` to `'status'`
- Add serial number column (#) to both tables using the map index
- Add colored icon(Note, Call, Meeting, Email) next to type text in history rows: `<span className={cn('w-2 h-2 rounded-full inline-block', getTypeDotColor(log.action))} />` before the label
- Remove `max-w-[200px] truncate` from Changes cell, use `whitespace-normal break-words` for full width
- Add `className="sticky top-0 z-10"` to both `<TableHeader>` elements
- Update eye icon detail dialog to show full details for manual entries (message, log_type) and all field changes for system entries
- In `handleStatusChange`, after the update call, insert an audit log entry:
  ```ts
  await supabase.from('security_audit_log').insert({
    action: 'update',
    resource_type: 'deals',
    resource_id: deal.id,
    user_id: user?.id,
    details: {
      message: `Action item status changed: ${oldStatus} -> ${status}`,
      field_changes: { status: { old: oldStatus, new: status } },
      action_item_id: id,
      action_item_title: actionItems.find(i => i.id === id)?.title
    }
  });
  ```
- Rename "Due Date" header to "Due" in action items table

