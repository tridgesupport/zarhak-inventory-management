"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canTransitionMasterStock } from "@/lib/permissions";
import { nextSalesSeq, fiscalYearFor } from "@/lib/sequences";
import { MasterStockStatus } from "@/generated/prisma/enums";

const transitionSchema = z.object({
  target: z.enum(MasterStockStatus),
  productionWeight: z.coerce.number().positive().optional(),
  customerId: z.string().optional(),
  salePrice: z.coerce.number().positive().optional(),
  salesType: z.string().optional(),
  requestedDeliveryDate: z.string().optional(),
  salesRemark: z.string().optional(),
  customerPoNo: z.string().optional(),
  deliveryLocation: z.string().optional(),
  endUse: z.string().optional(),
  cutLength: z.coerce.number().positive().optional(),
});

// Single state-machine entry point for every Master Stock status change — mirrors the
// plan's design so the same shape can be reused once Phase 2 hooks into Sold routing.
export async function transitionMasterStock(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !canTransitionMasterStock(session.user.role)) {
    throw new Error("Not authorized");
  }

  const parsed = transitionSchema.safeParse({
    target: formData.get("target"),
    productionWeight: formData.get("productionWeight") || undefined,
    customerId: formData.get("customerId") || undefined,
    salePrice: formData.get("salePrice") || undefined,
    salesType: formData.get("salesType") || undefined,
    requestedDeliveryDate: formData.get("requestedDeliveryDate") || undefined,
    salesRemark: formData.get("salesRemark") || undefined,
    customerPoNo: formData.get("customerPoNo") || undefined,
    deliveryLocation: formData.get("deliveryLocation") || undefined,
    endUse: formData.get("endUse") || undefined,
    cutLength: formData.get("cutLength") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;

  const current = await prisma.masterStock.findUniqueOrThrow({ where: { id } });

  if (data.target === "AVAILABLE" || data.target === "CANCELLED") {
    // Returning to Available (or cancelling) clears sale-specific fields.
    await prisma.$transaction([
      prisma.masterStock.update({
        where: { id },
        data: {
          status: data.target === "CANCELLED" ? "CANCELLED" : "AVAILABLE",
          customerId: null,
          salesDate: null,
          salePrice: null,
          salesRemark: null,
          salesType: null,
          requestedDeliveryDate: null,
          salesPoNumber: null,
        },
      }),
      prisma.statusHistory.create({
        data: {
          entityType: "MasterStock",
          entityId: id,
          fromStatus: current.status,
          toStatus: data.target,
          changedBy: session.user.email ?? "unknown",
        },
      }),
    ]);
    revalidatePath("/master-stock");
    return;
  }

  // OFFERED / BOOKED / SOLD all require the same 4 "starred" fields per the source app.
  if (!data.productionWeight || !data.customerId || !data.salePrice || !data.salesType) {
    throw new Error(
      "Production Weight, Customer, Sale Price and Sales Type are required to change status"
    );
  }

  let salesPoNumber = current.salesPoNumber;
  if (data.target === "SOLD") {
    if (!data.requestedDeliveryDate) {
      throw new Error("Requested Delivery Date is required to mark Sold");
    }
    const fy = fiscalYearFor(new Date());
    salesPoNumber = await prisma.$transaction(async (tx) => {
      const seq = await nextSalesSeq(tx, fy);
      return `ZSPL/SO/${fy}/${seq}`;
    });
  }

  await prisma.$transaction([
    prisma.masterStock.update({
      where: { id },
      data: {
        status: data.target,
        productionWeight: data.productionWeight,
        customerId: data.customerId,
        salePrice: data.salePrice,
        salesType: data.salesType,
        salesRemark: data.salesRemark,
        customerPoNo: data.customerPoNo,
        deliveryLocation: data.deliveryLocation,
        endUse: data.endUse,
        salesDate: new Date(),
        requestedDeliveryDate: data.requestedDeliveryDate
          ? new Date(data.requestedDeliveryDate)
          : undefined,
        salesPoNumber: salesPoNumber ?? undefined,
        length: data.cutLength ?? undefined,
      },
    }),
    prisma.statusHistory.create({
      data: {
        entityType: "MasterStock",
        entityId: id,
        fromStatus: current.status,
        toStatus: data.target,
        changedBy: session.user.email ?? "unknown",
      },
    }),
  ]);

  revalidatePath("/master-stock");
  revalidatePath(`/master-stock/${id}`);
}
