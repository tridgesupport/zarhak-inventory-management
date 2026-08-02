# Webapp vs. AppSheet — Gap Analysis

Cross-check of the current Next.js webapp (`src/app/(dashboard)/**`) against the AppSheet audit (`docs/appsheet-audit-findings.md`). Built entirely by reading both sides — no further AppSheet access needed. Ranked by how much it likely matches the user's original complaint ("tables/views not there," "buttons to approve/generate formats not there," "each row should be editable and searchable, dropdown filters for all columns").

## 1. The universal gap: no search, no filters, no inline edit, anywhere

This is the single biggest, most cross-cutting finding. Checked every list page in the app:

- **Zero pages have a search box.** AppSheet's table views (confirmed live: Purchase Orders Summary View) all have a working substring search across visible columns for free.
- **Zero pages have per-column dropdown filters or sortable headers.** The only "filtering" in the webapp is server-rendered status tabs (`?status=`, `?filter=`) — a fixed small set of preset views, not an open filter panel.
- **Only one page in the entire app has an inline-editable row** — `/masters/users` (role dropdown + Save). Every other list either links out to a separate detail/edit page, or embeds one single-purpose form per row (e.g. inward's unload form). AppSheet's tables support a genuine inline "pencil" edit mode across all cells (confirmed on PO Item Details).

**This one gap explains most of the "AppSheet does more than the webapp" feeling** — it's not really about missing entities, it's that every table in the webapp is a static, unfiltered, non-editable grid. Fixing this once, well, as a shared table component (search + column filters + optional inline edit) and reusing it across Purchase Orders, Inward, Master Stock, Cutting/Slitting/Trading, and Dispatch would likely do more for "feels like parity" than any single feature below.

## 2. Dispatch creation — the biggest structural/workflow gap

AppSheet implements Dispatch creation as a stateful 3-step wizard: pick finished-goods rows (from any of Cutting/Slitting/Trading) → fill buyer/consignee/vehicle/DO details on a scratch row → confirm, which fans out into Dispatch Summary rows and assigns the DO number.

The webapp instead has **three separate, single-submit inline forms**, one embedded in each of `/production/finished-goods/cutting`, `/production/finished-goods/slitting`, and `/production/trading/[id]` — each calling its own action (`dispatchCuttingBundle` / `dispatchSlittingProduction` / `dispatchTradingRow`). Consequences:
- No way to combine items from cutting + slitting + trading into **one DO number** in a single guided flow — you'd have to dispatch each source separately and hope the DO numbers line up.
- No shared "in-progress dispatch" staging area — you either commit a dispatch row immediately per item, or don't.
- Buyer/Consignee fields are inconsistent across the three forms (e.g. the slitting FG form has no Consignee field at all, unlike cutting's).

**Recommendation:** build a real `/dispatch/new` flow — pick a DO number (or auto-assign), select any mix of eligible finished-goods rows across all three production paths, fill shared buyer/consignee/transporter fields once, confirm. This is the one place a genuine multi-step wizard (matching AppSheet's UX) is worth building, rather than a single form.

## 3. Missing/incomplete views

| AppSheet view | Webapp status |
|---|---|
| Daily Cutting Order Summary / Daily Dispatch Summary (today's queue) | **Missing.** No page filters by `productionPlanDate = today` or any date range anywhere — only status-enum tabs exist. |
| Sold Items grouped by Sales PO Number | Partially covered — Master Stock has a "Sold" status tab, but not grouped by Sales PO Number. |
| Scrap Material Screen | **Missing as a page.** Only exists as two checkboxes ("Include XX (reject)"/"Include YY (scrap)") on the Cutting bundle-creation form — no dedicated listing/disposition workflow for rejected or scrap material. |
| Master Stock Offered / Offered+Available combined view | Covered by existing status tabs (Offered tab exists); a combined "Offered+Available" view doesn't exist but is a minor convenience, not a hard gap. |
| Update Review By (Inward reviewer approval) | **Already implemented** — `markReviewed` action gated to a `REVIEWER` role, separate from `STORES` unload. No gap here, contrary to first guess. |
| PO Report / Bundle Slip / Coil Label / Slitting Instruction / Packing List PDFs | **Already implemented**, all as on-demand `/api/pdf/*` GET routes. Good parity. |
| Cutting-specific "Sorting PDF" / "Coil Order PDF" / "Pallet PDF" (AppSheet has 4 distinct PDFs per cutting order: Production, Sorting, Coil Order, Pallet) | Webapp only generates Bundle Slip + Coil Label for cutting. The other 3 report formats aren't built — worth checking with the user whether these are actually used/needed or were print-layout artifacts specific to AppSheet's rendering mechanism. |
| Production Date Selector (dedicated step) | Implemented as a plain date input inside the planning form — functionally fine, just not a separate guided step. Non-issue. |

## 4. Status/enum reconciliation needed

- **`POStatus`**: webapp has `OPEN/CLOSED/CANCELLED`; AppSheet has `Open/In Process/Closed`. Webapp is also missing the *behavior* — `POStatus` is never changed anywhere in the app code (no close/cancel action exists at all; every PO silently stays `OPEN` forever). Needs both a schema value (`IN_PROCESS`) and an actual status-change action + button.
- **`ItemStatus`**: webapp has `PENDING/MATCHED/RECEIVED`; AppSheet has `pending/open/closed`. Also appears to be unused by any mutation in the current app (no code sets it to MATCHED or RECEIVED) — needs a decision on whether to keep, rename, or wire it up.
- **`SlittingProductionStatus`**: webapp has `PENDING/COMPLETED` only; AppSheet has `Order/In Process/Completed` — missing the middle "in process" state.
- **`DispatchSummary.dispatchStatus`**: a plain unenforced string defaulting to `"Pending"`, never updated by any code path — effectively dead. Decide whether to enforce it (e.g. Pending → Dispatched → Delivered) or drop it.
- **`StatusHistory`** audit log only ever gets written for Master Stock transitions — Cutting/Slitting/Trading/Dispatch status changes have no audit trail. Worth extending if traceability matters for the business (likely yes, given this is the system of record for a manufacturing operation).

## 5. Things that already match well (no action needed)

- Split workflow: webapp's "10 blank quantity inputs, one submit" pattern on Master Stock / Cutting / Slitting / Trading split pages matches AppSheet's split UX closely.
- Master Stock → Cutting/Slitting/Trading auto-routing on Sold transition (`routeToProductionPath`) matches AppSheet's `transitionMasterStock` bot logic.
- Item Details / Inward being CSV-only for bulk creation matches AppSheet exactly (both apps lack a manual "add one row" form there by design).
- Inward reviewer-approval (two distinct roles: STORES unloads, REVIEWER approves into Master Stock) is real and correctly gated.

## 6. Suggested priority order

1. **Shared searchable/filterable table component**, rolled out to Purchase Orders, Inward, Master Stock, Cutting/Slitting/Trading lists, and Dispatch — highest leverage, fixes the most universally-felt gap.
2. **Dispatch creation wizard** (`/dispatch/new`) replacing the three scattered inline forms — the one place a real multi-step flow is worth building.
3. **PO status lifecycle** (In Process value + close/cancel action + button) — currently a complete no-op in production use.
4. **Daily/date-filtered production & dispatch queues** — if the business actually uses "today's plan" as a real daily ritual (worth confirming with the user before building).
5. Enum reconciliation (`ItemStatus`, `SlittingProductionStatus`, `DispatchSummary.dispatchStatus`) — lower urgency, mostly cleanup, but worth deciding intentionally rather than leaving dead code.
6. Scrap Material screen and the extra Cutting PDF formats (Sorting/Coil Order/Pallet) — confirm with the user whether these are actually needed day-to-day before investing in them.
