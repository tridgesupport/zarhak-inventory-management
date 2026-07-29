import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { PoReportDocument } from "@/lib/pdf/PoReportDocument";
import { decodeIdFromUrl } from "@/lib/urlId";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeIdFromUrl(rawId);
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });

  const buffer = await renderToBuffer(<PoReportDocument po={po} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${po.poNumber.replace(/\//g, "-")}.pdf"`,
    },
  });
}
