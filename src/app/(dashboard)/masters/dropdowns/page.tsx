import { prisma } from "@/lib/db";
import { LookupDomain } from "@/generated/prisma/enums";
import { addLookupValue, deactivateLookupValue } from "./actions";

export default async function DropdownsPage() {
  const values = await prisma.lookupValue.findMany({
    where: { isActive: true },
    orderBy: [{ domain: "asc" }, { value: "asc" }],
  });

  const byDomain = new Map<string, typeof values>();
  for (const v of values) {
    const list = byDomain.get(v.domain) ?? [];
    list.push(v);
    byDomain.set(v.domain, list);
  }

  const domains = Object.values(LookupDomain).sort();

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Dropdowns</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Shared lookup values used across the app. Anyone signed in can add a new value
        to any list — this mirrors the source app&apos;s self-service dropdown append.
      </p>

      <form
        action={addLookupValue}
        className="mt-6 flex max-w-xl items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500">Domain</label>
          <select
            name="domain"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-500">
            New value
          </label>
          <input
            name="value"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Add
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => (
          <div
            key={domain}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-neutral-800">{domain}</h2>
            <ul className="mt-2 space-y-1">
              {(byDomain.get(domain) ?? []).map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between text-sm text-neutral-700"
                >
                  <span>{v.value}</span>
                  <form action={deactivateLookupValue.bind(null, v.id)}>
                    <button
                      type="submit"
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      remove
                    </button>
                  </form>
                </li>
              ))}
              {(byDomain.get(domain) ?? []).length === 0 && (
                <li className="text-sm text-neutral-400">No values yet</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
