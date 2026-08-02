import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canImportInward, canReview } from "@/lib/permissions";
import { markUnloaded, markReviewed, resolveMatch } from "./actions";

const TABS = [
  { key: "not-reviewed", label: "Not Reviewed" },
  { key: "reviewed", label: "Reviewed" },
  { key: "all", label: "All" },
] as const;

export default async function InwardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter = "not-reviewed", q = "" } = await searchParams;
  const session = await auth();
  const canUnload = session?.user ? canImportInward(session.user.role) : false;
  const canReviewRole = session?.user ? canReview(session.user.role) : false;

  const statusWhere =
    filter === "reviewed"
      ? { reviewBy: { not: null } }
      : filter === "all"
        ? {}
        : { reviewBy: null };

  const searchWhere = q.trim()
    ? {
        OR: [
          { zsplId: { contains: q.trim(), mode: "insensitive" as const } },
          { vehicleNo: { contains: q.trim(), mode: "insensitive" as const } },
          { itemType: { contains: q.trim(), mode: "insensitive" as const } },
          { vendorName: { contains: q.trim(), mode: "insensitive" as const } },
          {
            purchaseOrder: {
              poNumber: { contains: q.trim(), mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const where = { ...statusWhere, ...searchWhere };

  const records = await prisma.inwardRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      matchedItem: { select: { id: true } },
      purchaseOrder: { select: { poNumber: true } },
    },
    take: 100,
  });

  // For unmatched rows, fetch candidate item details from the same PO for manual pick.
  const unmatchedPoIds = [
    ...new Set(records.filter((r) => !r.matchedItemId).map((r) => r.purchaseOrderId)),
  ];
  const candidatesByPo = new Map<
    string,
    { id: string; label: string }[]
  >();
  if (unmatchedPoIds.length > 0) {
    const items = await prisma.itemDetail.findMany({
      where: { purchaseOrderId: { in: unmatchedPoIds } },
      select: { id: true, purchaseOrderId: true, itemType: true, thickness: true, width: true },
    });
    for (const item of items) {
      const list = candidatesByPo.get(item.purchaseOrderId) ?? [];
      list.push({ id: item.id, label: `${item.itemType} ${item.thickness}x${item.width}` });
      candidatesByPo.set(item.purchaseOrderId, list);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Inward</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Goods receipt against Purchase Orders. Review gate creates Master Stock.
          </p>
        </div>
        {canUnload && (
          <Link
            href="/inward/import"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Import Inward CSV
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/inward?filter=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filter === t.key
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-700 border border-neutral-200"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form action="/inward" method="get" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search ZSPL ID, PO No., vehicle, vendor…"
            className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Search
          </button>
          {q && (
            <Link href={`/inward?filter=${filter}`} className="text-xs text-neutral-500 underline">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="mt-4 space-y-3">
        {records.map((r) => (
          <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <span className="font-medium text-neutral-900">{r.zsplId}</span>{" "}
                <span className="text-neutral-500">· {r.purchaseOrder.poNumber}</span>{" "}
                <span className="text-neutral-500">
                  · {r.itemType} {r.thickness.toString()}x{r.width.toString()}{" "}
                  {r.coating}/{r.temper}
                </span>{" "}
                <span className="text-neutral-500">· Net Wt {r.netWt.toString()}</span>{" "}
                <span className="text-neutral-500">· Vehicle {r.vehicleNo}</span>
              </div>
              <span
                className={
                  r.reviewBy
                    ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                    : "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                }
              >
                {r.reviewBy ? `Reviewed by ${r.reviewBy}` : "Not Reviewed"}
              </span>
            </div>

            {!r.matchedItemId && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                <span>No matching Item Detail.</span>
                {canUnload && (candidatesByPo.get(r.purchaseOrderId) ?? []).length > 0 && (
                  <InlineResolveMatch
                    inwardId={r.id}
                    candidates={candidatesByPo.get(r.purchaseOrderId) ?? []}
                  />
                )}
              </div>
            )}

            {canUnload && !r.unloadedBy && (
              <form
                action={markUnloaded.bind(null, r.id)}
                className="mt-3 flex flex-wrap items-end gap-2"
              >
                <div>
                  <label className="block text-xs text-neutral-500">Unloaded By</label>
                  <input
                    name="unloadedBy"
                    required
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">I Gr Wt</label>
                  <input
                    name="iGrWt"
                    type="number"
                    step="0.001"
                    required
                    className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500">Bay Location</label>
                  <input
                    name="bayLocation"
                    required
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Save
                </button>
              </form>
            )}

            {r.unloadedBy && (
              <p className="mt-2 text-xs text-neutral-500">
                Unloaded by {r.unloadedBy} · I Gr Wt {r.iGrWt?.toString()} · Bay{" "}
                {r.bayLocation}
              </p>
            )}

            {canReviewRole && r.unloadedBy && !r.reviewBy && (
              <form action={markReviewed.bind(null, r.id)} className="mt-2">
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Mark Reviewed → creates Master Stock
                </button>
              </form>
            )}
          </div>
        ))}
        {records.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">
            No inward records in this view.
          </p>
        )}
      </div>
    </div>
  );
}

function InlineResolveMatch({
  inwardId,
  candidates,
}: {
  inwardId: string;
  candidates: { id: string; label: string }[];
}) {
  async function action(formData: FormData) {
    "use server";
    const itemDetailId = formData.get("itemDetailId");
    if (typeof itemDetailId === "string" && itemDetailId) {
      await resolveMatch(inwardId, itemDetailId);
    }
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <select
        name="itemDetailId"
        required
        className="rounded-md border border-amber-300 px-2 py-0.5 text-xs"
      >
        <option value="" disabled selected>
          Select item…
        </option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-amber-800 px-2 py-0.5 text-xs font-medium text-white"
      >
        Link
      </button>
    </form>
  );
}
