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

const slitPlanSchema = z.object({
  slit1: z.coerce.number().optional(),
  slit2: z.coerce.number().optional(),
  slit3: z.coerce.number().optional(),
  slit4: z.coerce.number().optional(),
  noOfSlit1: z.coerce.number().int().optional(),
  noOfSlit2: z.coerce.number().int().optional(),
  noOfSlit3: z.coerce.number().int().optional(),
  noOfSlit4: z.coerce.number().int().optional(),
  productionPlanDate: z.string().optional(),
  vendorName: z.string().optional(),
  jobWorkVendorName: z.string().optional(),
  truckNo: z.string().optional(),
  slittingCustomerMasterSerial1: z.string().optional(),
  slittingCustomerMasterSerial2: z.string().optional(),
  slittingCustomerMasterSerial3: z.string().optional(),
  slittingCustomerMasterSerial4: z.string().optional(),
});

export async function updateSlitPlan(id: string, formData: FormData) {
  await requireProduction();
  const parsed = slitPlanSchema.safeParse({
    slit1: formData.get("slit1") || undefined,
    slit2: formData.get("slit2") || undefined,
    slit3: formData.get("slit3") || undefined,
    slit4: formData.get("slit4") || undefined,
    noOfSlit1: formData.get("noOfSlit1") || undefined,
    noOfSlit2: formData.get("noOfSlit2") || undefined,
    noOfSlit3: formData.get("noOfSlit3") || undefined,
    noOfSlit4: formData.get("noOfSlit4") || undefined,
    productionPlanDate: formData.get("productionPlanDate") || undefined,
    vendorName: formData.get("vendorName") || undefined,
    jobWorkVendorName: formData.get("jobWorkVendorName") || undefined,
    truckNo: formData.get("truckNo") || undefined,
    slittingCustomerMasterSerial1: formData.get("slittingCustomerMasterSerial1") || undefined,
    slittingCustomerMasterSerial2: formData.get("slittingCustomerMasterSerial2") || undefined,
    slittingCustomerMasterSerial3: formData.get("slittingCustomerMasterSerial3") || undefined,
    slittingCustomerMasterSerial4: formData.get("slittingCustomerMasterSerial4") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;

  await prisma.slittingOrderSummary.update({
    where: { id },
    data: {
      ...data,
      productionPlanDate: data.productionPlanDate
        ? new Date(data.productionPlanDate)
        : undefined,
    },
  });

  revalidatePath(`/production/slitting/${id}`);
  revalidatePath("/production/slitting");
}

const productionSchema = z.object({
  count: z.coerce.number().int().min(1).max(26),
  netWt: z.coerce.number().optional(),
  grossWt: z.coerce.number().optional(),
  slitWidth: z.coerce.number().optional(),
});

const BUNDLE_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export async function addSlittingProduction(slittingOrderId: string, formData: FormData) {
  const user = await requireProduction();
  const parsed = productionSchema.safeParse({
    count: formData.get("count"),
    netWt: formData.get("netWt") || undefined,
    grossWt: formData.get("grossWt") || undefined,
    slitWidth: formData.get("slitWidth") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;
  const order = await prisma.slittingOrderSummary.findUniqueOrThrow({
    where: { id: slittingOrderId },
  });

  const ids = BUNDLE_LETTERS.slice(0, data.count);
  await prisma.slittingProductionData.createMany({
    data: ids.map((letter) => ({
      slittingOrderId,
      bundleIdNo: `${order.zsplId}_${letter}`,
      slitWidth: data.slitWidth,
      netWt: data.netWt,
      grossWt: data.grossWt,
      availableWeight: data.netWt ?? 0,
      createdBy: user.email ?? "unknown",
    })),
  });

  await createNotification({
    message: `${ids.length} Slitting Production Data record(s) created for ${order.zsplId}`,
    link: `/production/slitting/${slittingOrderId}`,
  });

  revalidatePath(`/production/slitting/${slittingOrderId}`);
}

export async function markSlittingCompleted(id: string) {
  await requireProduction();
  await prisma.slittingOrderSummary.update({
    where: { id },
    data: { productionStatus: "COMPLETED" },
  });
  revalidatePath(`/production/slitting/${id}`);
  revalidatePath("/production/slitting");
}
