"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canImportInward } from "@/lib/permissions";
import { parseInwardCsv, type ParsedInwardRow } from "@/lib/csv/inward";
import { buildConcatenateKey } from "@/lib/matching";
import { nextZsplSeq, fiscalYearFor } from "@/lib/sequences";

export interface InwardPreviewRow extends ParsedInwardRow {
  rowIndex: number;
  purchaseOrderId: string | null;
  matchedItemId: string | null;
  matchCandidates: { id: string; label: string }[];
  webCoating: string | null;
  webTemper: number | null;
  issue: string | null;
}

export async function previewInwardImport(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canImportInward(session.user.role)) {
    throw new Error("Not authorized");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { rows: [] as InwardPreviewRow[], errors: [{ row: 0, message: "No file uploaded" }] };
  }

  const text = await file.text();
  const { validRows, errors } = parseInwardCsv(text);

  const poNumbers = [...new Set(validRows.map((r) => r.purchaseOrderNo))];
  const pos = await prisma.purchaseOrder.findMany({
    where: { poNumber: { in: poNumbers } },
  });
  const poByNumber = new Map(pos.map((po) => [po.poNumber, po]));

  // Web Coating and Web Temper are two independent 1:1 lookups in the source app
  // (confirmed against real data), not one joint mapping — resolve them separately.
  const coatings = [...new Set(validRows.map((r) => r.coating))];
  const tempers = [...new Set(validRows.map((r) => r.temper))];
  const [coatingMappings, temperMappings] = await Promise.all([
    prisma.coatingMapping.findMany({ where: { coating: { in: coatings } } }),
    prisma.temperMapping.findMany({ where: { temper: { in: tempers } } }),
  ]);
  const webCoatingByCoating = new Map(
    coatingMappings.map((m) => [m.coating, m.webCoating])
  );
  const webTemperByTemper = new Map(
    temperMappings.map((m) => [m.temper, m.webTemper])
  );

  const rows: InwardPreviewRow[] = [];

  for (let i = 0; i < validRows.length; i++) {
    const r = validRows[i];
    const po = poByNumber.get(r.purchaseOrderNo);
    const webCoating = webCoatingByCoating.get(r.coating) ?? null;
    const webTemperVal = webTemperByTemper.get(r.temper);
    const webTemper = webTemperVal !== undefined ? Number(webTemperVal) : null;

    if (!po) {
      rows.push({
        ...r,
        rowIndex: i,
        purchaseOrderId: null,
        matchedItemId: null,
        matchCandidates: [],
        webCoating,
        webTemper,
        issue: `Purchase Order "${r.purchaseOrderNo}" not found`,
      });
      continue;
    }

    const concatenatedId = buildConcatenateKey({
      purchaseOrderNo: r.purchaseOrderNo,
      itemType: r.itemType,
      thickness: r.thickness,
      width: r.width,
      length: r.length,
      coating: r.coating,
      temper: r.temper,
      finish: r.finish,
      grade: r.grade,
      vendorIdNo: r.vendorIdNo,
      coilId: r.coilId,
    });

    const candidates = await prisma.itemDetail.findMany({
      where: { purchaseOrderId: po.id, concatenateKey: concatenatedId },
      select: { id: true, itemType: true, thickness: true, width: true, qtyMt: true },
    });

    const matchedItemId = candidates.length === 1 ? candidates[0].id : null;

    rows.push({
      ...r,
      concatenatedId,
      rowIndex: i,
      purchaseOrderId: po.id,
      matchedItemId,
      matchCandidates: candidates.map((c) => ({
        id: c.id,
        label: `${c.itemType} ${c.thickness}x${c.width} — ${c.qtyMt} MT`,
      })),
      webCoating,
      webTemper,
      issue:
        candidates.length === 0
          ? "No matching Item Detail found — needs manual match or a remark"
          : candidates.length > 1
            ? "Multiple Item Details match — needs manual selection"
            : null,
    });
  }

  return { rows, errors };
}

export async function commitInwardImport(rows: InwardPreviewRow[]) {
  const session = await auth();
  if (!session?.user || !canImportInward(session.user.role)) {
    throw new Error("Not authorized");
  }
  const importable = rows.filter((r) => r.purchaseOrderId);
  if (importable.length === 0) throw new Error("No valid rows to import");

  const fy = fiscalYearFor(new Date());

  await prisma.$transaction(async (tx) => {
    for (const r of importable) {
      const seq = await nextZsplSeq(tx);
      const zsplId = `ZSPL${fy.replace("-", "")}${String(seq).padStart(5, "0")}`;

      if (r.matchedItemId) {
        // Same "matched" transition as the manual resolveMatch action, for rows the
        // import auto-matched (exactly one candidate) rather than needing a human pick.
        await tx.itemDetail.update({
          where: { id: r.matchedItemId },
          data: { itemStatus: "MATCHED" },
        });
      }

      await tx.inwardRecord.create({
        data: {
          purchaseOrderId: r.purchaseOrderId!,
          matchedItemId: r.matchedItemId ?? undefined,
          concatenatedId: r.concatenatedId,
          dispatchDate: r.dispatchDate ?? undefined,
          itemType: r.itemType,
          grade: r.grade,
          thickness: r.thickness,
          width: r.width,
          length: r.length ?? undefined,
          mill: r.mill,
          coating: r.coating,
          temper: r.temper,
          finish: r.finish,
          netWt: r.netWt,
          coilLength: r.coilLength ?? undefined,
          noOfSheets: r.noOfSheets ?? undefined,
          coilId: r.coilId,
          vendorName: r.vendorName,
          vehicleNo: r.vehicleNo,
          vendorIdNo: r.vendorIdNo,
          heatNo: r.heatNo,
          millTc: r.millTc,
          webCoating: r.webCoating ?? undefined,
          webTemper: r.webTemper ?? undefined,
          purchaseType: r.purchaseType,
          vendorInvoiceNo: r.vendorInvoiceNo,
          vendorInvDate: r.vendorInvDate ?? undefined,
          annealedType: r.annealedType,
          bundleCoil: r.bundleCoil,
          zsplId,
        },
      });
    }
  });

  revalidatePath("/inward");
  redirect("/inward");
}
