"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canSplitMasterStock } from "@/lib/permissions";
import { computeSplit, type SplitInput } from "@/lib/splitAllocation";

export async function splitMasterStock(parentId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canSplitMasterStock(session.user.role)) {
    throw new Error("Not authorized");
  }

  const splits: SplitInput[] = [];
  for (let i = 1; i <= 10; i++) {
    const raw = formData.get(`split${i}`);
    if (raw && String(raw).trim() !== "") {
      splits.push({ qty: Number(raw) });
    }
  }
  if (splits.length === 0) throw new Error("Enter at least one split quantity");

  await prisma.$transaction(async (tx) => {
    // Row-lock the parent so concurrent splits can't both read the same
    // availableWeight and overdraw it.
    const [parent] = await tx.$queryRaw<
      { id: string; availableWeight: string; noOfSplits: number; zsplId: string }[]
    >`SELECT id, "availableWeight", "noOfSplits", "zsplId" FROM "MasterStock" WHERE id = ${parentId} FOR UPDATE`;
    if (!parent) throw new Error("Master Stock row not found");

    const { childQtys, remainingAvailable } = computeSplit(
      Number(parent.availableWeight),
      splits
    );

    const full = await tx.masterStock.findUniqueOrThrow({ where: { id: parentId } });
    const baseZspl = full.zsplId.replace(/_0$/, "");

    for (let i = 0; i < childQtys.length; i++) {
      const childNum = full.noOfSplits + i + 1;
      await tx.masterStock.create({
        data: {
          inwardId: full.inwardId,
          zsplId: `${baseZspl}_${childNum}`,
          vendorName: full.vendorName,
          purchaseType: full.purchaseType,
          unloadDate: full.unloadDate,
          itemType: full.itemType,
          mill: full.mill,
          grade: full.grade,
          thickness: full.thickness,
          width: full.width,
          length: full.length ?? undefined,
          webCoating: full.webCoating ?? undefined,
          coating: full.coating,
          webTemper: full.webTemper ?? undefined,
          temper: full.temper,
          finish: full.finish,
          inwardRemarks: full.inwardRemarks,
          coilId: full.coilId,
          netWt: childQtys[i],
          noOfSheets: full.noOfSheets,
          itemForm: full.itemForm,
          purchasePrice: full.purchasePrice,
          availableWeight: childQtys[i],
          annealed: full.annealed,
          coilLength: full.coilLength ?? undefined,
          bayLocation: full.bayLocation,
          originalMasterStockId: parentId,
          status: "AVAILABLE",
          createdBy: session.user!.email ?? "unknown",
        },
      });
    }

    await tx.masterStock.update({
      where: { id: parentId },
      data: {
        availableWeight: remainingAvailable,
        noOfSplits: full.noOfSplits + childQtys.length,
        zsplId: `${baseZspl}_0`,
      },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "MasterStock",
        entityId: parentId,
        fromStatus: full.status,
        toStatus: full.status,
        changedBy: session.user!.email ?? "unknown",
        note: `Split into ${childQtys.length} sub-item(s): ${childQtys.join(", ")}`,
      },
    });
  });

  revalidatePath("/master-stock");
  revalidatePath(`/master-stock/${parentId}`);
  redirect(`/master-stock/${parentId}`);
}
