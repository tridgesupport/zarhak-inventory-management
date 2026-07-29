"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(1),
  gstNo: z.string().optional(),
});

export async function addTransporter(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canEditMaster(session.user.role)) {
    throw new Error("Not authorized");
  }
  const parsed = schema.safeParse({
    name: formData.get("name"),
    gstNo: formData.get("gstNo") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  await prisma.transporter.upsert({
    where: { name: parsed.data.name },
    update: { gstNo: parsed.data.gstNo },
    create: parsed.data,
  });
  revalidatePath("/masters/transporters");
}
