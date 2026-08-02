import Link from "next/link";
import { prisma } from "@/lib/db";
import { SlittingProductionStatus } from "@/generated/prisma/enums";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

const TABS: { key: SlittingProductionStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROCESS", label: "In Process" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ALL", label: "All" },
];

export default async function SlittingOrderSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "PENDING" } = await searchParams;
  const where =
    status === "ALL" ? {} : { productionStatus: status as SlittingProductionStatus };

  const orders = await prisma.slittingOrderSummary.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { displayName: true } } },
    take: 200,
  });

  const columns: DataTableColumnDef[] = [
    { key: "zsplId", header: "ZSPL ID" },
    { key: "customer", header: "Customer", filterable: true },
    { key: "spec", header: "Spec" },
    { key: "netWt", header: "Wt (MT)", align: "right" },
    { key: "vendor", header: "Vendor", filterable: true },
    { key: "open", header: "" },
  ];

  const dataRows: DataTableRow[] = orders.map((o) => {
    const spec = `${o.thickness.toString()}x${o.width.toString()} ${o.coating}/${o.temper}`;
    const customerName = o.customer?.displayName ?? "—";
    return {
      key: o.id,
      cells: {
        zsplId: <span className="font-medium">{o.zsplId}</span>,
        customer: customerName,
        spec,
        netWt: o.netWt.toString(),
        vendor: o.vendorName ?? "—",
        open: (
          <Link
            href={`/production/slitting/${o.id}`}
            className="text-xs text-neutral-700 underline"
          >
            Open
          </Link>
        ),
      },
      search: {
        zsplId: o.zsplId,
        customer: customerName,
        spec,
        vendor: o.vendorName ?? "",
      },
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Slitting Order Summary</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Coil-based sales — slit widths/counts instead of cut length.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/production/slitting?status=${t.key}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              status === t.key
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-700 border border-neutral-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={dataRows} />
      </div>
    </div>
  );
}
