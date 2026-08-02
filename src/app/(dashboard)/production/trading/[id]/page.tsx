import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction, canDispatch } from "@/lib/permissions";
import { updateTradingDispatchInfo } from "../actions";

export default async function TradingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canManage = session?.user ? canManageProduction(session.user.role) : false;
  const canSend = session?.user ? canDispatch(session.user.role) : false;

  const row = await prisma.tradingSummary.findUnique({
    where: { id },
    include: { customer: true, dispatchSummaries: true },
  });
  if (!row) notFound();

  const alreadyDispatched = row.dispatchSummaries.length > 0;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{row.zsplId}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {row.itemType} · {row.thickness.toString()}x{row.width.toString()}
            {row.length ? `x${row.length.toString()}` : ""} · {row.coating}/{row.temper}
          </p>
        </div>
        {canManage && row.availableWeight.greaterThan(0) && (
          <Link
            href={`/production/trading/${row.id}/split`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Split
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Net Weight" value={`${row.netWeight.toString()} MT`} />
        <Stat label="Available Wt" value={`${row.availableWeight.toString()} MT`} />
        <Stat label="Customer" value={row.customer?.displayName ?? "—"} />
      </div>

      {canManage && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">Dispatch preparation</h2>
          <form
            action={updateTradingDispatchInfo.bind(null, row.id)}
            className="mt-4 grid grid-cols-2 gap-4"
          >
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Dispatch Location (Factory Location)
              </span>
              <input
                name="dispatchLocation"
                defaultValue={row.dispatchLocation ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Gross Weight
              </span>
              <input
                name="grossWeight"
                type="number"
                step="0.001"
                defaultValue={row.grossWeight?.toString()}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">DO No.</span>
              <input
                name="doNo"
                defaultValue={row.doNo ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">DO Date</span>
              <input
                name="doDate"
                type="date"
                defaultValue={row.doDate?.toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="col-span-2 mt-2 w-fit rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {canSend && !alreadyDispatched && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">Dispatch</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Not yet assigned to a dispatch.
          </p>
          <Link
            href="/dispatch/new"
            className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create Dispatch
          </Link>
        </div>
      )}
      {alreadyDispatched && (
        <p className="mt-6 text-sm text-neutral-500">
          Already sent to dispatch (DO {row.dispatchSummaries[0]?.doNumber}).
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-xs uppercase text-neutral-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
