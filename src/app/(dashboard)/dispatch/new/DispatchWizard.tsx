"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getEligibleDispatchItems,
  commitDispatch,
  type EligibleDispatchItem,
  type DispatchDetails,
} from "./actions";
import { DataTable, type DataTableColumnDef, type DataTableRow } from "@/components/DataTable";

type Customer = { id: string; displayName: string };
type Transporter = { id: string; name: string };

export function DispatchWizard({
  customers,
  transporters,
}: {
  customers: Customer[];
  transporters: Transporter[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<EligibleDispatchItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<DispatchDetails>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const result = await getEligibleDispatchItems();
      setItems(result);
      setLoaded(true);
    });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedItems = items.filter((i) => selected.has(i.id));

  const columns: DataTableColumnDef[] = [
    { key: "select", header: "" },
    { key: "source", header: "Source", filterable: true },
    { key: "zsplId", header: "ZSPL ID" },
    { key: "spec", header: "Spec" },
    { key: "netWeight", header: "Net Wt", align: "right" },
    { key: "customer", header: "Customer", filterable: true },
  ];

  const rows: DataTableRow[] = items.map((item) => ({
    key: item.id,
    cells: {
      select: (
        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
      ),
      source: item.source,
      zsplId: item.zsplId,
      spec: item.spec,
      netWeight: item.netWeight,
      customer: item.customerName,
    },
    search: {
      source: item.source,
      zsplId: item.zsplId,
      spec: item.spec,
      customer: item.customerName,
    },
  }));

  function handleCommit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await commitDispatch(
          selectedItems.map((i) => ({ id: i.id, source: i.source })),
          details
        );
        router.push("/dispatch");
        router.refresh();
        void result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create dispatch");
      }
    });
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <StepLabel n={1} label="Pick items" active={step === 1} />
        <span>→</span>
        <StepLabel n={2} label="Dispatch details" active={step === 2} />
        <span>→</span>
        <StepLabel n={3} label="Confirm" active={step === 3} />
      </div>

      {step === 1 && (
        <div className="mt-4">
          {!loaded ? (
            <p className="text-sm text-neutral-500">Loading eligible items…</p>
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                emptyLabel="Nothing eligible to dispatch right now."
              />
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-neutral-500">{selected.size} item(s) selected</p>
                <button
                  type="button"
                  disabled={selected.size === 0}
                  onClick={() => setStep(2)}
                  className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-xs text-neutral-500">
            A DO number will be assigned automatically when you confirm.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">Buyer</span>
              <select
                value={details.buyerId ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, buyerId: e.target.value || undefined }))
                }
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
              <span className="block text-xs font-medium text-neutral-500">Consignee</span>
              <select
                value={details.consigneeId ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, consigneeId: e.target.value || undefined }))
                }
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
              <span className="block text-xs font-medium text-neutral-500">Transporter</span>
              <select
                value={details.transporterName ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, transporterName: e.target.value || undefined }))
                }
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">Vehicle Number</span>
              <input
                value={details.vehicleNumber ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, vehicleNumber: e.target.value || undefined }))
                }
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">Lorry Weight</span>
              <input
                type="number"
                step="0.01"
                value={details.lorryWeight ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({
                    ...d,
                    lorryWeight: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-500">DO Date</span>
              <input
                type="date"
                value={details.doDate ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, doDate: e.target.value || undefined }))
                }
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-700">
            Confirm {selectedItems.length} item(s)
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {selectedItems.map((i) => (
              <li key={i.id}>
                {i.source} — {i.zsplId} — {i.spec} — {i.netWeight} MT
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-neutral-600">
            <div>
              <dt className="text-xs uppercase text-neutral-400">Buyer</dt>
              <dd>{customers.find((c) => c.id === details.buyerId)?.displayName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-400">Consignee</dt>
              <dd>{customers.find((c) => c.id === details.consigneeId)?.displayName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-400">Transporter</dt>
              <dd>{details.transporterName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-400">Vehicle No.</dt>
              <dd>{details.vehicleNumber ?? "—"}</dd>
            </div>
          </dl>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleCommit}
              className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Confirm dispatch"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepLabel({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <span className={active ? "font-semibold text-neutral-900" : ""}>
      {n}. {label}
    </span>
  );
}
