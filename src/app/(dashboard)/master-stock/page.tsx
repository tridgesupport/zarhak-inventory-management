import Link from "next/link";
import { prisma } from "@/lib/db";
import { MasterStockStatus } from "@/generated/prisma/enums";

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

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">ZSPL ID</th>
              <th className="px-3 py-2">Item Type</th>
              <th className="px-3 py-2">Spec</th>
              <th className="px-3 py-2 text-right">Net Wt</th>
              <th className="px-3 py-2 text-right">Available Wt</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Sales Type</th>
              <th className="px-3 py-2">Bay</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-medium">{r.zsplId}</td>
                <td className="px-3 py-2">{r.itemType}</td>
                <td className="px-3 py-2">
                  {r.thickness.toString()}x{r.width.toString()} {r.coating}/
                  {r.temper}
                </td>
                <td className="px-3 py-2 text-right">{r.netWt.toString()}</td>
                <td className="px-3 py-2 text-right">
                  {r.availableWeight.toString()}
                </td>
                <td className="px-3 py-2">{r.customer?.displayName ?? "—"}</td>
                <td className="px-3 py-2">{r.salesType ?? "—"}</td>
                <td className="px-3 py-2">{r.bayLocation ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/master-stock/${r.id}`}
                    className="text-xs text-neutral-700 underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-400">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
