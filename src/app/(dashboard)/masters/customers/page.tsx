import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";
import { createCustomer } from "./actions";

export default async function CustomersPage() {
  const session = await auth();
  const canEdit = session?.user ? canEditMaster(session.user.role) : false;

  const customers = await prisma.customer.findMany({
    orderBy: { legalName: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Customers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Customer master data. Editing is restricted to admins.
      </p>

      {canEdit && (
        <form
          action={createCustomer}
          className="mt-6 grid max-w-3xl grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="col-span-2 text-sm font-medium text-neutral-700">
            Add customer
          </h2>
          <input
            name="legalName"
            placeholder="Legal name (Consignee/Buyer)"
            required
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="displayName"
            placeholder="Display name (for packing lists)"
            required
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="alpha"
            placeholder="Alpha code"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="zsplCode"
            placeholder="ZSPL customer code"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="gstin"
            placeholder="GSTIN/UIN"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="stateName"
            placeholder="State"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="location"
            placeholder="Location"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="address"
            placeholder="Address"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="col-span-2 mt-1 w-fit rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add customer
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Legal Name</th>
              <th className="px-4 py-2">Display Name</th>
              <th className="px-4 py-2">ZSPL Code</th>
              <th className="px-4 py-2">GSTIN</th>
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{c.legalName}</td>
                <td className="px-4 py-2">{c.displayName}</td>
                <td className="px-4 py-2">{c.zsplCode}</td>
                <td className="px-4 py-2">{c.gstin}</td>
                <td className="px-4 py-2">{c.stateName}</td>
                <td className="px-4 py-2">{c.location}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
