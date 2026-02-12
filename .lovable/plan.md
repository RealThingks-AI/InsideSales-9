

## Fix Kanban Expand/Collapse Issues and Improvements

### 5 Issues to Fix

---

### 1. Card size changes when expanded

**File:** `src/components/DealCard.tsx` (line 89)

Remove `scale-[1.02]` and `ring-offset-2` from the expanded card styling. Keep `ring-2 ring-primary shadow-xl border-primary z-10` for a subtle highlight without resizing.

---

### 2. Change expand icon to a detail-oriented icon

**File:** `src/components/DealCard.tsx`

- Line 6: Replace `Activity` import with `PanelRightOpen`
- Line 216: Replace `<Activity>` with `<PanelRightOpen>`

---

### 3. Remove italic and normalize font sizes in details section

**File:** `src/components/DealExpandedPanel.tsx`

- Line 582: Remove `italic` from the non-clickable history entry span
- Lines 572, 587, 590, 656: Change `text-[10px]` to `text-[11px]` for serial numbers and metadata cells in both tables, ensuring consistency with the `text-[11px]` headers

---

### 4. Add collapse animation

**File:** `src/components/kanban/InlineDetailsPanel.tsx`

Apply CSS animation classes based on the `transition` prop:
- `'expanding'` applies `inline-details-entering`
- `'collapsing'` applies `inline-details-exiting`

The keyframes already exist in `src/index.css`.

---

### 5. Duplicate history entries for action item status changes

**Root cause:** When an action item is marked "Completed", two entries appear:
1. The audit log entry inserted by `handleStatusChange` (e.g., "Test Action -> Completed")
2. The completed action item mapped into history by `mergedHistory` (e.g., "Test Action - Completed")

**Fix in `src/components/DealExpandedPanel.tsx`:**

Remove the `completedAsHistory` mapping from `mergedHistory` (lines 261-268). The audit log entries from `handleStatusChange` already capture status changes with proper timestamps and user attribution. Completed action items should only appear in the "Completed" section below, not duplicated into history.

The updated `mergedHistory` will only contain `mappedLogs` (manual entries and status change audit logs), eliminating duplicates.

---

### Technical Summary

| File | Changes |
|------|---------|
| `src/components/DealCard.tsx` | Remove `scale-[1.02]`, `ring-offset-2`; replace `Activity` with `PanelRightOpen` |
| `src/components/kanban/InlineDetailsPanel.tsx` | Apply animation classes based on `transition` prop |
| `src/components/DealExpandedPanel.tsx` | Remove `italic`; normalize `text-[10px]` to `text-[11px]`; remove `completedAsHistory` from `mergedHistory` |

