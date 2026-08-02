import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { CoilOrderDocument } from "@/lib/pdf/CoilOrderDocument";

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

  const buffer = await renderToBuffer(<CoilOrderDocument order={order} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.zsplId}-coil-order.pdf"`,
    },
  });
}
