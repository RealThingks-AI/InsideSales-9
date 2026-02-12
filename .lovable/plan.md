

# Fix 3 Remaining Kanban Issues

## 1. Card Size Stability When Expanded

**File:** `src/components/DealCard.tsx` (line 83, 89)

The card currently always has `hover:shadow-lg hover:-translate-y-0.5` and the expanded state adds `shadow-xl`. These cause visual size changes on hover and expansion.

**Changes:**
- Line 83: Make hover effects conditional -- only apply `hover:shadow-lg hover:-translate-y-0.5` when NOT expanded
- Line 89: Change expanded styling from `shadow-xl` to `shadow-md`

The className logic becomes:
- Base: `deal-card group cursor-pointer transition-all duration-300 border-l-3 border-border/40`
- Add `hover:shadow-lg hover:-translate-y-0.5` only when `!isExpanded`
- Expanded: `ring-2 ring-primary shadow-md border-primary z-10` (no shadow-xl, no hover transforms)

## 2. Replace Expand Icon with Info Icon

**File:** `src/components/DealCard.tsx`

- Line 6: Replace `PanelRightOpen` import with `Info` from lucide-react
- Line 214: Change title from `"Expand details"` to `"View details"`
- Line 216: Replace `<PanelRightOpen>` with `<Info>`

## 3. Smooth Scroll-Back on Collapse

**File:** `src/components/KanbanBoard.tsx` (lines 96-113)

Currently on collapse completion, the scroll position is restored instantly via `scrollTop`/`scrollLeft` assignment. This causes a jarring jump.

**Changes:**
- Replace the direct scroll position assignment (lines 101-103) with `scrollTo({ ..., behavior: 'smooth' })` so the view glides back to the original card position instead of jumping

**File:** `src/index.css` (lines 480-489)

Update the `inlineDetailsOut` keyframe to add a subtle scale-down for a more polished collapse feel:
- Change `transform: translateX(20px)` in the `to` state to `transform: translateX(20px) scale(0.97)`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/DealCard.tsx` | Conditional hover effects when not expanded; `shadow-md` instead of `shadow-xl`; replace `PanelRightOpen` with `Info` icon; update tooltip |
| `src/components/KanbanBoard.tsx` | Use `scrollTo({ behavior: 'smooth' })` on collapse completion instead of direct assignment |
| `src/index.css` | Add `scale(0.97)` to `inlineDetailsOut` keyframe end state |

