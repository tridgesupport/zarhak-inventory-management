import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";
import { updateSlitPlan, addSlittingProduction, markSlittingCompleted } from "../actions";

export default async function SlittingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canManage = session?.user ? canManageProduction(session.user.role) : false;

  const order = await prisma.slittingOrderSummary.findUnique({
    where: { id },
    include: {
      customer: true,
      slittingProductionData: { orderBy: { bundleIdNo: "asc" } },
    },
  });
  if (!order) notFound();

  const customerMasters = await prisma.slittingCustomerMaster.findMany({
    orderBy: { customerName: "asc" },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{order.zsplId}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {order.itemType} · {order.thickness.toString()}x{order.width.toString()} ·{" "}
            {order.coating}/{order.temper} · Status: {order.productionStatus}
          </p>
        </div>
        <a
          href={`/api/pdf/slitting-instruction/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Slitting Instruction (PDF)
        </a>
      </div>

      {canManage && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">
            Slit widths &amp; production request
          </h2>
          <form
            action={updateSlitPlan.bind(null, order.id)}
            className="mt-4 grid grid-cols-4 gap-3"
          >
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="col-span-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-xs text-neutral-500">Slit {n}</span>
                  <input
                    name={`slit${n}`}
                    type="number"
                    step="0.001"
                    defaultValue={order[`slit${n}` as "slit1"]?.toString()}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-neutral-500">No. of Slit {n}</span>
                  <input
                    name={`noOfSlit${n}`}
                    type="number"
                    defaultValue={order[`noOfSlit${n}` as "noOfSlit1"] ?? undefined}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  />
                </label>
              </div>
            ))}
            <label className="block">
              <span className="block text-xs text-neutral-500">Vendor Name *</span>
              <input
                name="vendorName"
                defaultValue={order.vendorName ?? ""}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Production Plan Date</span>
              <input
                name="productionPlanDate"
                type="date"
                defaultValue={order.productionPlanDate?.toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Truck No.</span>
              <input
                name="truckNo"
                defaultValue={order.truckNo ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Job Work Vendor</span>
              <input
                name="jobWorkVendorName"
                defaultValue={order.jobWorkVendorName ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            {[1, 2, 3, 4].map((n) => (
              <label key={n} className="block">
                <span className="block text-xs text-neutral-500">
                  Customer Master Serial for Slit {n}
                </span>
                <select
                  name={`slittingCustomerMasterSerial${n}`}
                  defaultValue={
                    order[`slittingCustomerMasterSerial${n}` as "slittingCustomerMasterSerial1"] ?? ""
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                >
                  <option value="">—</option>
                  {customerMasters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName} ({c.thickness.toString()}mm)
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button
              type="submit"
              className="col-span-4 mt-2 w-fit rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {canManage &&
        (order.productionStatus === "PENDING" || order.productionStatus === "IN_PROCESS") && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">
            Record slitting production
          </h2>
          <form
            action={addSlittingProduction.bind(null, order.id)}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <label className="block">
              <span className="block text-xs text-neutral-500">No. of bundles</span>
              <input
                name="count"
                type="number"
                min={1}
                max={26}
                defaultValue={order.numberOfBundles ?? 1}
                required
                className="mt-1 w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Slit Width</span>
              <input
                name="slitWidth"
                type="number"
                step="0.001"
                className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Net Wt</span>
              <input
                name="netWt"
                type="number"
                step="0.001"
                className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Gross Wt</span>
              <input
                name="grossWt"
                type="number"
                step="0.001"
                className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
            >
              Add production data
            </button>
          </form>

          <form action={markSlittingCompleted.bind(null, order.id)} className="mt-4">
            <button
              type="submit"
              className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Mark production Completed → Finished Goods
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Bundle</th>
              <th className="px-3 py-2 text-right">Net Wt</th>
              <th className="px-3 py-2 text-right">Available Wt</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {order.slittingProductionData.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 font-medium">{p.bundleIdNo}</td>
                <td className="px-3 py-2 text-right">{p.netWt?.toString() ?? "—"}</td>
                <td className="px-3 py-2 text-right">{p.availableWeight.toString()}</td>
                <td className="px-3 py-2">
                  {canManage && p.availableWeight.greaterThan(0) && (
                    <Link
                      href={`/production/slitting/production/${p.id}/split`}
                      className="text-xs text-neutral-700 underline"
                    >
                      Split
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {order.slittingProductionData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                  No production data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
