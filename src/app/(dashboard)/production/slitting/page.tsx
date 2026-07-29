import Link from "next/link";
import { prisma } from "@/lib/db";
import { SlittingProductionStatus } from "@/generated/prisma/enums";

const TABS: { key: SlittingProductionStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Pending" },
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

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">ZSPL ID</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Spec</th>
              <th className="px-3 py-2 text-right">Wt (MT)</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-medium">{o.zsplId}</td>
                <td className="px-3 py-2">{o.customer?.displayName ?? "—"}</td>
                <td className="px-3 py-2">
                  {o.thickness.toString()}x{o.width.toString()} {o.coating}/{o.temper}
                </td>
                <td className="px-3 py-2 text-right">{o.netWt.toString()}</td>
                <td className="px-3 py-2">{o.vendorName ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/production/slitting/${o.id}`}
                    className="text-xs text-neutral-700 underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
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
