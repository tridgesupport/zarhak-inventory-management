"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";
import { nextDoSeq, fiscalYearFor } from "@/lib/sequences";
import { createNotification } from "@/lib/notifications";

async function requireDispatch() {
  const session = await auth();
  if (!session?.user || !canDispatch(session.user.role)) {
    throw new Error("Not authorized");
  }
  return session.user;
}

export type DispatchSource = "CUTTING" | "SLITTING" | "TRADING";

export type EligibleDispatchItem = {
  id: string;
  source: DispatchSource;
  zsplId: string;
  spec: string;
  netWeight: string;
  customerName: string;
};

// Unifies the three Finished Goods eligibility queries that used to live separately
// on the Cutting/Slitting Finished Goods pages and the Trading detail page, so the
// wizard can present one combined, selectable list across all three production paths.
export async function getEligibleDispatchItems(): Promise<EligibleDispatchItem[]> {
  await requireDispatch();

  const [cuttingBundles, slittingRows, tradingRows] = await Promise.all([
    prisma.bundlewiseData.findMany({
      where: { status: "APPROVED", bundleIdNo: { notIn: ["XX", "YY"] }, doNumber: null },
      include: { cuttingOrder: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.slittingProductionData.findMany({
      where: {
        slittingOrder: { productionStatus: "COMPLETED" },
        dispatchSummaries: { none: {} },
      },
      include: { slittingOrder: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.tradingSummary.findMany({
      where: { availableWeight: { gt: 0 }, dispatchSummaries: { none: {} } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const items: EligibleDispatchItem[] = [];

  for (const b of cuttingBundles) {
    items.push({
      id: b.id,
      source: "CUTTING",
      zsplId: `${b.cuttingOrder.zsplId}-${b.bundleIdNo}`,
      spec: `${b.cuttingOrder.itemType} ${b.cuttingOrder.thickness.toString()}x${b.cuttingOrder.width.toString()}${
        b.cutLength ? `x${b.cutLength.toString()}` : ""
      } ${b.cuttingOrder.coating}/${b.cuttingOrder.temper}`,
      netWeight: b.netBundleWt?.toString() ?? "—",
      customerName: b.cuttingOrder.customer?.displayName ?? "—",
    });
  }
  for (const r of slittingRows) {
    items.push({
      id: r.id,
      source: "SLITTING",
      zsplId: r.bundleIdNo,
      spec: `${r.slittingOrder.itemType} Slit ${
        r.slitWidth?.toString() ?? r.slittingOrder.width.toString()
      } ${r.slittingOrder.coating}/${r.slittingOrder.temper}`,
      netWeight: r.netWt?.toString() ?? "—",
      customerName: r.slittingOrder.customer?.displayName ?? "—",
    });
  }
  for (const t of tradingRows) {
    items.push({
      id: t.id,
      source: "TRADING",
      zsplId: t.zsplId,
      spec: `${t.itemType} ${t.thickness.toString()}x${t.width.toString()}${
        t.length ? `x${t.length.toString()}` : ""
      } ${t.coating}/${t.temper}`,
      netWeight: t.netWeight.toString(),
      customerName: t.customer?.displayName ?? "—",
    });
  }

  return items;
}

const detailsSchema = z.object({
  buyerId: z.string().optional(),
  consigneeId: z.string().optional(),
  transporterName: z.string().optional(),
  vehicleNumber: z.string().optional(),
  lorryWeight: z.number().optional(),
  doDate: z.string().optional(),
});

export type DispatchDetails = {
  buyerId?: string;
  consigneeId?: string;
  transporterName?: string;
  vehicleNumber?: string;
  lorryWeight?: number;
  doDate?: string;
};

const selectedItemSchema = z.object({
  id: z.string(),
  source: z.enum(["CUTTING", "SLITTING", "TRADING"]),
});

// Commits a mixed selection of Cutting/Slitting/Trading finished-goods rows into one
// dispatch, sharing a single auto-assigned DO number — replacing the three separate
// dispatchCuttingBundle/dispatchSlittingProduction/dispatchTradingRow actions, each of
// which created exactly one DispatchSummary row under a manually-typed DO number.
export async function commitDispatch(
  selectedItems: { id: string; source: DispatchSource }[],
  details: DispatchDetails
): Promise<{ doNumber: string }> {
  const user = await requireDispatch();

  const items = z.array(selectedItemSchema).min(1, "Select at least one item to dispatch").parse(
    selectedItems
  );
  const data = detailsSchema.parse(details);
  const changedBy = user.email ?? "unknown";
  const fy = fiscalYearFor(new Date());

  const doNumber = await prisma.$transaction(async (tx) => {
    const seq = await nextDoSeq(tx, fy);
    const assignedDoNumber = `ZSPL/DO/${fy}/${seq}`;
    const doDate = data.doDate ? new Date(data.doDate) : new Date();

    for (const ref of items) {
      if (ref.source === "CUTTING") {
        const bundle = await tx.bundlewiseData.findUniqueOrThrow({
          where: { id: ref.id },
          include: { cuttingOrder: true },
        });
        await tx.dispatchSummary.create({
          data: {
            cuttingBundleId: bundle.id,
            cuttingOrderId: bundle.cuttingOrderId,
            doNumber: assignedDoNumber,
            doDate,
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
            dispatchStatus: "Dispatched",
            createdBy: changedBy,
          },
        });
        await tx.bundlewiseData.update({
          where: { id: bundle.id },
          data: { doNumber: assignedDoNumber },
        });
      } else if (ref.source === "SLITTING") {
        const row = await tx.slittingProductionData.findUniqueOrThrow({
          where: { id: ref.id },
          include: { slittingOrder: true },
        });
        await tx.dispatchSummary.create({
          data: {
            slittingProductionId: row.id,
            slittingOrderId: row.slittingOrderId,
            doNumber: assignedDoNumber,
            doDate,
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
            dispatchStatus: "Dispatched",
            createdBy: changedBy,
          },
        });
      } else {
        const row = await tx.tradingSummary.findUniqueOrThrow({ where: { id: ref.id } });
        await tx.dispatchSummary.create({
          data: {
            tradingId: row.id,
            doNumber: assignedDoNumber,
            doDate,
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
            dispatchStatus: "Dispatched",
            createdBy: changedBy,
          },
        });
      }
    }

    return assignedDoNumber;
  });

  await createNotification({
    message: `Dispatch ${doNumber} created with ${items.length} item(s)`,
    link: "/dispatch",
  });

  revalidatePath("/dispatch");
  revalidatePath("/production/finished-goods/cutting");
  revalidatePath("/production/finished-goods/slitting");
  revalidatePath("/production/trading");

  return { doNumber };
}
