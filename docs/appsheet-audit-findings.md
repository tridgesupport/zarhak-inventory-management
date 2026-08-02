# AppSheet "Zarhak Production" Audit — Findings

Structural + behavioral audit of the live AppSheet app, for use in planning the Next.js webapp rebuild. Read-only research only — see the hard constraint in section 9 on why no further live testing will be done against this app.

Source: AppSheet editor, app "Zarhak Production" (appId 72787047-d8ca-47d1-b44f-e9a6f641cd57).
Backing data source: Google Sheet "Purchase Orders" (1g0JiU0z7AoxY0Dz2_v9c_sKJIwPhRI_kI6a-sw8vEhs), one tab per table + many `Print_Ready_*` generated-report tabs.

## 1. Tables (19, from Info > Spec, list view)

1. Purchase Orders
2. Item Details
3. Inward Csvs (Inward CSV)
4. Dropdown And Master Lists
5. Main Menus (nav config only, not business data)
6. PO Report Prints
7. Customer_master_data
8. Master Stocks
9. Sales Details
10. Users
11. Cutting Order Summaries
12. Quality Data
13. Bundlewise Data
14. Machine Productions
15. Slitting Order Summaries
16. Slitting Production Data
17. Trading Summaries
18. Slitting Customer Masters
19. Transporters_list
20. Dispatch Summaries

Plus (seen in Data tab, not fully captured by spec text): CoatingTemperMapping, Customize PO.

## 2. Relationships (Ref columns)
- Customer_master_data 1:N Master Stock, Sales Details, Users, Cutting Order Summary, Bundlewise Data, Dispatch Summary
- Master Stock 1:N Master Stock (self, splits), Sales Details, Cutting Order Summary, Slitting Order Summary, Trading Summary
- Inward Csv 1:N Master Stock
- Transporters_list 1:N Users (??? odd — verify, likely Users table has transporter ref for some reason, or mis-scan)
- Cutting Order Summary 1:N Quality Data, Bundlewise Data, Machine Production, Dispatch Summary
- Bundlewise Datum 1:N Bundlewise Data (self, splits)
- Slitting Customer Master 1:N Slitting Order Summary
- Slitting Order Summary 1:N Slitting Production Data, Dispatch Summary
- Trading Summary 1:N Trading Summary (self, splits), Dispatch Summary
- User 1:N Cutting Order Summary (createdBy?)

## 3. Enums / valid_if value lists (from spec)
- Purchase Order.order_type: PO | JW
- Purchase Order.PO Type: P | NP
- Purchase Order.PO Grade: A | B | C
- Purchase Order.Mill: JSW-T | JSW-V | TCIL | Nippon | Thyssen
- Purchase Order.PO Status: Open | In Process | Closed  ⚠️ webapp only has OPEN/CLOSED/CANCELLED — missing "In Process"
- Purchase Order.order category: A | B | C | D | E
- Item Detail.Annealed Type: BA | CA | na
- Item Detail.PO Item Status: pending | open | closed  ⚠️ webapp ItemStatus is PENDING/MATCHED/RECEIVED — different vocabulary, needs reconciling
- Item Detail.Item Order Type: A | B | C | D | E
- Item Detail.Order Type (virtual): PO | JW
- Item Detail.PO Type (virtual): P | NP
- Inward Csv.Purchase Type: Zarhak | Job Work
- Inward Csv.Unloaded By: Kamlesh | Mainuddin | Krishna | Aroon
- Inward Csv.Review By: Vivek | Taher | Badruddin | Azeem
- Customize Po.ZSPL ID: (sample literal values, not a real enum — likely just current row data)
- Master Stock.master_stock_status: Available | Offered | Booked | Sold  ⚠️ webapp has AVAILABLE/OFFERED/BOOKED/SOLD/CANCELLED — extra CANCELLED not in source
- Master Stock.Sales Type: Trading | Slitting | Cutting
- Quality Datum.Bow: OK | Not OK
- Quality Datum.Squarness: OK | Not OK
- Machine Production.Shift: 1 | 2 | 3 | G
- Machine Production.Feeding Type: Over | Under
- Machine Production.Coil ID: 410 | 510
- Slitting Order Summary.Production Status: Order | In Process | Completed  ⚠️ webapp SlittingProductionStatus is PENDING/COMPLETED only — missing "Order" vs "In Process" distinction (probably PENDING should split into two)
- Slitting Customer Master.Slit Straping Type: 4 Strap | 5 Strap
- Slitting Customer Master.Pallet Size: No Pallet | 700x700 | 800x800

