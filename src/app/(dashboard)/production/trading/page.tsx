import Link from "next/link";
import { prisma } from "@/lib/db";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

export default async function TradingSummaryPage() {
  const rows = await prisma.tradingSummary.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { displayName: true } } },
    take: 200,
  });

  const columns: DataTableColumnDef[] = [
    { key: "zsplId", header: "ZSPL ID" },
    { key: "customer", header: "Customer", filterable: true },
    { key: "spec", header: "Spec" },
    { key: "availableWeight", header: "Available Wt", align: "right" },
    { key: "doNo", header: "DO No." },
    { key: "open", header: "" },
  ];

  const dataRows: DataTableRow[] = rows.map((r) => {
    const spec = `${r.thickness.toString()}x${r.width.toString()} ${r.coating}/${r.temper}`;
    const customerName = r.customer?.displayName ?? "—";
    return {
      key: r.id,
      cells: {
        zsplId: <span className="font-medium">{r.zsplId}</span>,
        customer: customerName,
        spec,
        availableWeight: r.availableWeight.toString(),
        doNo: r.doNo ?? "—",
        open: (
          <Link
            href={`/production/trading/${r.id}`}
            className="text-xs text-neutral-700 underline"
          >
            Open
          </Link>
        ),
      },
      search: {
        zsplId: r.zsplId,
        customer: customerName,
        spec,
        doNo: r.doNo ?? "",
      },
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Trading Summary</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Direct resale of Master Stock — no production, just dispatch preparation.
      </p>

      <div className="mt-4">
        <DataTable columns={columns} rows={dataRows} />
      </div>
    </div>
  );
}
