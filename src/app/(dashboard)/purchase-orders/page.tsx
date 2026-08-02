import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditPO } from "@/lib/permissions";
import { encodeIdForUrl } from "@/lib/urlId";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

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

  function statusPill(status: string) {
    const cls =
      status === "OPEN"
        ? "bg-green-100 text-green-800"
        : status === "IN_PROCESS"
          ? "bg-blue-100 text-blue-800"
          : status === "CLOSED"
            ? "bg-neutral-200 text-neutral-700"
            : "bg-red-100 text-red-800";
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
        {status.replace("_", " ")}
      </span>
    );
  }

  const columns: DataTableColumnDef[] = [
    { key: "poNumber", header: "PO No." },
    { key: "poDate", header: "Date" },
    { key: "vendorName", header: "Vendor", filterable: true },
    { key: "mill", header: "Mill", filterable: true },
    { key: "shipTo", header: "Ship To" },
    { key: "ordered", header: "Ordered (MT)", align: "right" },
    { key: "received", header: "Received (MT)", align: "right" },
    { key: "pct", header: "% Recd", align: "right" },
    { key: "status", header: "Status", filterable: true },
  ];

  const dataRows: DataTableRow[] = pos.map((po) => {
    const ordered = po.items.reduce((sum, i) => sum + Number(i.qtyMt), 0);
    const received = Number(receivedByPo.get(po.id) ?? 0);
    const pct = ordered > 0 ? (received / ordered) * 100 : 0;
    const dateStr = po.poDate.toISOString().slice(0, 10);
    return {
      key: po.id,
      cells: {
        poNumber: (
          <Link
            href={`/purchase-orders/${encodeIdForUrl(po.id)}`}
            className="font-medium text-neutral-900 underline"
          >
            {po.poNumber}
          </Link>
        ),
        poDate: dateStr,
        vendorName: po.vendorName,
        mill: po.mill,
        shipTo: po.shipTo,
        ordered: ordered.toFixed(3),
        received: received.toFixed(3),
        pct: `${pct.toFixed(1)}%`,
        status: statusPill(po.status),
      },
      search: {
        poNumber: po.poNumber,
        poDate: dateStr,
        vendorName: po.vendorName,
        mill: po.mill,
        shipTo: po.shipTo,
        status: po.status,
      },
    };
  });

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

      <div className="mt-6">
        <DataTable rows={dataRows} columns={columns} emptyLabel="No purchase orders yet." />
      </div>
    </div>
  );
}
