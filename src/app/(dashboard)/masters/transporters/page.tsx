import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";
import { addTransporter } from "./actions";

export default async function TransportersPage() {
  const session = await auth();
  const canEdit = session?.user ? canEditMaster(session.user.role) : false;
  const rows = await prisma.transporter.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Transporters</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Master list of transporters used on Dispatch Summary records.
      </p>

      {canEdit && (
        <form
          action={addTransporter}
          className="mt-6 flex max-w-xl gap-2 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input
            name="name"
            placeholder="Transporter name"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <input
            name="gstNo"
            placeholder="GST No."
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Add
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">GST No.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.gstNo ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-neutral-400">
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
