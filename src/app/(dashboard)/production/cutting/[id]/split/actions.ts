"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";
import { computeSplit, type SplitInput } from "@/lib/splitAllocation";

export async function splitCuttingOrder(parentId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canManageProduction(session.user.role)) {
    throw new Error("Not authorized");
  }

  const splits: SplitInput[] = [];
  for (let i = 1; i <= 10; i++) {
    const raw = formData.get(`split${i}`);
    if (raw && String(raw).trim() !== "") splits.push({ qty: Number(raw) });
  }
  if (splits.length === 0) throw new Error("Enter at least one split quantity");

  await prisma.$transaction(async (tx) => {
    const [parent] = await tx.$queryRaw<
      { id: string; availableWeight: string; noOfSplits: number }[]
    >`SELECT id, "availableWeight", "noOfSplits" FROM "CuttingOrderSummary" WHERE id = ${parentId} FOR UPDATE`;
    if (!parent) throw new Error("Cutting order not found");

    const { childQtys, remainingAvailable } = computeSplit(
      Number(parent.availableWeight),
      splits
    );

    const full = await tx.cuttingOrderSummary.findUniqueOrThrow({ where: { id: parentId } });

    for (let i = 0; i < childQtys.length; i++) {
      await tx.cuttingOrderSummary.create({
        data: {
          masterStockId: full.masterStockId,
          customerId: full.customerId,
          zsplId: `${full.zsplId}_${full.noOfSplits + i + 1}`,
          itemType: full.itemType,
          grade: full.grade,
          mill: full.mill,
          thickness: full.thickness,
          width: full.width,
          length: full.length ?? undefined,
          coating: full.coating,
          temper: full.temper,
          finish: full.finish,
          netWt: childQtys[i],
          productionWt: childQtys[i],
          soldPrice: full.soldPrice ?? undefined,
          salesRemark: full.salesRemark,
          requestedDeliveryDate: full.requestedDeliveryDate ?? undefined,
          bayLocation: full.bayLocation,
          coilId: full.coilId,
          coilLength: full.coilLength ?? undefined,
          availableWeight: childQtys[i],
          originalCuttingOrderId: parentId,
          productionStatus: full.productionStatus,
          createdBy: session.user!.email ?? "unknown",
        },
      });
    }

    await tx.cuttingOrderSummary.update({
      where: { id: parentId },
      data: {
        availableWeight: remainingAvailable,
        noOfSplits: full.noOfSplits + childQtys.length,
      },
    });
  });

  revalidatePath("/production/cutting");
  revalidatePath(`/production/cutting/${parentId}`);
  redirect(`/production/cutting/${parentId}`);
}
