"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";

const schema = z.object({
  dispatchLocation: z.string().optional(),
  doNo: z.string().optional(),
  doDate: z.string().optional(),
  grossWeight: z.coerce.number().optional(),
});

export async function updateTradingDispatchInfo(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canManageProduction(session.user.role)) {
    throw new Error("Not authorized");
  }
  const parsed = schema.safeParse({
    dispatchLocation: formData.get("dispatchLocation") || undefined,
    doNo: formData.get("doNo") || undefined,
    doDate: formData.get("doDate") || undefined,
    grossWeight: formData.get("grossWeight") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;

  await prisma.tradingSummary.update({
    where: { id },
    data: {
      dispatchLocation: data.dispatchLocation,
      doNo: data.doNo,
      doDate: data.doDate ? new Date(data.doDate) : undefined,
      grossWeight: data.grossWeight,
    },
  });

  revalidatePath(`/production/trading/${id}`);
  revalidatePath("/production/trading");
}
