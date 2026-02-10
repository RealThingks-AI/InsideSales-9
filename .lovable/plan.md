

# Fix Details Section UX Issues

## Issue 1: "Details" Panel Header Overlapping Table Content
The panel header labeled "Details" (line 476) does not have a proper z-index, so when scrolling within the Action Items table, the sticky table header (`z-10`) visually conflicts with the panel header. The fix is to give the panel header a higher z-index (`z-20`) to ensure it always stays on top.

## Issue 2: Raw JSON in History Details Dialog
When viewing a history log entry, the "Details" section currently renders the full JSON blob using `JSON.stringify` in a `<pre>` tag. This is not readable. The fix is to replace the raw JSON with a structured, human-readable layout.

---

## Technical Changes

### File: `src/components/DealExpandedPanel.tsx`

**Fix 1 - Header z-index (line 475)**
- Add `z-20` to the panel header div so it stays above the sticky table headers

**Fix 2 - Replace raw JSON details (lines 939-953)**
Replace the raw `JSON.stringify` blocks with a helper function that renders details in a structured format:

- Create a `renderFormattedDetails` helper that:
  - Extracts key sections: module, status, operation, timestamp
  - Shows a summary card with those top-level fields
  - For `field_changes`: renders a compact table with Field / Old / New columns (reusing existing field changes table pattern)
  - For `old_data` and `updated_fields`: renders a grouped key-value list with:
    - Human-readable labels (snake_case converted to Title Case)
    - Null values shown as "--" in muted text
    - Dates formatted nicely
    - UUIDs truncated
    - Values grouped by category (Basic Info, Dates, Revenue, Status fields)
  - Hides internal fields like `id`, `created_by`, `modified_by` from the display
  - Uses existing UI components (badges, muted text, small cards)

- Replace the two `<pre>` blocks (lines 942-943 and 951-952) with calls to `renderFormattedDetails(details)`

**Result**: Instead of raw JSON, users see a clean layout like:
```
Module: Deals    Status: Success    Operation: UPDATE

Field Changes:
| Field       | Old Value              | New Value              |
|-------------|------------------------|------------------------|
| modified at | Jan 5, 2026 9:04 AM    | Feb 1, 2026 1:03 PM    |

Record Snapshot:
  Deal Name: Stella Brain
  Customer: Stellantis
  Stage: Qualified
  Budget: EUR 0
  Probability: 20%
  Lead Owner: Peter Jakobsson
  ...
```

Null fields will be hidden or shown as "--" to keep the view clean.
