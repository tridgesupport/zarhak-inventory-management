"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";

const customerSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  displayName: z.string().min(1, "Display name is required"),
  alpha: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  zsplCode: z.string().optional(),
  location: z.string().optional(),
  stateName: z.string().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !canEditMaster(session.user.role)) {
    throw new Error("Not authorized");
  }
}

export async function createCustomer(formData: FormData) {
  await requireAdmin();

  const parsed = customerSchema.safeParse({
    legalName: formData.get("legalName"),
    displayName: formData.get("displayName"),
    alpha: formData.get("alpha") || undefined,
    address: formData.get("address") || undefined,
    gstin: formData.get("gstin") || undefined,
    zsplCode: formData.get("zsplCode") || undefined,
    location: formData.get("location") || undefined,
    stateName: formData.get("stateName") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await prisma.customer.create({ data: parsed.data });
  revalidatePath("/masters/customers");
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = customerSchema.safeParse({
    legalName: formData.get("legalName"),
    displayName: formData.get("displayName"),
    alpha: formData.get("alpha") || undefined,
    address: formData.get("address") || undefined,
    gstin: formData.get("gstin") || undefined,
    zsplCode: formData.get("zsplCode") || undefined,
    location: formData.get("location") || undefined,
    stateName: formData.get("stateName") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await prisma.customer.update({ where: { id }, data: parsed.data });
  revalidatePath("/masters/customers");
}
