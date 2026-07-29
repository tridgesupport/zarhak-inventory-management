"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditPO } from "@/lib/permissions";
import { nextPoSeq, fiscalYearFor } from "@/lib/sequences";
import { encodeIdForUrl } from "@/lib/urlId";

const schema = z.object({
  orderType: z.string().min(1),
  poType: z.string().min(1),
  poGrade: z.string().min(1),
  typeOfSteel: z.string().min(1),
  vendorName: z.string().min(1),
  shipTo: z.string().min(1),
  mill: z.string().min(1),
  orderCategory: z.string().min(1),
  remark: z.string().optional(),
});

export async function createPurchaseOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user || !canEditPO(session.user.role)) {
    throw new Error("Not authorized");
  }

  const parsed = schema.safeParse({
    orderType: formData.get("orderType"),
    poType: formData.get("poType"),
    poGrade: formData.get("poGrade"),
    typeOfSteel: formData.get("typeOfSteel"),
    vendorName: formData.get("vendorName"),
    shipTo: formData.get("shipTo"),
    mill: formData.get("mill"),
    orderCategory: formData.get("orderCategory"),
    remark: formData.get("remark") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const now = new Date();
  const fy = fiscalYearFor(now);
  const data = parsed.data;

  const po = await prisma.$transaction(async (tx) => {
    const seq = await nextPoSeq(tx, fy);
    const poNumber = `ZSPL/${data.orderType}/${data.poType}/${data.poGrade}/${fy}/${seq}`;
    return tx.purchaseOrder.create({
      data: {
        poNumber,
        poSeq: seq,
        fy,
        poDate: now,
        orderType: data.orderType,
        poType: data.poType,
        poGrade: data.poGrade,
        typeOfSteel: data.typeOfSteel,
        vendorName: data.vendorName,
        shipTo: data.shipTo,
        mill: data.mill,
        orderCategory: data.orderCategory,
        remark: data.remark,
        createdBy: session.user.email ?? "unknown",
      },
    });
  });

  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${encodeIdForUrl(po.id)}`);
}
