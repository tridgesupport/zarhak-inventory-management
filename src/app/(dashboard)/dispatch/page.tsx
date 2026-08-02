import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";
import { removeFromDispatch, createPackingList } from "./actions";
import { DataTable, type DataTableColumnDef } from "@/components/DataTable";

function itemColumns(canManage: boolean): DataTableColumnDef[] {
  const cols: DataTableColumnDef[] = [
    { key: "zsplId", header: "ZSPL ID" },
    { key: "spec", header: "Spec" },
    { key: "netWeight", header: "Net Wt", align: "right" },
  ];
  if (canManage) cols.push({ key: "remove", header: "" });
  return cols;
}

function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function DispatchSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const session = await auth();
  const canManage = session?.user ? canDispatch(session.user.role) : false;

  const rows = await prisma.dispatchSummary.findMany({
    where: date ? { doDate: dayRange(date) } : {},
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Dispatch Summary</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Items consolidated from Cutting/Slitting/Trading Finished Goods, grouped by DO
            number. Removing an item here sends it back to its Finished Goods screen.
          </p>
        </div>
        {canManage && (
          <Link
            href="/dispatch/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            New Dispatch
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">DO date:</span>
        {date && (
          <Link
            href={`/dispatch?date=${shiftDate(date, -1)}`}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            ← Prev
          </Link>
        )}
        <form action="/dispatch" method="get" className="flex items-center gap-1">
          <input
            type="date"
            name="date"
            defaultValue={date ?? ""}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Go
          </button>
        </form>
        {date && (
          <Link
            href={`/dispatch?date=${shiftDate(date, 1)}`}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Next →
          </Link>
        )}
        <Link
          href={`/dispatch?date=${new Date().toISOString().slice(0, 10)}`}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          Today
        </Link>
        {date && (
          <Link href="/dispatch" className="text-xs text-neutral-500 underline">
            Clear
          </Link>
        )}
      </div>

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
              <div className="flex items-center gap-2">
                <a
                  href={`/api/pdf/packing-list/${encodeURIComponent(doNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Packing List (PDF)
                </a>
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
            </div>
            <div className="mt-2">
              <DataTable
                columns={itemColumns(canManage)}
                rows={items.map((it) => {
                  const spec = `${it.itemType} ${it.thickness?.toString()}x${it.width?.toString()}${it.cutLength ? `x${it.cutLength.toString()}` : ""} ${it.coating}/${it.temper}`;
                  return {
                    key: it.id,
                    cells: {
                      zsplId: it.finalZsplId,
                      spec,
                      netWeight: it.netWeight?.toString() ?? "—",
                      remove: canManage ? (
                        <form action={removeFromDispatch.bind(null, it.id)}>
                          <button type="submit" className="text-xs text-red-600 underline">
                            Remove
                          </button>
                        </form>
                      ) : null,
                    },
                    search: {
                      zsplId: it.finalZsplId ?? "",
                      spec,
                    },
                  };
                })}
              />
            </div>
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
