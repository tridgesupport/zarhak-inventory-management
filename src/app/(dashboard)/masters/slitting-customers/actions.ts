"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";

const schema = z.object({
  customerName: z.string().min(1),
  thickness: z.coerce.number().positive(),
  slittingSize: z.coerce.number().optional(),
  widthTolerance: z.string().optional(),
  noOfSlitPerPallet: z.coerce.number().int().positive(),
  slitCoilId: z.string().optional(),
  palletSize: z.string().optional(),
  remarks: z.string().optional(),
});

export async function addSlittingCustomerMaster(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canEditMaster(session.user.role)) {
    throw new Error("Not authorized");
  }
  const parsed = schema.safeParse({
    customerName: formData.get("customerName"),
    thickness: formData.get("thickness"),
    slittingSize: formData.get("slittingSize") || undefined,
    widthTolerance: formData.get("widthTolerance") || undefined,
    noOfSlitPerPallet: formData.get("noOfSlitPerPallet"),
    slitCoilId: formData.get("slitCoilId") || undefined,
    palletSize: formData.get("palletSize") || undefined,
    remarks: formData.get("remarks") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  await prisma.slittingCustomerMaster.create({ data: parsed.data });
  revalidatePath("/masters/slitting-customers");
}
