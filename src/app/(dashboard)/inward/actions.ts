"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canImportInward, canReview } from "@/lib/permissions";

const unloadSchema = z.object({
  unloadedBy: z.string().min(1),
  iGrWt: z.coerce.number().positive(),
  bayLocation: z.string().min(1),
});

export async function markUnloaded(inwardId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canImportInward(session.user.role)) {
    throw new Error("Not authorized");
  }

  const parsed = unloadSchema.safeParse({
    unloadedBy: formData.get("unloadedBy"),
    iGrWt: formData.get("iGrWt"),
    bayLocation: formData.get("bayLocation"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const existing = await prisma.inwardRecord.findUniqueOrThrow({
    where: { id: inwardId },
  });

  // "first time unloadedBy is set" pattern from the source app — unloadTime is
  // stamped once and never overwritten by later edits.
  const unloadTime = existing.unloadedBy ? existing.unloadTime : new Date();

  await prisma.inwardRecord.update({
    where: { id: inwardId },
    data: {
      unloadedBy: parsed.data.unloadedBy,
      iGrWt: parsed.data.iGrWt,
      bayLocation: parsed.data.bayLocation,
      unloadTime,
    },
  });

  revalidatePath("/inward");
}

export async function resolveMatch(inwardId: string, itemDetailId: string) {
  const session = await auth();
  if (!session?.user || !canImportInward(session.user.role)) {
    throw new Error("Not authorized");
  }

  await prisma.$transaction([
    prisma.inwardRecord.update({
      where: { id: inwardId },
      data: { matchedItemId: itemDetailId },
    }),
    // Item Details status was defined (pending/matched/received) but never set anywhere
    // — wire the "matched" transition to the moment a match is actually resolved.
    prisma.itemDetail.update({
      where: { id: itemDetailId },
      data: { itemStatus: "MATCHED" },
    }),
  ]);

  revalidatePath("/inward");
}

export async function markReviewed(inwardId: string) {
  const session = await auth();
  if (!session?.user || !canReview(session.user.role)) {
    throw new Error("Not authorized");
  }

  await prisma.$transaction(async (tx) => {
    const inward = await tx.inwardRecord.findUniqueOrThrow({
      where: { id: inwardId },
    });

    if (!inward.unloadedBy || inward.iGrWt === null || !inward.bayLocation) {
      throw new Error(
        "Unloaded By, I Gr Wt and Bay Location must be filled before review"
      );
    }
    if (inward.reviewBy) return; // already reviewed, no-op

    await tx.inwardRecord.update({
      where: { id: inwardId },
      data: { reviewBy: session.user!.email ?? "unknown" },
    });

    const matchedItem = inward.matchedItemId
      ? await tx.itemDetail.findUnique({ where: { id: inward.matchedItemId } })
      : null;

    if (matchedItem) {
      await tx.itemDetail.update({
        where: { id: matchedItem.id },
        data: { itemStatus: "RECEIVED" },
      });
    }

    // Replaces the AppSheet "transfer data from inward to master stock" bot —
    // done synchronously in the same transaction instead of an async webhook.
    await tx.masterStock.create({
      data: {
        inwardId: inward.id,
        zsplId: inward.zsplId,
        vendorName: inward.vendorName,
        purchaseType: inward.purchaseType,
        unloadDate: inward.unloadTime ?? new Date(),
        itemType: inward.itemType,
        mill: inward.mill,
        grade: inward.grade,
        thickness: inward.thickness,
        width: inward.width,
        length: inward.length ?? undefined,
        webCoating: inward.webCoating ?? undefined,
        coating: inward.coating,
        webTemper: inward.webTemper ?? undefined,
        temper: inward.temper,
        finish: inward.finish,
        inwardRemarks: inward.inwardRemarks,
        coilId: inward.coilId,
        netWt: inward.iGrWt, // "this is actually I Gr Wt but shown as net weight" — per source app
        noOfSheets: inward.noOfSheets?.toString(),
        itemForm: inward.length ? "Bundle" : "Coil",
        purchasePrice: matchedItem?.purchasePrice ?? 0,
        availableWeight: inward.iGrWt,
        annealed: inward.annealedType,
        coilLength: inward.coilLength ?? undefined,
        bayLocation: inward.bayLocation,
        createdBy: session.user!.email ?? "unknown",
      },
    });
  });

  revalidatePath("/inward");
  revalidatePath("/master-stock");
}
