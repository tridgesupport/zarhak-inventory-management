"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canImportItemDetails } from "@/lib/permissions";
import { parseItemDetailsCsv, type ParsedItemDetailRow } from "@/lib/csv/itemDetails";
import { encodeIdForUrl } from "@/lib/urlId";

export async function previewItemDetailsImport(poId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canImportItemDetails(session.user.role)) {
    throw new Error("Not authorized");
  }

  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { validRows: [], errors: [{ row: 0, message: "No file uploaded" }] };
  }

  const text = await file.text();
  return parseItemDetailsCsv(text, po.poNumber);
}

export async function commitItemDetailsImport(
  poId: string,
  rows: ParsedItemDetailRow[]
) {
  const session = await auth();
  if (!session?.user || !canImportItemDetails(session.user.role)) {
    throw new Error("Not authorized");
  }
  if (rows.length === 0) throw new Error("No valid rows to import");

  await prisma.itemDetail.createMany({
    data: rows.map((r) => ({
      purchaseOrderId: poId,
      concatenateKey: r.concatenateKey,
      itemType: r.itemType,
      thickness: r.thickness,
      width: r.width,
      // Prisma 7's "prisma-client" generator rejects an explicit `null` for an
      // optional scalar in createMany ("Argument `length` is missing") — omit the
      // key entirely instead so it's treated as not provided.
      length: r.length ?? undefined,
      coating: r.coating,
      temper: r.temper,
      finish: r.finish,
      grade: r.grade,
      annealedType: r.annealedType,
      vendorIdNo: r.vendorIdNo,
      qtyMt: r.qtyMt,
      coilId: r.coilId,
      vendorName: r.vendorName,
      steelType: r.steelType,
      purchasePrice: r.purchasePrice,
      productCategory: r.productCategory,
      itemRemark: r.itemRemark,
      sleeveType: r.sleeveType,
      endUse: r.endUse,
      bundleCoil: r.bundleCoil,
      itemName: r.itemName,
    })),
  });

  const encodedPoId = encodeIdForUrl(poId);
  revalidatePath(`/purchase-orders/${encodedPoId}`);
  redirect(`/purchase-orders/${encodedPoId}`);
}