## 4. Views (from "users can view all X" statements — needs verification in UX tab, this list may be incomplete)
- Main Menus (home)
- Customer_master_data
- Slitting Customer Masters
- Users
- Dropdown And Master Lists
- Purchase Orders
- Item Details
- PO Report Prints
- Inward Csvs **grouped by Review Status**
- Final Inward Csvs (a filtered slice — "reviewed/completed" inward?)
- Master Stocks **grouped by master_stock_status**
- Master Stock Offereds (slice: status=Offered)
- Offered And Available Master Stocks (slice: status in Offered,Available)
- Sold Items **grouped by Sales PO Number** (slice: status=Sold)
- Cutting Order Summaries **grouped by Approved By**
- Daily Cutting Order Summaries (slice — today's queue?)
- Cutting Order Summaries (plain)
- Finished Goods Cutting Summaries (slice — completed production)
- Scrap Material Screens (slice — reject/scrap bundles "XX"/"YY")
- Slitting Order Summaries
- Finished Goods Slitting Order Summaries
- Trading Summaries
- Dispatch Summaries

Known dead reference (Info > Errors): view "Update Customer info 2" references action "Create Sales Order 2" which no longer exists — app has iterated; ignore that stale variant when replicating, use the live one.

## 5. Notable gaps vs. current webapp (Prisma schema) — preliminary, to verify against Views/Behavior audit
- **Sales Details** table has no equivalent in webapp — MasterStock currently carries sales fields directly. Need to determine (via Behavior/E2E test) whether AppSheet treats "Sales Details" as a distinct user-facing step/entry before routing to Cutting/Slitting/Trading, or whether it's just a derived/duplicate table. HIGH PRIORITY to verify live.
- **Customize PO** table (4 cols: ID, ZSPL ID, Description, Report Link) — purpose unclear, likely per-PO custom report template/link store. Not in webapp.
- **PO Report Print** table (6 cols incl. Add Description, Address) — looks like a log/params table for the PO report PDF (webapp currently generates PO report PDF on demand with no persisted "print record" or address-override). Verify.
- Several status enums differ in wording/value-set from webapp (see section 3) — needs reconciling since UI dropdowns + automations key off exact string values.
- Master Stock in AppSheet has **10 named "Split Item N Qty" columns** (Split Item 1..10 Qty) — a fixed-width multi-split UI pattern — vs. webapp's linked-list style single `originalMasterStockId`/`splitChildren` self-relation. Same for Cutting Order Summary, Bundlewise Data, Trading Summary, Slitting Production Data (all have Split Item 1-10 Qty + "Want To Split" flag). This is a real UX nuance: AppSheet's split action asks for up to 10 quantities in one form/action, not one-split-at-a-time. Need to check the actual Behavior action to see how splitting is invoked.
- PDF/report columns present per table not yet in webapp: Cutting Order Summary has separate "Production PDF", "Sorting PDF", "Coil Order PDF", "Pallet PDF" (4 distinct PDFs) plus "Create Bundle Slip Report" action column — webapp currently only generates Bundle Slip + PO Report + Dispatch Record + Slitting Instruction + Coil label per earlier commits. Sorting PDF / Coil Order PDF / Pallet PDF may be additional formats not yet built.
- Bundlewise Data has "Production PDF", "PDF", "Create PDF" — separate from Cutting Order Summary's PDFs.
- Slitting Production Data and Trading Summary each have their own "PDF"/"Create PDF" columns too — i.e., **every production-path table has its own dispatch/packing PDF trigger**, not just one shared "Bundle Slip" — need to check exact report per table in the Behavior tab.
- Transporters_list oddly appears as parent of Users (1:N) per spec text — likely mis-parsed or a legit but unexpected relation; verify in Data tab (Users table) directly — Users has a "Choose Master Stock Data", "Vehicle Number", "Lorry_weight", "DO Date" etc. columns which is very odd for a "Users" table — **this "Users" table is almost certainly being repurposed as a Dispatch working/staging table** (a classic AppSheet anti-pattern: reusing an existing table for an unrelated workflow because it was convenient). Its columns (Cutting Order Summary ref, Slitting Order Summary ref, Trading Summary ref, Thickness, Width, Coating, Temper, Vehicle Number, Lorry_weight, DO Date, Buyer/Consignee Address) look exactly like a **Dispatch entry/staging form**, not user accounts! This needs direct confirmation in the Data tab and Behavior tab — likely a key nuance: the app's actual "Create Dispatch" UI writes into the "Users" table as scratch/staging before an automation copies it into Dispatch Summary. HIGH PRIORITY to verify.

## 5b. Resolved: dead/unused tables (checked via "View Data" sample — much cheaper than the column grid)
- **Sales Details: 0 rows.** Confirmed dead/experimental — not part of the live workflow. Do not prioritize replicating.
- **Users: 1 real row** (a genuine user, dhivyaramasamy2000@gmail.com, only Email/Name/LastEditBy/LastEditDate/Max serial number populated). The Buyer No/Consignee No/Vehicle Number/Lorry_weight/DO Date/Cutting-Slitting-Trading-ref columns on this table are unpopulated — likely abandoned scratch columns from an earlier experiment (common AppSheet anti-pattern: bolting extra columns onto an existing table to prototype a form). Not load-bearing; low priority.
- This is reassuring: it means the real production flow is Master Stock (sales fields inline) → Cutting/Slitting/Trading Order Summary → Dispatch Summary — i.e. **exactly what the current webapp's Prisma schema already models**. The previous session's schema-modeling from source-app formulas appears accurate. Gaps are more likely in **views/UX and behavior/actions**, not the core data model — confirms user's complaint ("tables... not there" is likely about missing/incomplete *views*, not missing entities).

## 4b. Full View List (from UX tab, authoritative — supersedes section 4 guesses)

**Primary (bottom bar):** ZSPL (Main Menu gallery/home)

**Menu Views (left hamburger menu — top-level pages):**
1. Coil Order Report Format — table, data: Cutting order Summary
2. Customers — table, data: customer_master_data
3. Cutting Order summary — table
4. Daily Cutting Order summary — table, data: **"Daily Cutting Order summary" (a SLICE, not the base table)**
5. Daily Dispatch Summary — table, data: slice of Dispatch Summary
6. Dispatch Summary — table
7. Dropdowns — table, data: Dropdown and Master List
8. Final Inward Screen — table, data: **"Final Inward CSV" slice**
9. Finished Goods Cutting Summary — table, slice
10. Finished Goods Slitting order Summary — table, slice
11. Finished Goods Trading Summary — table (data: Trading Summary, presumably sliced)
12. Master Stock — table
13. Master stock offered — table, data: **"Master stock offered" slice**
14. Offered and Available master stock — table, slice
15. Pallet Report Format — table, data: Cutting order Summary
16. PO Item Details — table, data: Item Details
17. Print PO Report — **detail view**, data: PO Report Print
18. Purchase Orders Summary View — table
19. Sales Order — table, data: **"Sold Items" slice** (Master Stock where status=Sold), grouped by Sales PO Number
20. Scrap Material Screen — table, data: slice (reject "XX"/scrap "YY" bundles)
21. Slitting Customer Master — table
22. Slitting Order Summary — table
23. Sorting Report Format — table, data: Cutting order Summary
24. Split FG Trading — table, data: Trading Summary (a split-focused view)
25. Update Inward CSV — table
26. Update Review By — **form**, data: Inward CSV (this is very likely the reviewer-approval step for Inward — "REVIEWED_BY" field)
27. Users — table

**Ref Views (contextual detail/forms, opened from a row / action button, grouped by base table):**
- Bundlewise Data: "Bundlewise Data_Table" (table), "Split in Cutting Order Summary" (form — splitting a bundle)
- Inward CSV: plain table ref
- Machine Production: detail view + form ("_Form 2")
- Master Stock: "_Form 2", "Update Customer info 2" (form — ⚠️ **broken**, references a dead action "Create Sales Order 2", per Info > Errors — do not blindly replicate, check what it *should* do), "Update the split item Weight" (form)
- Quality Data: detail + form ("_2" suffixes — likely leftover versioned duplicates from iteration)
- Slitting Order Summary: "Update number of Bundles" (form), "Update Slitting customer Master" (form)
- Slitting Production Data: "Add Split Items" (form), plain table
- Trading Summary: "Update split items weight trading" (form)
- Users: "Add new User" (form), "Update the status 2" (form)
- **PO Report (slice)**: "PO Report" form
- **Production Date Selector (slice)**: form — used to set a production plan date (Cutting/Slitting production scheduling)
- **Update dispatch summary table (slice)**: THREE chained forms — "Update Dispatch Summary", "Update Dispatch Summary 2", "Update Dispatch Summary 3" — **dispatch creation is a 3-step wizard** (likely: step 1 pick items/buyer-consignee, step 2 transporter/vehicle, step 3 confirm/DO number), not a single edit form. Important UX nuance to replicate.
- **Update the status (slice)**: form — generic status-update step, reused across multiple flows probably

**Key UX pattern confirmed:** AppSheet workflow relies heavily on small, single-purpose "quick edit" forms (often only 2-4 fields) invoked via row/table actions, chained together as multi-step wizards (e.g. dispatch's 3-step form), rather than one big editable detail page. This is very different from typical webapp "edit this record" pages and is the more likely source of the user's "buttons... not there" complaint — the webapp needs equivalent guided micro-forms/action buttons at each step (approve, mark reviewed, set production date, split, etc.), not just a generic CRUD form.

**Cross-check against current webapp routes** (`src/app/(dashboard)/*`) — likely gaps to verify in stage 2:
- No `/sales-orders` or "Sold Items grouped by Sales PO Number" equivalent page.
- No visible "Daily Cutting Queue" / "Daily Dispatch" filtered/today views.
- No "Scrap Material Screen" (reject/scrap bundle tracking).
- No distinct "Offered" / "Offered+Available" Master Stock filtered views (may just need status filter chips on the existing master-stock page instead of separate routes).
- Need to confirm: reviewer-approval step for Inward (Update Review By), production-date-selector step, and the 3-step dispatch wizard all have equivalents (dispatch page exists — check if it's single-form or wizard).
- Report format "table" views (Coil Order/Pallet/Sorting Report Format) may just be AppSheet's mechanism for building a print layout (iterate rows to compose a PDF) — likely fine to skip since webapp already generates these as real PDFs server-side (Bundle Slip, Dispatch Record, Slitting Instruction, Coil labels, PO Report per git log).

## 7. Behavior tab — Actions (~130 total, grouped by table). Full raw list captured; key workflow findings below.

**Status-transition / "approval" buttons (the main gap the user flagged):**
- Master Stock: `Mark as offered` / `Clear mark as offered` / `Update offered or booked status` / `Update Sold Status` / `Cancel the order` — these are the actual status-change buttons (Available→Offered→Booked→Sold, plus Cancel). Webapp needs equivalent explicit action buttons per row, not just a status dropdown.
- Cutting Order Summary: `Approve` — production planning approval (gates entry into the Daily Cutting queue). Bundlewise Data: `Approve 2` — bundle-level approval (gates Finished Goods eligibility).
- Inward CSV: `Review Item Group` — the reviewer-approval action (writes Review By / triggers unload); `Transfer data to Master Stock` — the action that actually creates the Master Stock row once goods are physically received/reviewed. **This confirms Inward → Master Stock is an explicit user-triggered action, not automatic.**

**Split workflow (confirmed pattern, applies identically to Master Stock, Cutting Order Summary, Bundlewise Data, Slitting Production Data, Trading Summary):**
Each splittable table has 10 near-identical actions `Add Split Item 1`..`10` (each: "add a new row to another table using values from this row", i.e. duplicates the row with an overridden quantity), wrapped in one grouped action (`Add split items` / `Add Split Cutting Item` / etc.) that presumably calls only as many of the 10 as the user requested via a "Want To Split" count + "Split Item N Qty" inputs on a single form. This matches the webapp's self-relation split model conceptually, but the AppSheet UX is "enter up to 10 split quantities on one form, submit once" — not one split at a time. Worth matching that single-form-multi-split UX rather than repeated single splits.

**PDF/report generation actions (per production path, each sets column values e.g. a generated file URL, rather than a separate "print log" row):**
- Cutting: `Create Bundle Slip Format Report`, `Create FG Cutting PDF`, `Create Production PDF`
- Slitting: `Create slitting format`, `Create Slitting order PDF`, `Create FG Slitting PDF`
- Trading: `Create FG Trading PDF`
- Dispatch: `Create Packing list report` / `2` / `3` (variant per source: cutting/slitting/trading), `Recreate Packing list`
- PO: `Create PO Report`, `Download PO Report`, `Download PDF Report` (PO Report Print), `Add Item` (adds Item Detail row from PO detail view)
Current webapp already generates PO Report / Bundle Slip / Dispatch Record / Slitting Instruction / Coil label PDFs (per git log) — need a side-by-side check that each of the above AppSheet PDF actions has a matching webapp generator + a visible button triggering it per row (not just an API route that exists but isn't wired to a UI button).

**Dispatch creation is a stateful 3-step wizard, not a single form — confirmed:**
Actions defined under the **Users** table (the repurposed scratch-row table, see 5b) include `Call | Create Row in Dispatch Summary` / `2` / `3` / `Group`, `Clear dispatch summary fields`, `Clear the columns`, `Set Serial Number`, `Set max serial number for Dispatch`. Combined with the "Update Dispatch Summary / 2 / 3" ref-view forms (section 4b): the real flow is —
1. User picks one or more finished-goods rows (Bundlewise Data / Slitting Production Data / Trading Summary) ready to ship.
2. `Update Dispatch summary` action navigates to a 3-step form bound to the **current user's own Users row**, used purely as scratch state (buyer/consignee/vehicle/lorry weight/DO date fields entered step by step).
3. Final step fires `Create Row in Dispatch Summary` (the cutting/slitting/trading-specific variant) which copies scratch-row + source-row values into a new Dispatch Summary row, and assigns the DO number via `Set max serial number for Dispatch`.
4. `Clear dispatch summary fields` / `Clear the columns` resets the scratch row so the next dispatch starts clean.
This is meaningfully different from a plain "create dispatch record" form — it's a guided, stateful, multi-screen wizard. Need to check the current `/dispatch` page against this and decide whether to replicate the wizard or the equivalent single-page-with-steps.

**Other notable actions:** `Export ... to CSV` exists on nearly every table (Master Stock, Cutting/Slitting/Dispatch Summary, Inward CSV, Item Details) — bulk CSV export per view, not yet confirmed present in webapp. `Add Inward csv` / `Add Item Details` are CSV import actions (webapp already has `/inward/import` — check Item Details import parity too). `Download ... CSV Template` actions provide blank templates for import — check webapp offers template downloads (there's `/api/templates/inward` and `/api/templates/item-details` already — likely covers this).

## 8. Automation tab — Bots (full list, small enough to capture completely)

- **Bundlewise Data** → `Create Bundle wise PDF` (event-triggered PDF)
- **Cutting order Summary** → `Change cutting order production status` (**disabled**); `Create Bundle Slip Format Report`
- **Dispatch Summary** → `Create Packing List Report`
- **Inward CSV** → `Create ZSPL ID` (assigns the ZSPL sequence id — matches webapp's `zsplId`/`ZsplSequence`); `transfer data from inward to master stock` (the actual Inward→Master Stock automation, process version "-2" i.e. already iterated once); `Add seq and Zspl no` (**disabled** — superseded by Create ZSPL ID); `unload info bot` (**disabled**)
- **Master Stock** → `Update sales order number and update cutting or splitting table`, event "Allow only sold status master stock rows" — **this is the automation that, on Master Stock status→Sold, creates the matching Cutting/Slitting/Trading Order Summary row**. Directly corresponds to the webapp's existing `transitionMasterStock` logic (per schema.prisma comments) — good parity signal, but worth diffing the exact condition/field-copy logic.
- **Slitting Order Summary** → `Slitting Order Summary Report`
- **Slitting Production Data** → `Create FG slitting PDF`; **`When a new Slitting Production Data record is created, send a notification`** (matches webapp's existing notification system)
- **Trading Summary** → `Create FG Trading PDF`
- **Users** (scratch table, see 5b) → `Create Po report`; `Create production PDF` (active); two `Create Peoduction PDF [2]` variants **disabled** (dead iterations, ignore)
- **App-level:** `Send an email daily` (scheduled digest — verify what it reports), `SMS on updated Purchase Orders record` and `Email on updated Purchase Orders record` (both shown "close" — need to check enabled state), disabled by default it seems.

Overall the automation layer is much thinner than the ~130 client-side Actions — most business logic lives in Actions (user-triggered), with Bots reserved for: ZSPL ID assignment, Sold→production-summary fan-out, PDF generation triggers, and a couple of notifications. This matches the webapp's current architecture (server-side functions + notifications) reasonably well structurally; the main verification needed is field-by-field parity on the Master Stock→production-summary copy and the ZSPL ID sequence logic.

## 9. Live E2E test — confirmed findings (partial; stopped after PO stage, see below)

A real test PO was created live in the app to validate the Purchase Order flow end to end:
- **PO Number is a live app-formula, not a stored sequence you fill in**: as `order_type` / `PO Type` / `PO Grade` are picked, the "Purchase Order No." field updates in real time, e.g. `ZSPL/PO/P/A/26-27/203` built from `ZSPL/{order_type}/{PO Type}/{PO Grade}/{FY}/{seq}`. FY is computed from the PO Date (Apr–Mar Indian FY). The running sequence (`203` here) is a shared counter, confirming webapp's `PoSequence` model is the right mechanism — but the *display* should update live as the user fills the form, matching AppSheet's UX (current webapp PO number is likely only finalized on submit — verify and consider a live-preview number).
- **Purchase Orders Summary View** is a real, working searchable/filterable table (top search box does substring search across all visible columns) — confirms the "searchable" requirement is achievable with a fairly simple grid + search input; no evidence of true per-column dropdown filters in this specific view (the funnel icon exists — worth checking what it does in a follow-up read-only pass).
- **Item Details has no manual "add one row" path at all** — only bulk CSV import (`Add Item Details` button opens a file picker; there is no floating "+" or inline add-row control on the `PO Item Details` table view, and the inline-edit/pencil mode only edits existing rows). Same is true for **Inward** (table literally named "Inward CSV", paired with an "Upload Inward File" menu tile) — inward receipt data entry is CSV-only in this app, not a manual form. **This is an important, confirmed nuance**: the webapp does not need a "manually add one item to a PO" form to match parity — CSV upload actually *is* the primary/only path in the source app. Whatever manual add-row UI the webapp currently has for Item Details goes beyond AppSheet parity (not necessarily bad, just worth knowing it's an enhancement, not a gap).
- Did not proceed further live (Inward → Master Stock → Sales → Production → Dispatch) — see constraint below.

**Hard constraint for all future work on this app:** per explicit user instruction, no further write actions (create/edit/upload/import/delete) against the live AppSheet app or its backing Google Sheet, from any session. Read-only inspection only. This followed an incident where a wrong-file CSV upload (a full 6,215-row production export, mistakenly re-uploaded instead of a 1-row test file) caused AppSheet's "Add Item Details" import to upsert-match existing rows and overwrite their PO Date field with the import date, corrupting ~thousands of historical records' dates. It did **not** create duplicate rows (total row count was unchanged, confirmed via `Ctrl+End`). Recovered cleanly via Google Sheets version history (restored to a ~20-minutes-earlier checkpoint), which undid the corruption while preserving the legitimate test PO created before that checkpoint. No further live E2E testing (Inward/Master Stock/Production/Dispatch) will be performed going forward — remaining verification of those flows should be done by the user directly in AppSheet, or inferred from the structural findings above (Behavior actions + Automation bots already give a strong picture of the intended flow, see sections 7–8).

## 6. Still TODO (for user review / stage-2 planning, not further live AppSheet testing)
- [x] Verify "Users" table real purpose — confirmed scratch/staging table for the Dispatch wizard, 1 real user row, rest is dead/abandoned experiment columns
- [x] Verify Sales Details real purpose/workflow — confirmed 0 rows, dead/experimental table, not part of live workflow
- [x] Behavior tab: every action, its condition + effect — full list captured (section 7)
- [x] Automation tab: every bot, trigger + steps — full list captured (section 8)
- [x] Views (UX tab): full list with types captured (section 4b)
- [x] Partial live E2E test: PO creation flow confirmed working, Item Details/Inward confirmed CSV-only
- [ ] View-by-view Format Rules / conditional formatting pass (not done — would require further live UX-tab reading, low priority vs. the structural findings already captured)
- [ ] Field-level "Show if / Editable if / Valid if" formula text for every column (not captured — the AppSheet column grid UI made this expensive to scrape at scale; captured instead: enum value lists, relationships, and which fields are virtual/computed vs. real, which covers most of what's needed for a schema rebuild)
- [ ] Cross-check current webapp pages 1:1 against the final view list in section 4b and produce a gap list (recommended next step, doable entirely from this document + reading the webapp's own source, no further AppSheet access needed)
