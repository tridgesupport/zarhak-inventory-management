"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { LookupDomain } from "@/generated/prisma/enums";

// Note: unlike the rest of master data, adding a new dropdown value is intentionally
// NOT admin-gated — the source AppSheet app's defining behavior here is self-service
// append (anyone can add a value with no approval), and Phase 1 preserves that.

const addValueSchema = z.object({
  domain: z.enum(LookupDomain),
  value: z.string().min(1, "Value is required"),
});

export async function addLookupValue(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorized");

  const parsed = addValueSchema.safeParse({
    domain: formData.get("domain"),
    value: formData.get("value"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await prisma.lookupValue.upsert({
    where: {
      domain_value: { domain: parsed.data.domain, value: parsed.data.value },
    },
    update: { isActive: true },
    create: {
      domain: parsed.data.domain,
      value: parsed.data.value,
      createdBy: session.user.email ?? undefined,
    },
  });

  revalidatePath("/masters/dropdowns");
}

export async function deactivateLookupValue(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorized");

  await prisma.lookupValue.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/masters/dropdowns");
}
