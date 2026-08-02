"use server";

import { revalidatePath } from "next/cache";
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

// Per-source single-item dispatch creation (dispatchCuttingBundle/
// dispatchSlittingProduction/dispatchTradingRow) has been replaced by the unified
// multi-step wizard at /dispatch/new (src/app/(dashboard)/dispatch/new/actions.ts),
// which can combine items from all three sources under one auto-assigned DO number
// instead of each source needing its own manually-typed DO number.

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
