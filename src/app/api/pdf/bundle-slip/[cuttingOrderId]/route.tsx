import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { BundleSlipDocument } from "@/lib/pdf/BundleSlipDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cuttingOrderId: string }> }
) {
  const { cuttingOrderId } = await params;
  const order = await prisma.cuttingOrderSummary.findUniqueOrThrow({
    where: { id: cuttingOrderId },
    include: {
      customer: true,
      bundlewiseData: { orderBy: { bundleIdNo: "asc" } },
    },
  });

  const buffer = await renderToBuffer(<BundleSlipDocument order={order} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.zsplId}-bundle-slip.pdf"`,
    },
  });
}
