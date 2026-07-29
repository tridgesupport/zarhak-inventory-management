import { prisma } from "@/lib/db";

// Replaces the AppSheet in-app Notification bot (e.g. "Slitting Production Data
// record created"). userId is optional — omitted means a broadcast notification
// visible to everyone (rendered the same way in the UI for Phase 3's scope).
export async function createNotification(input: {
  message: string;
  link?: string;
  userId?: string;
}) {
  await prisma.notification.create({
    data: {
      message: input.message,
      link: input.link,
      userId: input.userId,
    },
  });
}

// A user sees their own notifications plus every broadcast (userId null) one.
function visibleToUser(userId: string) {
  return { OR: [{ userId }, { userId: null }] };
}

export async function getRecentNotifications(userId: string, take = 10) {
  return prisma.notification.findMany({
    where: visibleToUser(userId),
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { ...visibleToUser(userId), read: false },
  });
}
