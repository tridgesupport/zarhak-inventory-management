import { prisma, readSheet, s, n, d, MigrationReport } from "./lib";

// Plain data copy — historical Inward rows already have their real reviewBy/
// unloadedBy/matchedItemId state, and the Master Stock rows they produced already
// exist as real rows in the "Master Stock" sheet (migrated separately in 08). We must
// NOT re-run the app's markReviewed→create-MasterStock transaction here, or every
// historically-reviewed row would spawn a duplicate Master Stock row.
export async function migrateInward(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Inward CSV");

  const poNumbers = new Set(
    (await prisma.purchaseOrder.findMany({ select: { id: true } })).map((p) => p.id)
  );
  const itemDetailIds = new Set(
    (await prisma.itemDetail.findMany({ select: { id: true } })).map((i) => i.id)
  );

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const uniqueInwardItem = s(row["unique_inward_item"]);

    try {
      if (!uniqueInwardItem) throw new Error("Missing unique_inward_item");

      const poNumber = s(row["Purchase Order No."]);
      if (!poNumber || !poNumbers.has(poNumber)) {
        throw new Error(`Purchase Order "${poNumber}" not found`);
      }

      const zsplId = s(row["zspl_id"]);
      if (!zsplId) throw new Error("Missing zspl_id");

      const thickness = n(row["Thickness"]);
      const width = n(row["Width"]);
      const netWt = n(row["Net Wt"]);
      if (thickness === null || width === null || netWt === null) {
        throw new Error("Missing Thickness/Width/Net Wt");
      }

      const matchedRaw = s(row["Inward matched item id"]);
      const matchedItemId = matchedRaw && itemDetailIds.has(matchedRaw) ? matchedRaw : null;

      const coilId = s(row["Coil ID"]);

      await prisma.inwardRecord.upsert({
        where: { id: uniqueInwardItem },
        update: {},
        create: {
          id: uniqueInwardItem,
          purchaseOrderId: poNumber,
          matchedItemId,
          concatenatedId: s(row["Inward concated id"]) ?? "",
          dispatchDate: d(row["Dispatch date (dd-mm-yyyy)"]),
          itemType: s(row["Item Type"]) ?? "",
          grade: s(row["Grade"]) ?? "",
          thickness,
          width,
          length: n(row["Length"]) ?? undefined,
          mill: s(row["Mill"]) ?? "",
          coating: s(row["Coating"]) ?? "",
          temper: s(row["Temper"]) ?? "",
          finish: s(row["Finish"]) ?? "",
          netWt,
          coilLength: n(row["Coil Length"]) ?? undefined,
          noOfSheets: n(row["No of sheets"]) ?? undefined,
          coilId,
          vendorName: s(row["Vendor Name"]) ?? "",
          vehicleNo: s(row["Vehicle No."]) ?? "",
          vendorIdNo: s(row["Vendor ID No."]),
          heatNo: s(row["Heat No"]),
          millTc: s(row["Mill TC"]),
          webCoating: s(row["Web Coating"]),
          webTemper: n(row["Web Temper"]) ?? undefined,
          iGrWt: n(row["I Gr Wt"]) ?? undefined,
          inwardRemarks: s(row["Inward Remarks"]),
          bayLocation: s(row["Bay Location"]),
          purchaseType: s(row["Purchase Type"]) ?? "",
          unloadedBy: s(row["Unloaded By"]),
          reviewBy: s(row["Review By"]),
          unloadTime: d(row["unload time"]) ?? undefined,
          unloadedInwardNo: s(row["unloaded_inward_no"]),
          vendorInvoiceNo: s(row["vendor invoice no"]),
          vendorInvDate: d(row["Vendor Inv Date"]) ?? undefined,
          bundleCoil: coilId ? "B" : "C",
          zsplId,
          annealedType: s(row["Annealed Type"]),
        },
      });

      imported++;
    } catch (e) {
      report.recordError(
        "Inward CSV",
        rowNum,
        uniqueInwardItem,
        e instanceof Error ? e.message : String(e)
      );
      skipped++;
    }
  }

  report.recordCounts("Inward CSV", rows.length, imported, skipped);
}
