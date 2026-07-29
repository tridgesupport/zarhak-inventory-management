"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";

const schema = z.object({
  userId: z.string().min(1),
  role: z.enum(Role),
});

export async function updateUserRole(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    throw new Error("Not authorized");
  }

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  revalidatePath("/masters/users");
}
