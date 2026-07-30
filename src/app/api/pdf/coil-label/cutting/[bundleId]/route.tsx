import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { CoilLabelDocument, type CoilLabelData } from "@/lib/pdf/CoilLabelDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  const { bundleId } = await params;
  const bundle = await prisma.bundlewiseData.findUniqueOrThrow({
    where: { id: bundleId },
    include: {
      cuttingOrder: {
        include: { customer: true, masterStock: { include: { inward: true } } },
      },
    },
  });

  const data: CoilLabelData = {
    customer: bundle.cuttingOrder.customer?.displayName,
    bundleNo: `${bundle.cuttingOrder.zsplId}-${bundle.bundleIdNo}`,
    prodDate: bundle.productionDate.toISOString().slice(0, 10),
    item: bundle.cuttingOrder.itemType,
    thickness: bundle.cuttingOrder.thickness.toString(),
    width: bundle.cuttingOrder.width.toString(),
    cutLength: bundle.cutLength?.toString(),
    coating: bundle.cuttingOrder.coating,
    temper: bundle.cuttingOrder.temper,
    finish: bundle.cuttingOrder.finish,
    tareWt: bundle.palletWeight?.toString(),
    grossWt: bundle.grossBundleWt?.toString(),
    netWt: bundle.netBundleWt?.toString(),
    noOfSheets: bundle.noOfSheets?.toString(),
    tcNo: bundle.cuttingOrder.masterStock.inward?.millTc,
    supplierCoilNo: bundle.cuttingOrder.masterStock.coilId,
    remarks: bundle.cuttingOrder.salesRemark,
  };

  const buffer = await renderToBuffer(<CoilLabelDocument data={data} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.bundleNo}-label.pdf"`,
    },
  });
}
