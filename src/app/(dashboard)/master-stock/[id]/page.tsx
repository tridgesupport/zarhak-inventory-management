import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canTransitionMasterStock, canSplitMasterStock } from "@/lib/permissions";
import { getLookupOptions } from "@/lib/lookup";
import { transitionMasterStock } from "../actions";

export default async function MasterStockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canTransition = session?.user
    ? canTransitionMasterStock(session.user.role)
    : false;
  const canSplit = session?.user ? canSplitMasterStock(session.user.role) : false;

  const stock = await prisma.masterStock.findUnique({
    where: { id },
    include: {
      customer: true,
      originalMasterStock: { select: { id: true, zsplId: true } },
      splitChildren: { select: { id: true, zsplId: true, availableWeight: true, status: true } },
    },
  });
  if (!stock) notFound();

  const history = await prisma.statusHistory.findMany({
    where: { entityType: "MasterStock", entityId: id },
    orderBy: { changedAt: "desc" },
  });

  const [customers, salesTypes] = await Promise.all([
    prisma.customer.findMany({ orderBy: { legalName: "asc" } }),
    getLookupOptions("SALES_TYPE"),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{stock.zsplId}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {stock.itemType} · {stock.thickness.toString()}x{stock.width.toString()}
            {stock.length ? `x${stock.length.toString()}` : ""} · {stock.coating}/
            {stock.temper} · Status: {stock.status}
          </p>
        </div>
        {canSplit && stock.availableWeight.greaterThan(0) && (
          <Link
            href={`/master-stock/${stock.id}/split`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Split
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Stat label="Net Wt" value={stock.netWt.toString()} />
        <Stat label="Available Wt" value={stock.availableWeight.toString()} />
        <Stat label="No. of Splits" value={String(stock.noOfSplits)} />
        <Stat label="Bay Location" value={stock.bayLocation ?? "—"} />
      </div>

      {stock.originalMasterStock && (
        <p className="mt-4 text-sm text-neutral-500">
          Split from{" "}
          <Link
            href={`/master-stock/${stock.originalMasterStock.id}`}
            className="underline"
          >
            {stock.originalMasterStock.zsplId}
          </Link>
        </p>
      )}
      {stock.splitChildren.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-neutral-700">Split children</h2>
          <ul className="mt-1 space-y-1 text-sm text-neutral-600">
            {stock.splitChildren.map((c) => (
              <li key={c.id}>
                <Link href={`/master-stock/${c.id}`} className="underline">
                  {c.zsplId}
                </Link>{" "}
                — {c.availableWeight.toString()} MT ({c.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      {canTransition && (
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">Change status</h2>
          <form
            action={transitionMasterStock.bind(null, stock.id)}
            className="mt-4 grid grid-cols-2 gap-4"
          >
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Target status
              </span>
              <select
                name="target"
                defaultValue={stock.status}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              >
                <option value="AVAILABLE">Available</option>
                <option value="OFFERED">Offered</option>
                <option value="BOOKED">Booked</option>
                <option value="SOLD">Sold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Production Weight *
              </span>
              <input
                name="productionWeight"
                type="number"
                step="0.001"
                defaultValue={stock.productionWeight?.toString()}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Customer *
              </span>
              <select
                name="customerId"
                defaultValue={stock.customerId ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Sale Price *
              </span>
              <input
                name="salePrice"
                type="number"
                step="0.01"
                defaultValue={stock.salePrice?.toString()}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Sales Type *
              </span>
              <select
                name="salesType"
                defaultValue={stock.salesType ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {salesTypes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Requested Delivery Date (required for Sold)
              </span>
              <input
                name="requestedDeliveryDate"
                type="date"
                defaultValue={stock.requestedDeliveryDate
                  ?.toISOString()
                  .slice(0, 10)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Cut Length (optional, for Cutting sales)
              </span>
              <input
                name="cutLength"
                type="number"
                step="0.001"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Customer PO No.
              </span>
              <input
                name="customerPoNo"
                defaultValue={stock.customerPoNo ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Delivery Location
              </span>
              <input
                name="deliveryLocation"
                defaultValue={stock.deliveryLocation ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="col-span-2 block">
              <span className="block text-xs font-medium text-neutral-500">
                Sales Remark
              </span>
              <textarea
                name="salesRemark"
                rows={2}
                defaultValue={stock.salesRemark ?? ""}
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
          {stock.salesPoNumber && (
            <p className="mt-3 text-sm text-neutral-600">
              Sales PO Number: <strong>{stock.salesPoNumber}</strong>
            </p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-neutral-700">Status history</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {history.map((h) => (
              <li key={h.id}>
                {h.fromStatus ?? "—"} → {h.toStatus} by {h.changedBy} at{" "}
                {h.changedAt.toISOString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
