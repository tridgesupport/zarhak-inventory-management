"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canTransitionMasterStock } from "@/lib/permissions";
import { nextSalesSeq, fiscalYearFor } from "@/lib/sequences";
import { MasterStockStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

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

// Single state-machine entry point for every Master Stock status change. On a
// transition to SOLD, also auto-creates the Phase 2 production-path row (Cutting/
// Slitting/Trading) that salesType routes to — replacing the AppSheet bot
// "Update sales order number and update cutting or splitting table".
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
  const changedBy = session.user.email ?? "unknown";

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
          changedBy,
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
  if (data.target === "SOLD" && !data.requestedDeliveryDate) {
    throw new Error("Requested Delivery Date is required to mark Sold");
  }

  await prisma.$transaction(async (tx) => {
    let salesPoNumber = current.salesPoNumber;
    if (data.target === "SOLD") {
      const fy = fiscalYearFor(new Date());
      const seq = await nextSalesSeq(tx, fy);
      salesPoNumber = `ZSPL/SO/${fy}/${seq}`;
    }

    const updated = await tx.masterStock.update({
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
    });

    await tx.statusHistory.create({
      data: {
        entityType: "MasterStock",
        entityId: id,
        fromStatus: current.status,
        toStatus: data.target,
        changedBy,
      },
    });

    if (data.target === "SOLD") {
      await routeToProductionPath(tx, updated, changedBy);
    }
  });

  revalidatePath("/master-stock");
  revalidatePath(`/master-stock/${id}`);
}

async function routeToProductionPath(
  tx: Prisma.TransactionClient,
  stock: Prisma.MasterStockGetPayload<Record<string, never>>,
  createdBy: string
) {
  const salesType = (stock.salesType ?? "").toLowerCase();
  const common = {
    masterStockId: stock.id,
    customerId: stock.customerId,
    zsplId: stock.zsplId,
    itemType: stock.itemType,
    grade: stock.grade,
    mill: stock.mill,
    thickness: stock.thickness,
    width: stock.width,
    coating: stock.coating,
    temper: stock.temper,
    finish: stock.finish,
    bayLocation: stock.bayLocation,
    createdBy,
  };

  if (salesType === "cutting") {
    await tx.cuttingOrderSummary.create({
      data: {
        ...common,
        netWt: stock.netWt,
        productionWt: stock.productionWeight ?? undefined,
        soldPrice: stock.salePrice ?? undefined,
        salesRemark: stock.salesRemark,
        requestedDeliveryDate: stock.requestedDeliveryDate ?? undefined,
        availableWeight: stock.availableWeight,
        length: stock.length ?? undefined, // cut length, if already set on Master Stock
        coilId: stock.coilId,
        coilLength: stock.coilLength ?? undefined,
        productionStatus: stock.length ? "PENDING_PRODUCTION" : "INPUT_CUT_LENGTH",
      },
    });
  } else if (salesType === "slitting") {
    // No availableWeight/split fields here — SlittingOrderSummary tracks splits at the
    // SlittingProductionData level, not the order level.
    await tx.slittingOrderSummary.create({
      data: {
        ...common,
        netWt: stock.netWt,
        productionWt: stock.productionWeight ?? undefined,
        soldPrice: stock.salePrice ?? undefined,
        salesRemark: stock.salesRemark,
        requiredDeliveryDate: stock.requestedDeliveryDate ?? undefined,
      },
    });
  } else if (salesType === "trading") {
    // TradingSummary has no productionWt/soldPrice/salesRemark/netWt fields — it's a
    // simpler pass-through model, just netWeight.
    await tx.tradingSummary.create({
      data: {
        ...common,
        availableWeight: stock.availableWeight,
        length: stock.length ?? undefined,
        netWeight: stock.netWt,
        itemForm: stock.itemForm,
      },
    });
  }
  // Unrecognized salesType: leave Master Stock as Sold with no downstream row rather
  // than guessing a routing — matches the "never silently coerce" principle used
  // throughout the migration scripts.
}
