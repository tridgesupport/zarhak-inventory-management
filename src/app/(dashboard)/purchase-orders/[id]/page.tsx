import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { decodeIdFromUrl, encodeIdForUrl } from "@/lib/urlId";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeIdFromUrl(rawId);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!po) notFound();

  const received = await prisma.inwardRecord.aggregate({
    where: { purchaseOrderId: po.id },
    _sum: { iGrWt: true },
  });

  const ordered = po.items.reduce((sum, i) => sum + Number(i.qtyMt), 0);
  const receivedQty = Number(received._sum.iGrWt ?? 0);
  const pct = ordered > 0 ? (receivedQty / ordered) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{po.poNumber}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {po.vendorName} · {po.mill} · {po.shipTo} · Status: {po.status}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/pdf/po-report/${encodeIdForUrl(po.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            PO Report (PDF)
          </a>
          <Link
            href={`/purchase-orders/${encodeIdForUrl(po.id)}/items/import`}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Import Item Details
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Stat label="Ordered (MT)" value={ordered.toFixed(3)} />
        <Stat label="Received (MT)" value={receivedQty.toFixed(3)} />
        <Stat label="% Received" value={`${pct.toFixed(1)}%`} />
        <Stat label="Line Items" value={String(po.items.length)} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-neutral-700">Item Details</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Item Type</th>
              <th className="px-4 py-2">Thickness</th>
              <th className="px-4 py-2">Width</th>
              <th className="px-4 py-2">Length</th>
              <th className="px-4 py-2">Coating</th>
              <th className="px-4 py-2">Temper</th>
              <th className="px-4 py-2">Grade</th>
              <th className="px-4 py-2 text-right">Qty (MT)</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => (
              <tr key={item.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{item.itemType}</td>
                <td className="px-4 py-2">{item.thickness.toString()}</td>
                <td className="px-4 py-2">{item.width.toString()}</td>
                <td className="px-4 py-2">{item.length?.toString() ?? "—"}</td>
                <td className="px-4 py-2">{item.coating}</td>
                <td className="px-4 py-2">{item.temper}</td>
                <td className="px-4 py-2">{item.grade}</td>
                <td className="px-4 py-2 text-right">{item.qtyMt.toString()}</td>
                <td className="px-4 py-2">{item.itemStatus}</td>
              </tr>
            ))}
            {po.items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-400">
                  No item details yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
