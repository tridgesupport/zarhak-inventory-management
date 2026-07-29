import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canEditMaster } from "@/lib/permissions";
import { addCoatingMapping, addTemperMapping } from "./actions";

export default async function CoatingTemperPage() {
  const session = await auth();
  const canEdit = session?.user ? canEditMaster(session.user.role) : false;

  const [coatings, tempers] = await Promise.all([
    prisma.coatingMapping.findMany({ orderBy: { coating: "asc" } }),
    prisma.temperMapping.findMany({ orderBy: { temper: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">
        Coating / Temper Lookups
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Two independent lookups — Coating → Web Coating, and Temper → Web Temper —
        that drive the auto-computed Web Coating/Web Temper fields on Inward records.
        (Confirmed against real production data: these are not a joint mapping.)
      </p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">Coating → Web Coating</h2>
          {canEdit && (
            <form
              action={addCoatingMapping}
              className="mt-2 flex gap-2 rounded-lg border border-neutral-200 bg-white p-3"
            >
              <input
                name="coating"
                placeholder="Coating"
                required
                className="w-1/2 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <input
                name="webCoating"
                placeholder="Web Coating"
                required
                className="w-1/2 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Save
              </button>
            </form>
          )}
          <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Coating</th>
                  <th className="px-3 py-2">Web Coating</th>
                </tr>
              </thead>
              <tbody>
                {coatings.map((c) => (
                  <tr key={c.coating} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{c.coating}</td>
                    <td className="px-3 py-2">{c.webCoating}</td>
                  </tr>
                ))}
                {coatings.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-neutral-400">
                      None yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-neutral-700">Temper → Web Temper</h2>
          {canEdit && (
            <form
              action={addTemperMapping}
              className="mt-2 flex gap-2 rounded-lg border border-neutral-200 bg-white p-3"
            >
              <input
                name="temper"
                placeholder="Temper"
                required
                className="w-1/2 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <input
                name="webTemper"
                placeholder="Web Temper"
                type="number"
                step="0.001"
                required
                className="w-1/2 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Save
              </button>
            </form>
          )}
          <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Temper</th>
                  <th className="px-3 py-2">Web Temper</th>
                </tr>
              </thead>
              <tbody>
                {tempers.map((t) => (
                  <tr key={t.temper} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{t.temper}</td>
                    <td className="px-3 py-2">{t.webTemper.toString()}</td>
                  </tr>
                ))}
                {tempers.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-neutral-400">
                      None yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
