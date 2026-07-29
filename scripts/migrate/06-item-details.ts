import { prisma, readSheet, s, n, MigrationReport } from "./lib";
import { ItemType } from "../../src/generated/prisma/enums";

const ITEM_TYPE_MAP: Record<string, ItemType> = {
  ETP: "ETP",
  TFS: "TFS",
  TMBP: "TMBP",
  A: "A",
};

export async function migrateItemDetails(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Item Details");

  // Preload valid PO ids (poNumber) to validate FK without a query per row.
  const poNumbers = new Set(
    (await prisma.purchaseOrder.findMany({ select: { id: true } })).map((p) => p.id)
  );

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const uniqueItemId = s(row["unique_itemid"]);

    try {
      if (!uniqueItemId) throw new Error("Missing unique_itemid");

      const poNumber = s(row["Purchase Order No."]);
      if (!poNumber) throw new Error("Missing Purchase Order No.");
      if (!poNumbers.has(poNumber)) {
        throw new Error(`Purchase Order "${poNumber}" not found (not migrated / typo)`);
      }

      const itemTypeRaw = s(row["Item Type"]);
      const itemType = itemTypeRaw ? ITEM_TYPE_MAP[itemTypeRaw.toUpperCase()] : undefined;
      if (!itemType) {
        throw new Error(`Unrecognized Item Type "${itemTypeRaw}" — not silently coerced`);
      }

      const thickness = n(row["Thickness"]);
      const width = n(row["Width"]);
      const qtyMt = n(row["Qty (Mt)"]);
      if (thickness === null || width === null || qtyMt === null) {
        throw new Error("Missing Thickness/Width/Qty (Mt)");
      }

      const coilId = s(row["Coil ID"]);
      const concatenateKey = s(row["Concatenate Item details"]) ?? "";

      await prisma.itemDetail.upsert({
        where: { id: uniqueItemId },
        update: {},
        create: {
          id: uniqueItemId,
          purchaseOrderId: poNumber,
          concatenateKey,
          itemType,
          thickness,
          width,
          length: n(row["Length"]) ?? undefined,
          coating: s(row["Coating"]) ?? "",
          temper: s(row["Temper"]) ?? "",
          finish: s(row["Finish"]) ?? "",
          grade: s(row["Grade"]) ?? "",
          annealedType: s(row["Annealed Type"]),
          vendorIdNo: s(row["Vendor ID No."]),
          qtyMt,
          coilId,
          vendorName: s(row["Vendor Name"]),
          steelType: s(row["Steel Type"]),
          purchasePrice: n(row["Purchase Price"]) ?? undefined,
          productCategory: s(row["Product Category"]),
          itemRemark: s(row["PO Item Remark"]),
          bundleCoil: coilId ? "B" : "C",
          itemName: s(row["item_name"]) ?? "",
          sleeveType: s(row["Sleeve Type"]),
          endUse: s(row["End Use"]),
        },
      });

      imported++;
    } catch (e) {
      report.recordError(
        "Item Details",
        rowNum,
        uniqueItemId,
        e instanceof Error ? e.message : String(e)
      );
      skipped++;
    }
  }

  report.recordCounts("Item Details", rows.length, imported, skipped);
}
