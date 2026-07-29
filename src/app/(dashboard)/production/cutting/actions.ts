"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

async function requireProduction() {
  const session = await auth();
  if (!session?.user || !canManageProduction(session.user.role)) {
    throw new Error("Not authorized");
  }
  return session.user;
}

const planningSchema = z.object({
  length: z.coerce.number().positive().optional(),
  productionPlanDate: z.string().optional(),
  noOfSheetsPerPallet: z.coerce.number().positive().optional(),
  wtPerBundle: z.coerce.number().positive().optional(),
  noOfBundles: z.coerce.number().int().positive().optional(),
  packingType: z.string().optional(),
  productionSequence: z.coerce.number().int().optional(),
});

export async function updatePlanning(id: string, formData: FormData) {
  const user = await requireProduction();

  const parsed = planningSchema.safeParse({
    length: formData.get("length") || undefined,
    productionPlanDate: formData.get("productionPlanDate") || undefined,
    noOfSheetsPerPallet: formData.get("noOfSheetsPerPallet") || undefined,
    wtPerBundle: formData.get("wtPerBundle") || undefined,
    noOfBundles: formData.get("noOfBundles") || undefined,
    packingType: formData.get("packingType") || undefined,
    productionSequence: formData.get("productionSequence") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;

  const current = await prisma.cuttingOrderSummary.findUniqueOrThrow({ where: { id } });
  const hasLength = data.length !== undefined || current.length !== null;

  await prisma.cuttingOrderSummary.update({
    where: { id },
    data: {
      length: data.length ?? undefined,
      productionPlanDate: data.productionPlanDate
        ? new Date(data.productionPlanDate)
        : undefined,
      noOfSheetsPerPallet: data.noOfSheetsPerPallet,
      wtPerBundle: data.wtPerBundle,
      noOfBundles: data.noOfBundles,
      packingType: data.packingType,
      productionSequence: data.productionSequence,
      productionStatus: hasLength ? "PENDING_PRODUCTION" : "INPUT_CUT_LENGTH",
    },
  });

  void user;
  revalidatePath(`/production/cutting/${id}`);
  revalidatePath("/production/cutting");
}

export async function approveCuttingOrder(id: string) {
  const user = await requireProduction();

  await prisma.cuttingOrderSummary.update({
    where: { id },
    data: { approvedBy: user.email ?? "unknown", approvedAt: new Date() },
  });

  revalidatePath(`/production/cutting/${id}`);
  revalidatePath("/production/cutting");
}

const machineProductionSchema = z.object({
  shift: z.string().optional(),
  mainOperator: z.string().optional(),
  assistantOperator: z.string().optional(),
  coilFeedingOperator: z.string().optional(),
  actualNetWeight: z.coerce.number().optional(),
  actualWidth: z.coerce.number().optional(),
  actualThickness: z.coerce.number().optional(),
  totalSheets: z.coerce.number().int().optional(),
  totalPrimeSheet: z.coerce.number().int().optional(),
  totalRejectSheets: z.coerce.number().int().optional(),
  productionEndTime: z.string().optional(),
});

export async function addMachineProduction(cuttingOrderId: string, formData: FormData) {
  const user = await requireProduction();

  const parsed = machineProductionSchema.safeParse({
    shift: formData.get("shift") || undefined,
    mainOperator: formData.get("mainOperator") || undefined,
    assistantOperator: formData.get("assistantOperator") || undefined,
    coilFeedingOperator: formData.get("coilFeedingOperator") || undefined,
    actualNetWeight: formData.get("actualNetWeight") || undefined,
    actualWidth: formData.get("actualWidth") || undefined,
    actualThickness: formData.get("actualThickness") || undefined,
    totalSheets: formData.get("totalSheets") || undefined,
    totalPrimeSheet: formData.get("totalPrimeSheet") || undefined,
    totalRejectSheets: formData.get("totalRejectSheets") || undefined,
    productionEndTime: formData.get("productionEndTime") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.machineProduction.create({
      data: {
        cuttingOrderId,
        shift: data.shift,
        mainOperator: data.mainOperator,
        assistantOperator: data.assistantOperator,
        coilFeedingOperator: data.coilFeedingOperator,
        actualNetWeight: data.actualNetWeight,
        actualWidth: data.actualWidth,
        actualThickness: data.actualThickness,
        totalSheets: data.totalSheets,
        totalPrimeSheets: data.totalPrimeSheet,
        totalRejectSheets: data.totalRejectSheets,
        productionEndTime: data.productionEndTime ? new Date(data.productionEndTime) : undefined,
        createdBy: user.email ?? "unknown",
      },
    });

    // Filling Production End Time is the trigger that moves the order out of the
    // Daily Cutting queue into Completed / Finished Goods.
    if (data.productionEndTime) {
      await tx.cuttingOrderSummary.update({
        where: { id: cuttingOrderId },
        data: { productionStatus: "COMPLETED" },
      });
    }
  });

  revalidatePath(`/production/cutting/${cuttingOrderId}`);
  revalidatePath("/production/cutting");
}

const qualityDataSchema = z.object({
  hardness: z.coerce.number().optional(),
  actualTemper: z.string().optional(),
  cuppingValue: z.coerce.number().optional(),
  sheetSize: z.coerce.number().optional(),
  bow: z.string().optional(),
  squareness: z.string().optional(),
  defectsObserved: z.string().optional(),
});

export async function addQualityData(cuttingOrderId: string, formData: FormData) {
  const user = await requireProduction();

  const parsed = qualityDataSchema.safeParse({
    hardness: formData.get("hardness") || undefined,
    actualTemper: formData.get("actualTemper") || undefined,
    cuppingValue: formData.get("cuppingValue") || undefined,
    sheetSize: formData.get("sheetSize") || undefined,
    bow: formData.get("bow") || undefined,
    squareness: formData.get("squareness") || undefined,
    defectsObserved: formData.get("defectsObserved") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await prisma.qualityData.create({
    data: { cuttingOrderId, ...parsed.data, createdBy: user.email ?? "unknown" },
  });

  revalidatePath(`/production/cutting/${cuttingOrderId}`);
}

const BUNDLE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const bundleSchema = z.object({
  count: z.coerce.number().int().min(1).max(26),
  preparedBy: z.string().optional(),
  reviewedBy: z.string().optional(),
  noOfSheets: z.coerce.number().int().optional(),
  palletWeight: z.coerce.number().optional(),
  grossBundleWt: z.coerce.number().optional(),
  includeReject: z.string().optional(), // "on" if checkbox checked
  includeScrap: z.string().optional(),
});

// Creates `count` lettered bundles (A, B, C…) plus optional "XX" reject / "YY" scrap
// placeholder bundles for one production run, per the docx's documented convention.
export async function addBundlewiseData(cuttingOrderId: string, formData: FormData) {
  const user = await requireProduction();

  const parsed = bundleSchema.safeParse({
    count: formData.get("count"),
    preparedBy: formData.get("preparedBy") || undefined,
    reviewedBy: formData.get("reviewedBy") || undefined,
    noOfSheets: formData.get("noOfSheets") || undefined,
    palletWeight: formData.get("palletWeight") || undefined,
    grossBundleWt: formData.get("grossBundleWt") || undefined,
    includeReject: formData.get("includeReject") || undefined,
    includeScrap: formData.get("includeScrap") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;
  const cuttingOrder = await prisma.cuttingOrderSummary.findUniqueOrThrow({
    where: { id: cuttingOrderId },
  });

  const netBundleWt =
    data.grossBundleWt !== undefined && data.palletWeight !== undefined
      ? data.grossBundleWt - data.palletWeight
      : undefined;

  const ids = BUNDLE_LETTERS.slice(0, data.count);
  if (data.includeReject === "on") ids.push("XX");
  if (data.includeScrap === "on") ids.push("YY");

  await prisma.bundlewiseData.createMany({
    data: ids.map((bundleIdNo) => ({
      cuttingOrderId,
      bundleIdNo,
      cutLength: cuttingOrder.length ?? undefined,
      preparedBy: data.preparedBy,
      reviewedBy: data.reviewedBy,
      noOfSheets: data.noOfSheets,
      palletWeight: data.palletWeight,
      grossBundleWt: data.grossBundleWt,
      netBundleWt,
      availableWeight: netBundleWt ?? 0,
      createdBy: user.email ?? "unknown",
    })),
  });

  revalidatePath(`/production/cutting/${cuttingOrderId}`);
}

export async function approveBundle(bundleId: string) {
  const user = await requireProduction();
  await prisma.bundlewiseData.update({
    where: { id: bundleId },
    data: { status: "APPROVED" },
  });
  const bundle = await prisma.bundlewiseData.findUniqueOrThrow({ where: { id: bundleId } });
  await createNotification({
    message: `Bundle ${bundle.bundleIdNo} approved for Finished Goods`,
    link: `/production/cutting/${bundle.cuttingOrderId}`,
  });
  void user;
  revalidatePath(`/production/cutting/${bundle.cuttingOrderId}`);
  revalidatePath("/production/finished-goods/cutting");
}
