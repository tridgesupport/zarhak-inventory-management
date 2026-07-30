import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";
import { dispatchCuttingBundle } from "@/app/(dashboard)/dispatch/actions";

export default async function FinishedGoodsCuttingPage() {
  const session = await auth();
  const canSend = session?.user ? canDispatch(session.user.role) : false;

  const bundles = await prisma.bundlewiseData.findMany({
    where: {
      status: "APPROVED",
      bundleIdNo: { notIn: ["XX", "YY"] },
      doNumber: null,
    },
    include: { cuttingOrder: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const customers = await prisma.customer.findMany({ orderBy: { displayName: "asc" } });
  const transporters = await prisma.transporter.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">
        Finished Goods — Cutting
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Approved bundles not yet assigned to a dispatch. Assign a DO number to send to
        Dispatch Summary.
      </p>

      <div className="mt-4 space-y-3">
        {bundles.map((b) => (
          <div key={b.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-neutral-900">
                  {b.cuttingOrder.zsplId}-{b.bundleIdNo}
                </span>{" "}
                <span className="text-neutral-500">
                  · {b.cuttingOrder.customer?.displayName ?? "—"} ·{" "}
                  {b.cuttingOrder.thickness.toString()}x{b.cuttingOrder.width.toString()}
                  {b.cutLength ? `x${b.cutLength.toString()}` : ""} ·{" "}
                  {b.cuttingOrder.coating}/{b.cuttingOrder.temper} · Net{" "}
                  {b.netBundleWt?.toString() ?? "—"} MT
                </span>
              </div>
              <a
                href={`/api/pdf/coil-label/cutting/${b.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-neutral-500 underline"
              >
                Coil Label (PDF)
              </a>
            </div>
            {canSend && (
              <form
                action={dispatchCuttingBundle.bind(null, b.id)}
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
                  name="consigneeId"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  <option value="">Consignee…</option>
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
        {bundles.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">
            Nothing here.
          </p>
        )}
      </div>
    </div>
  );
}
