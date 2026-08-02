import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductionStatus } from "@/generated/prisma/enums";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

const TABS: { key: ProductionStatus | "ALL"; label: string }[] = [
  { key: "INPUT_CUT_LENGTH", label: "Input Cut Length" },
  { key: "PENDING_PRODUCTION", label: "Pending Production" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ALL", label: "All" },
];

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

export default async function CuttingOrderSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const { status = "INPUT_CUT_LENGTH", date } = await searchParams;
  const statusWhere =
    status === "ALL" ? {} : { productionStatus: status as ProductionStatus };
  const dateWhere = date ? { productionPlanDate: dayRange(date) } : {};
  const where = { ...statusWhere, ...dateWhere };

  const orders = await prisma.cuttingOrderSummary.findMany({
    where,
    orderBy: [{ productionSequence: "asc" }, { createdAt: "desc" }],
    include: { customer: { select: { displayName: true } } },
    take: 200,
  });

  const columns: DataTableColumnDef[] = [
    { key: "zsplId", header: "ZSPL ID" },
    { key: "customer", header: "Customer", filterable: true },
    { key: "spec", header: "Spec" },
    { key: "netWt", header: "Wt (MT)", align: "right" },
    { key: "planDate", header: "Plan Date" },
    { key: "approved", header: "Approved", filterable: true },
    { key: "open", header: "" },
  ];

  const dataRows: DataTableRow[] = orders.map((o) => {
    const spec = `${o.thickness.toString()}x${o.width.toString()}${o.length ? `x${o.length.toString()}` : ""} ${o.coating}/${o.temper}`;
    const customerName = o.customer?.displayName ?? "—";
    const planDate = o.productionPlanDate?.toISOString().slice(0, 10) ?? "—";
    return {
      key: o.id,
      cells: {
        zsplId: <span className="font-medium">{o.zsplId}</span>,
        customer: customerName,
        spec,
        netWt: o.netWt.toString(),
        planDate,
        approved: o.approvedBy ?? "—",
        open: (
          <Link
            href={`/production/cutting/${o.id}`}
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
        planDate,
        approved: o.approvedBy ? "Approved" : "Not approved",
      },
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Cutting Order Summary</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Production planning queue. Fill in cut length + planning fields, approve, then
        track through Daily Cutting → Completed.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/production/cutting?status=${t.key}${date ? `&date=${date}` : ""}`}
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Plan date:</span>
          {date && (
            <Link
              href={`/production/cutting?status=${status}&date=${shiftDate(date, -1)}`}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              ← Prev
            </Link>
          )}
          <form action="/production/cutting" method="get" className="flex items-center gap-1">
            <input type="hidden" name="status" value={status} />
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
              href={`/production/cutting?status=${status}&date=${shiftDate(date, 1)}`}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Next →
            </Link>
          )}
          <Link
            href={`/production/cutting?status=${status}&date=${new Date().toISOString().slice(0, 10)}`}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Today
          </Link>
          {date && (
            <Link href={`/production/cutting?status=${status}`} className="text-xs text-neutral-500 underline">
              Clear
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4">
        <DataTable columns={columns} rows={dataRows} />
      </div>
    </div>
  );
}
