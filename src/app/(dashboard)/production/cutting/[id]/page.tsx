import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";
import {
  actualNoOfSheets,
  actualWeightOfBundleMt,
  bundleHeightMm,
  palletOrientation,
  palletSize,
} from "@/lib/cuttingCalculations";
import {
  updatePlanning,
  approveCuttingOrder,
  addMachineProduction,
  addQualityData,
  addBundlewiseData,
  approveBundle,
} from "../actions";

export default async function CuttingOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canManage = session?.user ? canManageProduction(session.user.role) : false;

  const order = await prisma.cuttingOrderSummary.findUnique({
    where: { id },
    include: {
      customer: true,
      machineProductions: { orderBy: { createdAt: "desc" } },
      qualityData: { orderBy: { createdAt: "desc" } },
      bundlewiseData: { orderBy: { bundleIdNo: "asc" } },
    },
  });
  if (!order) notFound();

  const width = Number(order.width);
  const length = order.length ? Number(order.length) : 0;
  const thickness = Number(order.thickness);
  const sheets = order.length
    ? actualNoOfSheets({
        thicknessMm: thickness,
        widthMm: width,
        lengthMm: length,
        noOfSheetsPerPallet: order.noOfSheetsPerPallet ? Number(order.noOfSheetsPerPallet) : null,
        wtPerBundleMt: order.wtPerBundle ? Number(order.wtPerBundle) : null,
      })
    : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{order.zsplId}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {order.itemType} · {thickness}x{width}
            {length ? `x${length}` : ""} · {order.coating}/{order.temper} · Status:{" "}
            {order.productionStatus}
          </p>
        </div>
        {canManage && order.availableWeight.greaterThan(0) && (
          <Link
            href={`/production/cutting/${order.id}/split`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Split
          </Link>
        )}
      </div>

      {length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <Stat label="Pallet Orientation" value={palletOrientation(width, length)} />
          <Stat label="Pallet Size" value={palletSize(width, length)} />
          <Stat label="Actual No. of Sheets" value={String(sheets)} />
          <Stat
            label="Actual Wt of Bundle"
            value={`${actualWeightOfBundleMt(thickness, width, length, sheets).toFixed(3)} MT`}
          />
          <Stat label="Bundle Height" value={`${bundleHeightMm(thickness, sheets).toFixed(1)} mm`} />
          <Stat label="Available Wt" value={`${order.availableWeight.toString()} MT`} />
          <Stat label="No. of Splits" value={String(order.noOfSplits)} />
          <Stat label="Approved By" value={order.approvedBy ?? "—"} />
        </div>
      )}

      {canManage && (
        <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">
            Production planning
          </h2>
          <form
            action={updatePlanning.bind(null, order.id)}
            className="mt-4 grid grid-cols-3 gap-4"
          >
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Cut Length *
              </span>
              <input
                name="length"
                type="number"
                step="0.001"
                defaultValue={order.length?.toString()}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Production Plan Date *
              </span>
              <input
                name="productionPlanDate"
                type="date"
                defaultValue={order.productionPlanDate?.toISOString().slice(0, 10)}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Production Sequence
              </span>
              <input
                name="productionSequence"
                type="number"
                defaultValue={order.productionSequence ?? undefined}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                No. of Sheets per Pallet *
              </span>
              <input
                name="noOfSheetsPerPallet"
                type="number"
                step="0.01"
                defaultValue={order.noOfSheetsPerPallet?.toString()}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Wt per Bundle *
              </span>
              <input
                name="wtPerBundle"
                type="number"
                step="0.001"
                defaultValue={order.wtPerBundle?.toString()}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                No. of Bundles *
              </span>
              <input
                name="noOfBundles"
                type="number"
                defaultValue={order.noOfBundles ?? 1}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">
                Packing Type
              </span>
              <input
                name="packingType"
                defaultValue={order.packingType ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="col-span-3 mt-2 w-fit rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Save planning
            </button>
          </form>

          {!order.approvedBy && order.productionPlanDate && (
            <form action={approveCuttingOrder.bind(null, order.id)} className="mt-4">
              <button
                type="submit"
                className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
              >
                Approve → move to Daily Cutting queue
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-neutral-700">Machine Production</h2>
          {canManage && (
            <form
              action={addMachineProduction.bind(null, order.id)}
              className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="mainOperator"
                  placeholder="Main Operator"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="shift"
                  placeholder="Shift"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="actualNetWeight"
                  type="number"
                  step="0.001"
                  placeholder="Actual Net Weight"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="totalSheets"
                  type="number"
                  placeholder="Total Sheets"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="totalPrimeSheet"
                  type="number"
                  placeholder="Total Prime Sheets"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="totalRejectSheets"
                  type="number"
                  placeholder="Total Reject Sheets"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
              </div>
              <label className="block text-xs text-neutral-500">
                Production End Time (fill only once production is truly done)
                <input
                  name="productionEndTime"
                  type="datetime-local"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Add production entry
              </button>
            </form>
          )}
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {order.machineProductions.map((m) => (
              <li key={m.id} className="rounded-md border border-neutral-100 bg-white p-2">
                {m.mainOperator ?? "—"} · Shift {m.shift ?? "—"} · Net Wt{" "}
                {m.actualNetWeight?.toString() ?? "—"} ·{" "}
                {m.productionEndTime ? "Ended" : "In progress"}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-neutral-700">Quality Data</h2>
          {canManage && (
            <form
              action={addQualityData.bind(null, order.id)}
              className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="hardness"
                  type="number"
                  placeholder="Hardness"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="actualTemper"
                  placeholder="Actual Temper"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="cuppingValue"
                  type="number"
                  step="0.001"
                  placeholder="Cupping Value"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
                <input
                  name="sheetSize"
                  type="number"
                  placeholder="Sheet Size"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
                />
              </div>
              <input
                name="defectsObserved"
                placeholder="Defects observed"
                className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Add quality entry
              </button>
            </form>
          )}
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {order.qualityData.map((q) => (
              <li key={q.id} className="rounded-md border border-neutral-100 bg-white p-2">
                Hardness {q.hardness?.toString() ?? "—"} · Temper{" "}
                {q.actualTemper ?? "—"} · {q.defectsObserved || "No defects noted"}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-700">Bundlewise Data</h2>
        {canManage && (
          <form
            action={addBundlewiseData.bind(null, order.id)}
            className="mt-2 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <label className="block">
              <span className="block text-xs text-neutral-500">No. of bundles</span>
              <input
                name="count"
                type="number"
                min={1}
                max={26}
                defaultValue={order.noOfBundles ?? 1}
                required
                className="mt-1 w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Prepared By</span>
              <input
                name="preparedBy"
                className="mt-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Pallet Wt</span>
              <input
                name="palletWeight"
                type="number"
                step="0.001"
                className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500">Gross Bundle Wt</span>
              <input
                name="grossBundleWt"
                type="number"
                step="0.001"
                className="mt-1 w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              <input type="checkbox" name="includeReject" /> Include XX (reject)
            </label>
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              <input type="checkbox" name="includeScrap" /> Include YY (scrap)
            </label>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
            >
              Create bundles + labels
            </button>
          </form>
        )}

        <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Bundle</th>
                <th className="px-3 py-2 text-right">Net Wt</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {order.bundlewiseData.map((b) => (
                <tr key={b.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-medium">{b.bundleIdNo}</td>
                  <td className="px-3 py-2 text-right">
                    {b.netBundleWt?.toString() ?? "—"}
                  </td>
                  <td className="px-3 py-2">{b.status}</td>
                  <td className="px-3 py-2">
                    {canManage && b.status === "PENDING" && (
                      <form action={approveBundle.bind(null, b.id)}>
                        <button
                          type="submit"
                          className="text-xs text-green-700 underline"
                        >
                          Approve for FG
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {order.bundlewiseData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                    No bundles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
