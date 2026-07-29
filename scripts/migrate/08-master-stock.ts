import { prisma, readSheet, s, n, d, MigrationReport, mapConcurrent } from "./lib";
import { MasterStockStatus } from "../../src/generated/prisma/enums";

const STATUS_MAP: Record<string, MasterStockStatus> = {
  available: "AVAILABLE",
  offered: "OFFERED",
  booked: "BOOKED",
  sold: "SOLD",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
};

export async function migrateMasterStock(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Master Stock");

  const inwardIds = new Set(
    (await prisma.inwardRecord.findMany({ select: { id: true } })).map((r) => r.id)
  );
  const customers = await prisma.customer.findMany({ select: { id: true, legalName: true } });
  const customerByName = new Map(
    customers.map((c) => [c.legalName.trim().toLowerCase(), c.id])
  );

  let imported = 0;
  let skipped = 0;
  // rowId -> raw "Original Master stock ID" value, resolved in pass 2
  const pendingParentLinks: { id: string; originalRaw: string }[] = [];

  // Pass 1: create every row with no self-reference yet.
  await mapConcurrent(rows, 20, async (row, i) => {
    const rowNum = i + 2;
    const id = s(row["master_stock_unique_id"]);

    try {
      if (!id) throw new Error("Missing master_stock_unique_id");

      const statusRaw = s(row["master_stock_status"]) ?? "available";
      const status = STATUS_MAP[statusRaw.toLowerCase()];
      if (!status) {
        throw new Error(`Unrecognized master_stock_status "${statusRaw}" — not silently coerced`);
      }

      // Confirmed by inspection: some historical SOLD split-children have a genuinely
      // blank I Gr Wt (the weight lives on the split-parent's "Split Item N Qty"
      // instead) — default to 0 rather than discarding real sold-inventory history.
      const thickness = n(row["Thickness"]) ?? 0;
      const width = n(row["Width"]) ?? 0;
      const netWt = n(row["I Gr Wt"]) ?? 0;

      const inwardIdRaw = s(row["Inward ID"]);
      const inwardId = inwardIdRaw && inwardIds.has(inwardIdRaw) ? inwardIdRaw : null;

      const customerNameRaw = s(row["customer"]);
      const customerId = customerNameRaw
        ? (customerByName.get(customerNameRaw.trim().toLowerCase()) ?? null)
        : null;

      const availableWeight = n(row["Available Weight"]) ?? netWt;
      const salesType = s(row["Sales Type"]) ?? s(row["sales_type"]);

      await prisma.masterStock.upsert({
        where: { id },
        update: {},
        create: {
          id,
          inwardId,
          zsplId: s(row["zspl_id"]) ?? id,
          vendorName: s(row["Vendor Name"]) ?? "",
          purchaseType: s(row["Purchase Type"]) ?? "",
          unloadDate: d(row["unload_date"]) ?? new Date(),
          itemType: s(row["Item Type"]) ?? "",
          mill: s(row["Mill"]) ?? "",
          grade: s(row["Grade"]) ?? "",
          thickness,
          width,
          length: n(row["Length"]) ?? undefined,
          webCoating: s(row["Web Coating"]),
          coating: s(row["Coating"]) ?? "",
          webTemper: n(row["Web Temper"]) ?? undefined,
          temper: s(row["Temper"]) ?? "",
          finish: s(row["Finish"]) ?? "",
          inwardRemarks: s(row["Inward Remarks"]),
          coilId: s(row["Coil ID"]),
          netWt,
          noOfSheets: s(row["No of sheets"]),
          itemForm: s(row["Item Form"]) ?? "",
          purchasePrice: n(row["purchase_price"]) ?? 0,
          salesDate: d(row["sales_date"]) ?? undefined,
          customerId,
          customerPoNo: s(row["customer_po_no"]),
          customerPoDate: d(row["customer_po_date"]) ?? undefined,
          endUse: s(row["end_use"]),
          productionWeight: n(row["production_weight"]) ?? undefined,
          salePrice: n(row["sale_price"]) ?? undefined,
          salesRemark: s(row["sales_remark"]),
          requestedDeliveryDate: d(row["requested_delivery_date"]) ?? undefined,
          deliveryLocation: s(row["delivery_location"]),
          salesType,
          actualDispatchDate: d(row["actual_dispatch_date"]) ?? undefined,
          availableWeight,
          noOfSplits: n(row["No of splits"]) ?? 0,
          status,
          salesPoNumber: s(row["Sales PO Number"]),
          serialNumber: n(row["Serial Number"]) ?? undefined,
          annealed: s(row["Annealed"]),
          coilLength: n(row["Coil Length"]) ?? undefined,
          bayLocation: s(row["Bay Location"]),
          createdBy: "migration",
        },
      });

      const originalRaw = s(row["Original Master stock ID"]);
      if (originalRaw) pendingParentLinks.push({ id, originalRaw });

      imported++;
    } catch (e) {
      report.recordError(
        "Master Stock",
        rowNum,
        id,
        e instanceof Error ? e.message : String(e)
      );
      skipped++;
    }
  });

  // Pass 2: now every row exists, resolve self-references.
  const allIds = new Set(
    (await prisma.masterStock.findMany({ select: { id: true } })).map((r) => r.id)
  );
  let linked = 0;
  let unresolvedLinks = 0;
  await mapConcurrent(pendingParentLinks, 20, async (link) => {
    if (!allIds.has(link.originalRaw)) {
      report.recordError(
        "Master Stock (split links)",
        0,
        link.id,
        `Original Master stock ID "${link.originalRaw}" not found — link skipped`
      );
      unresolvedLinks++;
      return;
    }
    await prisma.masterStock.update({
      where: { id: link.id },
      data: { originalMasterStockId: link.originalRaw },
    });
    linked++;
  });

  report.recordCounts("Master Stock", rows.length, imported, skipped);
  report.recordCounts("Master Stock (split links)", pendingParentLinks.length, linked, unresolvedLinks);
}
