import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";
import { dispatchSlittingProduction } from "@/app/(dashboard)/dispatch/actions";

export default async function FinishedGoodsSlittingPage() {
  const session = await auth();
  const canSend = session?.user ? canDispatch(session.user.role) : false;

  const rows = await prisma.slittingProductionData.findMany({
    where: {
      slittingOrder: { productionStatus: "COMPLETED" },
      dispatchSummaries: { none: {} },
    },
    include: { slittingOrder: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const customers = await prisma.customer.findMany({ orderBy: { displayName: "asc" } });
  const transporters = await prisma.transporter.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">
        Finished Goods — Slitting
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Completed slitting production not yet assigned to a dispatch.
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-sm">
              <span className="font-medium text-neutral-900">{r.bundleIdNo}</span>{" "}
              <span className="text-neutral-500">
                · {r.slittingOrder.customer?.displayName ?? "—"} · Slit Width{" "}
                {r.slitWidth?.toString() ?? "—"} · {r.slittingOrder.coating}/
                {r.slittingOrder.temper} · Net {r.netWt?.toString() ?? "—"} MT
              </span>
            </div>
            {canSend && (
              <form
                action={dispatchSlittingProduction.bind(null, r.id)}
                className="mt-2 flex flex-wrap items-end gap-2"
              >
                <input
                  name="doNumber"
                  placeholder="DO Number"
                  required
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <input
                  name="doDate"
                  type="date"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <select
                  name="buyerId"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  <option value="">Buyer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
                <select
                  name="transporterName"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  <option value="">Transporter…</option>
                  {transporters.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  name="vehicleNumber"
                  placeholder="Vehicle No."
                  className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Send to Dispatch
                </button>
              </form>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">
            Nothing here.
          </p>
        )}
      </div>
    </div>
  );
}
