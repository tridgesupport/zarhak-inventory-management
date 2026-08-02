import Link from "next/link";
import { prisma } from "@/lib/db";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

// Read-only visibility of reject/scrap placeholder bundles ("XX" reject, "YY" scrap),
// matching the source app's "Scrap Material Screen" slice. No disposition workflow is
// modeled here — the source app's audit didn't capture what "disposition" means
// operationally, so this is intentionally just a listing for now.
export default async function ScrapMaterialPage() {
  const bundles = await prisma.bundlewiseData.findMany({
    where: { bundleIdNo: { in: ["XX", "YY"] } },
    include: { cuttingOrder: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const columns: DataTableColumnDef[] = [
    { key: "kind", header: "Kind", filterable: true },
    { key: "zsplId", header: "Cutting Order" },
    { key: "customer", header: "Customer", filterable: true },
    { key: "netWt", header: "Net Wt", align: "right" },
    { key: "productionDate", header: "Production Date" },
    { key: "preparedBy", header: "Prepared By" },
    { key: "open", header: "" },
  ];

  const dataRows: DataTableRow[] = bundles.map((b) => {
    const kind = b.bundleIdNo === "XX" ? "Reject" : "Scrap";
    const customerName = b.cuttingOrder.customer?.displayName ?? "—";
    const productionDate = b.productionDate.toISOString().slice(0, 10);
    return {
      key: b.id,
      cells: {
        kind: (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            {kind}
          </span>
        ),
        zsplId: b.cuttingOrder.zsplId,
        customer: customerName,
        netWt: b.netBundleWt?.toString() ?? "—",
        productionDate,
        preparedBy: b.preparedBy ?? "—",
        open: (
          <Link
            href={`/production/cutting/${b.cuttingOrderId}`}
            className="text-xs text-neutral-700 underline"
          >
            Open order
          </Link>
        ),
      },
      search: {
        kind,
        zsplId: b.cuttingOrder.zsplId,
        customer: customerName,
        productionDate,
      },
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Scrap Material</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Reject and scrap placeholder bundles from Cutting production, read-only.
      </p>

      <div className="mt-4">
        <DataTable columns={columns} rows={dataRows} emptyLabel="No reject/scrap bundles." />
      </div>
    </div>
  );
}
