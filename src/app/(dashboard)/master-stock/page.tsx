import Link from "next/link";
import { prisma } from "@/lib/db";
import { MasterStockStatus } from "@/generated/prisma/enums";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

const TABS: { key: MasterStockStatus | "ALL"; label: string }[] = [
  { key: "AVAILABLE", label: "Available" },
  { key: "OFFERED", label: "Offered" },
  { key: "BOOKED", label: "Booked" },
  { key: "SOLD", label: "Sold" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "ALL", label: "All" },
];

export default async function MasterStockPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "AVAILABLE" } = await searchParams;
  const where = status === "ALL" ? {} : { status: status as MasterStockStatus };

  const rows = await prisma.masterStock.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { displayName: true } } },
    take: 200,
  });

  const columns: DataTableColumnDef[] = [
    { key: "zsplId", header: "ZSPL ID" },
    { key: "itemType", header: "Item Type", filterable: true },
    { key: "spec", header: "Spec" },
    { key: "netWt", header: "Net Wt", align: "right" },
    { key: "availableWeight", header: "Available Wt", align: "right" },
    { key: "customer", header: "Customer", filterable: true },
    { key: "salesType", header: "Sales Type", filterable: true },
    { key: "bay", header: "Bay" },
    { key: "open", header: "" },
  ];

  const dataRows: DataTableRow[] = rows.map((r) => {
    const spec = `${r.thickness.toString()}x${r.width.toString()} ${r.coating}/${r.temper}`;
    const customerName = r.customer?.displayName ?? "—";
    return {
      key: r.id,
      cells: {
        zsplId: <span className="font-medium">{r.zsplId}</span>,
        itemType: r.itemType,
        spec,
        netWt: r.netWt.toString(),
        availableWeight: r.availableWeight.toString(),
        customer: customerName,
        salesType: r.salesType ?? "—",
        bay: r.bayLocation ?? "—",
        open: (
          <Link href={`/master-stock/${r.id}`} className="text-xs text-neutral-700 underline">
            Open
          </Link>
        ),
      },
      search: {
        zsplId: r.zsplId,
        itemType: r.itemType,
        spec,
        customer: customerName,
        salesType: r.salesType ?? "",
        bay: r.bayLocation ?? "",
      },
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Master Stock</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Central inventory pool. A single status view replaces the source app&apos;s
        separate Offered / Available screens — use the tabs below instead.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/master-stock?status=${t.key}`}
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
