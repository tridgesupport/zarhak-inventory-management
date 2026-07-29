import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";
import { removeFromDispatch, createPackingList } from "./actions";

export default async function DispatchSummaryPage() {
  const session = await auth();
  const canManage = session?.user ? canDispatch(session.user.role) : false;

  const rows = await prisma.dispatchSummary.findMany({
    orderBy: [{ doNumber: "desc" }, { createdAt: "desc" }],
    include: { customer: true, buyer: true, consignee: true },
    take: 500,
  });

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.doNumber) ?? [];
    list.push(row);
    groups.set(row.doNumber, list);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Dispatch Summary</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Items consolidated from Cutting/Slitting/Trading Finished Goods, grouped by DO
        number. Removing an item here sends it back to its Finished Goods screen.
      </p>

      <div className="mt-4 space-y-4">
        {[...groups.entries()].map(([doNumber, items]) => (
          <div key={doNumber} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-900">
                DO {doNumber} · {items[0]?.doDate?.toISOString().slice(0, 10) ?? "—"} ·{" "}
                {items[0]?.buyer?.displayName ?? items[0]?.customer?.displayName ?? "—"}
                {items[0]?.transporterName ? ` · ${items[0].transporterName}` : ""}
                {items[0]?.vehicleNumber ? ` · ${items[0].vehicleNumber}` : ""}
              </div>
              {canManage && (
                <form action={createPackingList.bind(null, doNumber)}>
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {items[0]?.packingListCreated
                      ? "Regenerate Packing List"
                      : "Create Packing List"}
                  </button>
                </form>
              )}
            </div>
            <table className="mt-2 min-w-full text-sm">
              <thead className="text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-1">ZSPL ID</th>
                  <th className="py-1">Spec</th>
                  <th className="py-1 text-right">Net Wt</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-neutral-100">
                    <td className="py-1">{it.finalZsplId}</td>
                    <td className="py-1">
                      {it.itemType} {it.thickness?.toString()}x{it.width?.toString()}
                      {it.cutLength ? `x${it.cutLength.toString()}` : ""} {it.coating}/
                      {it.temper}
                    </td>
                    <td className="py-1 text-right">{it.netWeight?.toString() ?? "—"}</td>
                    <td className="py-1">
                      {canManage && (
                        <form action={removeFromDispatch.bind(null, it.id)}>
                          <button
                            type="submit"
                            className="text-xs text-red-600 underline"
                          >
                            Remove
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {groups.size === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">
            No dispatches yet.
          </p>
        )}
      </div>
    </div>
  );
}
