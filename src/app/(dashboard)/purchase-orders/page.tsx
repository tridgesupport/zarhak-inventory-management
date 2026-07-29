import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditPO } from "@/lib/permissions";

export default async function PurchaseOrdersPage() {
  const session = await auth();
  const canCreate = session?.user ? canEditPO(session.user.role) : false;

  const pos = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { qtyMt: true } } },
  });

  const receivedTotals = await prisma.inwardRecord.groupBy({
    by: ["purchaseOrderId"],
    _sum: { iGrWt: true },
  });
  const receivedByPo = new Map(
    receivedTotals.map((r) => [r.purchaseOrderId, r._sum.iGrWt ?? 0])
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Fiscal-year-numbered POs. Totals below are computed live, not stored.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/purchase-orders/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create PO
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">PO No.</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2">Mill</th>
              <th className="px-4 py-2">Ship To</th>
              <th className="px-4 py-2 text-right">Ordered (MT)</th>
              <th className="px-4 py-2 text-right">Received (MT)</th>
              <th className="px-4 py-2 text-right">% Recd</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => {
              const ordered = po.items.reduce(
                (sum, i) => sum + Number(i.qtyMt),
                0
              );
              const received = Number(receivedByPo.get(po.id) ?? 0);
              const pct = ordered > 0 ? (received / ordered) * 100 : 0;
              return (
                <tr key={po.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="font-medium text-neutral-900 underline"
                    >
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{po.poDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2">{po.vendorName}</td>
                  <td className="px-4 py-2">{po.mill}</td>
                  <td className="px-4 py-2">{po.shipTo}</td>
                  <td className="px-4 py-2 text-right">{ordered.toFixed(3)}</td>
                  <td className="px-4 py-2 text-right">{received.toFixed(3)}</td>
                  <td className="px-4 py-2 text-right">{pct.toFixed(1)}%</td>
                  <td className="px-4 py-2">{po.status}</td>
                </tr>
              );
            })}
            {pos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-400">
                  No purchase orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
