"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";

const coatingSchema = z.object({
  coating: z.string().min(1),
  webCoating: z.string().min(1),
});

const temperSchema = z.object({
  temper: z.string().min(1),
  webTemper: z.coerce.number(),
});

export async function addCoatingMapping(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canEditMaster(session.user.role)) {
    throw new Error("Not authorized");
  }
  const parsed = coatingSchema.safeParse({
    coating: formData.get("coating"),
    webCoating: formData.get("webCoating"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  await prisma.coatingMapping.upsert({
    where: { coating: parsed.data.coating },
    update: { webCoating: parsed.data.webCoating },
    create: parsed.data,
  });
  revalidatePath("/masters/coating-temper");
}

export async function addTemperMapping(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canEditMaster(session.user.role)) {
    throw new Error("Not authorized");
  }
  const parsed = temperSchema.safeParse({
    temper: formData.get("temper"),
    webTemper: formData.get("webTemper"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  await prisma.temperMapping.upsert({
    where: { temper: parsed.data.temper },
    update: { webTemper: parsed.data.webTemper },
    create: parsed.data,
  });
  revalidatePath("/masters/coating-temper");
}
