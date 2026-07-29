"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";
import { computeSplit, type SplitInput } from "@/lib/splitAllocation";

export async function splitSlittingProduction(parentId: string, formData: FormData) {
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

  let slittingOrderId = "";

  await prisma.$transaction(async (tx) => {
    const [parent] = await tx.$queryRaw<
      { id: string; availableWeight: string; noOfSplits: number }[]
    >`SELECT id, "availableWeight", "noOfSplits" FROM "SlittingProductionData" WHERE id = ${parentId} FOR UPDATE`;
    if (!parent) throw new Error("Slitting production row not found");

    const { childQtys, remainingAvailable } = computeSplit(
      Number(parent.availableWeight),
      splits
    );
    const full = await tx.slittingProductionData.findUniqueOrThrow({
      where: { id: parentId },
    });
    slittingOrderId = full.slittingOrderId;

    for (let i = 0; i < childQtys.length; i++) {
      await tx.slittingProductionData.create({
        data: {
          slittingOrderId: full.slittingOrderId,
          bundleIdNo: `${full.bundleIdNo}_${full.noOfSplits + i + 1}`,
          slitWidth: full.slitWidth ?? undefined,
          noOfSlitCoils: full.noOfSlitCoils,
          netWt: childQtys[i],
          grossWt: full.grossWt ?? undefined,
          availableWeight: childQtys[i],
          originalSlitId: parentId,
          createdBy: session.user!.email ?? "unknown",
        },
      });
    }

    await tx.slittingProductionData.update({
      where: { id: parentId },
      data: {
        availableWeight: remainingAvailable,
        noOfSplits: full.noOfSplits + childQtys.length,
      },
    });
  });

  revalidatePath(`/production/slitting/${slittingOrderId}`);
  redirect(`/production/slitting/${slittingOrderId}`);
}
