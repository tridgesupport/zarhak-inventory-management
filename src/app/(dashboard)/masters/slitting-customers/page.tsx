import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";
import { addSlittingCustomerMaster } from "./actions";

export default async function SlittingCustomerMasterPage() {
  const session = await auth();
  const canEdit = session?.user ? canEditMaster(session.user.role) : false;
  const rows = await prisma.slittingCustomerMaster.findMany({
    orderBy: { customerName: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Slitting Customer Master</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Per-customer slit specifications (width tolerance, slits per pallet, etc.)
        referenced when creating a Slitting Order.
      </p>

      {canEdit && (
        <form
          action={addSlittingCustomerMaster}
          className="mt-6 grid max-w-3xl grid-cols-3 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input
            name="customerName"
            placeholder="Customer name"
            required
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="thickness"
            type="number"
            step="0.001"
            placeholder="Thickness"
            required
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="slittingSize"
            type="number"
            step="0.001"
            placeholder="Slitting Size"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="widthTolerance"
            placeholder="Width Tolerance"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="noOfSlitPerPallet"
            type="number"
            placeholder="No. of Slit per Pallet"
            required
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="slitCoilId"
            placeholder="Slit Coil ID"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="palletSize"
            placeholder="Pallet Size"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="remarks"
            placeholder="Remarks"
            className="col-span-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="col-span-3 mt-1 w-fit rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Thickness</th>
              <th className="px-4 py-2">Slitting Size</th>
              <th className="px-4 py-2">Width Tol.</th>
              <th className="px-4 py-2">Slits/Pallet</th>
              <th className="px-4 py-2">Pallet Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.customerName}</td>
                <td className="px-4 py-2">{r.thickness.toString()}</td>
                <td className="px-4 py-2">{r.slittingSize?.toString() ?? "—"}</td>
                <td className="px-4 py-2">{r.widthTolerance ?? "—"}</td>
                <td className="px-4 py-2">{r.noOfSlitPerPallet}</td>
                <td className="px-4 py-2">{r.palletSize ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  None yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
