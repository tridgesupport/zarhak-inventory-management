import { prisma, readSheet, s, n, d, MigrationReport, mapConcurrent } from "./lib";
import { POStatus } from "../../src/generated/prisma/enums";

const STATUS_MAP: Record<string, POStatus> = {
  open: "OPEN",
  closed: "CLOSED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
};

export async function migratePurchaseOrders(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Purchase Orders");
  let imported = 0;
  let skipped = 0;

  await mapConcurrent(rows, 15, async (row, i) => {
    const rowNum = i + 2;
    const poNumber = s(row["Purchase Order No."]);

    try {
      if (!poNumber) throw new Error("Missing Purchase Order No.");

      const poStatusRaw = s(row["PO Status"]) ?? "open";
      const status = STATUS_MAP[poStatusRaw.toLowerCase()];
      if (!status) {
        throw new Error(`Unrecognized PO Status "${poStatusRaw}" — not silently coerced`);
      }

      const fy = s(row["FY"]);
      const poSeq = n(row["Purchase Order Seq"]);
      if (!fy || poSeq === null) {
        throw new Error("Missing FY or Purchase Order Seq");
      }

      await prisma.purchaseOrder.upsert({
        where: { id: poNumber },
        update: {},
        create: {
          id: poNumber,
          poNumber,
          poSeq,
          fy,
          poDate: d(row["PO Date"]) ?? new Date(),
          orderType: s(row["order_type"]) ?? "PO",
          poType: s(row["PO Type"]) ?? "",
          poGrade: s(row["PO Grade"]) ?? "",
          typeOfSteel: s(row["type of steel"]) ?? "",
          vendorName: s(row["Vendor Name"]) ?? "",
          shipTo: s(row["Ship to"]) ?? "",
          mill: s(row["Mill"]) ?? "",
          orderCategory: s(row["order category"]) ?? "",
          status,
          remark: s(row["PO Remark"]),
          createdBy: s(row["Last Edited By"]) ?? "migration",
        },
      });

      // Keep the fiscal-year sequence counter ahead of the highest migrated seq so
      // new POs created post-migration don't collide with historical numbers.
      await prisma.poSequence.upsert({
        where: { fy },
        update: {},
        create: { fy, lastSeq: poSeq },
      });
      const seqRow = await prisma.poSequence.findUnique({ where: { fy } });
      if (seqRow && seqRow.lastSeq < poSeq) {
        await prisma.poSequence.update({ where: { fy }, data: { lastSeq: poSeq } });
      }

      imported++;
    } catch (e) {
      report.recordError(
        "Purchase Orders",
        rowNum,
        poNumber,
        e instanceof Error ? e.message : String(e)
      );
      skipped++;
    }
  });

  report.recordCounts("Purchase Orders", rows.length, imported, skipped);
}
