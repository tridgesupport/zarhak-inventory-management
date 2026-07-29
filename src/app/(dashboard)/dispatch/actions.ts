"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";

async function requireDispatch() {
  const session = await auth();
  if (!session?.user || !canDispatch(session.user.role)) {
    throw new Error("Not authorized");
  }
  return session.user;
}

const dispatchSchema = z.object({
  doNumber: z.string().min(1, "DO Number is required"),
  doDate: z.string().optional(),
  buyerId: z.string().optional(),
  consigneeId: z.string().optional(),
  transporterName: z.string().optional(),
  vehicleNumber: z.string().optional(),
  lorryWeight: z.coerce.number().optional(),
});

// One dispatch action per Finished Goods source — each creates a DispatchSummary row
// carrying that item's spec, grouped with others sharing the same DO number.

function parseDispatchForm(formData: FormData) {
  // Blank optional fields (esp. <select> FK pickers left at "Select…") must become
  // undefined, not "" — an empty string is not a valid foreign key value.
  const entries = Object.fromEntries(formData);
  for (const key of Object.keys(entries)) {
    if (entries[key] === "") delete entries[key];
  }
  const parsed = dispatchSchema.safeParse(entries);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  return parsed.data;
}

export async function dispatchCuttingBundle(bundleId: string, formData: FormData) {
  const user = await requireDispatch();
  const data = parseDispatchForm(formData);

  const bundle = await prisma.bundlewiseData.findUniqueOrThrow({
    where: { id: bundleId },
    include: { cuttingOrder: true },
  });

  await prisma.dispatchSummary.create({
    data: {
      cuttingBundleId: bundle.id,
      cuttingOrderId: bundle.cuttingOrderId,
      doNumber: data.doNumber,
      doDate: data.doDate ? new Date(data.doDate) : undefined,
      customerId: bundle.cuttingOrder.customerId,
      finalZsplId: `${bundle.cuttingOrder.zsplId}-${bundle.bundleIdNo}`,
      itemType: bundle.cuttingOrder.itemType,
      thickness: bundle.cuttingOrder.thickness,
      width: bundle.cuttingOrder.width,
      cutLength: bundle.cutLength ?? undefined,
      coating: bundle.cuttingOrder.coating,
      temper: bundle.cuttingOrder.temper,
      finish: bundle.cuttingOrder.finish,
      netWeight: bundle.netBundleWt ?? undefined,
      grossWeight: bundle.grossBundleWt ?? undefined,
      bundleNetWeight: bundle.netBundleWt ?? undefined,
      buyerId: data.buyerId,
      consigneeId: data.consigneeId,
      transporterName: data.transporterName,
      vehicleNumber: data.vehicleNumber,
      lorryWeight: data.lorryWeight,
      createdBy: user.email ?? "unknown",
    },
  });

  await prisma.bundlewiseData.update({
    where: { id: bundleId },
    data: { doNumber: data.doNumber },
  });

  revalidatePath("/production/finished-goods/cutting");
  revalidatePath("/dispatch");
}

export async function dispatchSlittingProduction(rowId: string, formData: FormData) {
  const user = await requireDispatch();
  const data = parseDispatchForm(formData);

  const row = await prisma.slittingProductionData.findUniqueOrThrow({
    where: { id: rowId },
    include: { slittingOrder: true },
  });

  await prisma.dispatchSummary.create({
    data: {
      slittingProductionId: row.id,
      slittingOrderId: row.slittingOrderId,
      doNumber: data.doNumber,
      doDate: data.doDate ? new Date(data.doDate) : undefined,
      customerId: row.slittingOrder.customerId,
      finalZsplId: row.bundleIdNo,
      itemType: row.slittingOrder.itemType,
      thickness: row.slittingOrder.thickness,
      width: row.slitWidth ?? row.slittingOrder.width,
      coating: row.slittingOrder.coating,
      temper: row.slittingOrder.temper,
      finish: row.slittingOrder.finish,
      netWeight: row.netWt ?? undefined,
      grossWeight: row.grossWt ?? undefined,
      buyerId: data.buyerId,
      consigneeId: data.consigneeId,
      transporterName: data.transporterName,
      vehicleNumber: data.vehicleNumber,
      lorryWeight: data.lorryWeight,
      createdBy: user.email ?? "unknown",
    },
  });

  revalidatePath("/production/finished-goods/slitting");
  revalidatePath("/dispatch");
}

export async function dispatchTradingRow(rowId: string, formData: FormData) {
  const user = await requireDispatch();
  const data = parseDispatchForm(formData);

  const row = await prisma.tradingSummary.findUniqueOrThrow({ where: { id: rowId } });

  await prisma.dispatchSummary.create({
    data: {
      tradingId: row.id,
      doNumber: data.doNumber,
      doDate: data.doDate ? new Date(data.doDate) : undefined,
      customerId: row.customerId,
      finalZsplId: row.zsplId,
      itemType: row.itemType,
      thickness: row.thickness,
      width: row.width,
      cutLength: row.length ?? undefined,
      coating: row.coating,
      temper: row.temper,
      finish: row.finish,
      netWeight: row.netWeight,
      grossWeight: row.grossWeight ?? undefined,
      buyerId: data.buyerId,
      consigneeId: data.consigneeId,
      transporterName: data.transporterName,
      vehicleNumber: data.vehicleNumber,
      lorryWeight: data.lorryWeight,
      createdBy: user.email ?? "unknown",
    },
  });

  revalidatePath("/production/trading");
  revalidatePath("/dispatch");
}

// Deleting a dispatch row sends the item back to its Finished Goods screen — matches
// the source app's "delete here, it goes back to FG" behavior.
export async function removeFromDispatch(dispatchId: string) {
  await requireDispatch();
  const row = await prisma.dispatchSummary.findUniqueOrThrow({ where: { id: dispatchId } });

  await prisma.$transaction(async (tx) => {
    await tx.dispatchSummary.delete({ where: { id: dispatchId } });
    if (row.cuttingBundleId) {
      await tx.bundlewiseData.update({
        where: { id: row.cuttingBundleId },
        data: { doNumber: null },
      });
    }
  });

  revalidatePath("/dispatch");
  revalidatePath("/production/finished-goods/cutting");
  revalidatePath("/production/finished-goods/slitting");
  revalidatePath("/production/trading");
}

export async function createPackingList(doNumber: string) {
  await requireDispatch();
  await prisma.dispatchSummary.updateMany({
    where: { doNumber },
    data: { packingListCreated: true },
  });
  revalidatePath("/dispatch");
}
