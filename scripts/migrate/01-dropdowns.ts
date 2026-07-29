import { prisma, readSheet, s, MigrationReport, mapConcurrent } from "./lib";
import { LookupDomain } from "../../src/generated/prisma/enums";

// Maps the source "Dropdown and Master List" mega-table's columns onto our
// LookupDomain enum. A few source columns ("PO Status", generic "Status") aren't
// migrated here because those are native Postgres enums in the new schema (POStatus,
// MasterStockStatus), not free-text lookups.
const COLUMN_TO_DOMAIN: Record<string, LookupDomain> = {
  "PO Type": "PO_TYPE",
  "Type of Steel": "TYPE_OF_STEEL",
  "Item Type": "ITEM_TYPE",
  "Item Name": "ITEM_NAME",
  "Vendor Name": "VENDOR_NAME",
  Mill: "MILL",
  "Web Coating": "WEB_COATING",
  Coating: "COATING",
  "Web Temper": "WEB_TEMPER",
  Temper: "TEMPER",
  Grade: "GRADE",
  Finish: "FINISH",
  "Annealed Type": "ANNEALED_TYPE",
  "Coil ID": "COIL_ID",
  "Product Category": "PRODUCT_CATEGORY",
  "Purchase Type": "PURCHASE_TYPE",
  "Delivery Location": "DELIVERY_LOCATION",
  "State Name": "STATE_NAME",
  "Unloaded By": "UNLOADED_BY",
  "Reviewed By": "REVIEWED_BY",
  "Bay Location": "BAY_LOCATION",
  "Sales Type": "SALES_TYPE",
  "Factory Location": "FACTORY_LOCATION",
  "End Use": "END_USE",
  Operator: "OPERATOR",
  "Asistant Operator": "ASSISTANT_OPERATOR",
  Origin: "ORIGIN",
  "Coil Feeding Operator Name": "COIL_FEEDING_OPERATOR",
};

export async function migrateDropdowns(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Dropdown and Master List");

  const seen = new Set<string>(); // `${domain}::${value}` — sheet has many duplicate values across rows
  const toInsert: { domain: LookupDomain; value: string }[] = [];

  for (const row of rows) {
    for (const [col, domain] of Object.entries(COLUMN_TO_DOMAIN)) {
      const value = s(row[col]);
      if (!value) continue;
      const key = `${domain}::${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toInsert.push({ domain, value });
    }
  }

  let imported = 0;
  await mapConcurrent(toInsert, 20, async (item) => {
    await prisma.lookupValue.upsert({
      where: { domain_value: { domain: item.domain, value: item.value } },
      update: {},
      create: { domain: item.domain, value: item.value, createdBy: "migration" },
    });
    imported++;
  });

  report.recordCounts("Dropdown and Master List", rows.length, imported, 0);
}
