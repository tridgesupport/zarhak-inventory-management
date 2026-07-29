import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function TradingSummaryPage() {
  const rows = await prisma.tradingSummary.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { displayName: true } } },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Trading Summary</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Direct resale of Master Stock — no production, just dispatch preparation.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">ZSPL ID</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Spec</th>
              <th className="px-3 py-2 text-right">Available Wt</th>
              <th className="px-3 py-2">DO No.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-medium">{r.zsplId}</td>
                <td className="px-3 py-2">{r.customer?.displayName ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.thickness.toString()}x{r.width.toString()} {r.coating}/{r.temper}
                </td>
                <td className="px-3 py-2 text-right">{r.availableWeight.toString()}</td>
                <td className="px-3 py-2">{r.doNo ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/production/trading/${r.id}`}
                    className="text-xs text-neutral-700 underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
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
