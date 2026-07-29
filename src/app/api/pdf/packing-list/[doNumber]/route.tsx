import { renderToBuffer } from "@react-pdf/renderer";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PackingListDocument } from "@/lib/pdf/PackingListDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ doNumber: string }> }
) {
  const { doNumber } = await params;
  const rows = await prisma.dispatchSummary.findMany({
    where: { doNumber: decodeURIComponent(doNumber) },
    include: { customer: true, buyer: true, consignee: true },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) notFound();

  const buffer = await renderToBuffer(<PackingListDocument rows={rows} />);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doNumber.replace(/\//g, "-")}.pdf"`,
    },
  });
}
