import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { SlittingInstructionDocument } from "@/lib/pdf/SlittingInstructionDocument";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.slittingOrderSummary.findUniqueOrThrow({
    where: { id },
    include: { customer: true },
  });

  const serials = [
    order.slittingCustomerMasterSerial1,
    order.slittingCustomerMasterSerial2,
    order.slittingCustomerMasterSerial3,
    order.slittingCustomerMasterSerial4,
  ];
  const masterIds = serials.filter((s): s is string => !!s);
  const masterRows =
    masterIds.length > 0
      ? await prisma.slittingCustomerMaster.findMany({ where: { id: { in: masterIds } } })
      : [];
  const masters = serials.map(
    (serial) => masterRows.find((m) => m.id === serial) ?? null
  );

  const buffer = await renderToBuffer(
    <SlittingInstructionDocument order={{ ...order, masters }} />
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.zsplId}-slitting-instruction.pdf"`,
    },
  });
}
