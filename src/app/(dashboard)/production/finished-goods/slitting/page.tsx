import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Finished Goods — Slitting
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Completed slitting production not yet assigned to a dispatch. Use the
            Dispatch wizard to send items — from here or any other Finished Goods
            screen — to a DO.
          </p>
        </div>
        {canSend && (
          <Link
            href="/dispatch/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create Dispatch
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-neutral-900">{r.bundleIdNo}</span>{" "}
                <span className="text-neutral-500">
                  · {r.slittingOrder.customer?.displayName ?? "—"} · Slit Width{" "}
                  {r.slitWidth?.toString() ?? "—"} · {r.slittingOrder.coating}/
                  {r.slittingOrder.temper} · Net {r.netWt?.toString() ?? "—"} MT
                </span>
              </div>
              <a
                href={`/api/pdf/coil-label/slitting/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-neutral-500 underline"
              >
                Coil Label (PDF)
              </a>
            </div>
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
