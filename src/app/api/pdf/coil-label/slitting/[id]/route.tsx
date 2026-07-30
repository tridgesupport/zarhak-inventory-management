import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { CoilLabelDocument, type CoilLabelData } from "@/lib/pdf/CoilLabelDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = await prisma.slittingProductionData.findUniqueOrThrow({
    where: { id },
    include: {
      slittingOrder: {
        include: { customer: true, masterStock: { include: { inward: true } } },
      },
    },
  });

  const data: CoilLabelData = {
    customer: row.slittingOrder.customer?.displayName,
    bundleNo: row.bundleIdNo,
    prodDate: row.createdAt.toISOString().slice(0, 10),
    item: row.slittingOrder.itemType,
    thickness: row.slittingOrder.thickness.toString(),
    width: row.slitWidth?.toString() ?? row.slittingOrder.width.toString(),
    coating: row.slittingOrder.coating,
    temper: row.slittingOrder.temper,
    finish: row.slittingOrder.finish,
    grossWt: row.grossWt?.toString(),
    netWt: row.netWt?.toString(),
    noOfSheets: row.noOfSlitCoils?.toString(),
    tcNo: row.slittingOrder.masterStock.inward?.millTc,
    supplierCoilNo: row.slittingOrder.masterStock.coilId,
    remarks: row.slittingOrder.salesRemark,
  };

  const buffer = await renderToBuffer(<CoilLabelDocument data={data} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.bundleNo}-label.pdf"`,
    },
  });
}
