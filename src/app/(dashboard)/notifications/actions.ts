"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// Notification.read is a single global flag (not per-user) — matches the source
// app's simple in-app Notification bot. Marking one read marks it read for everyone
// who can see it, which is an acceptable simplification at this scope.
export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorized");

  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorized");

  await prisma.notification.updateMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }], read: false },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
