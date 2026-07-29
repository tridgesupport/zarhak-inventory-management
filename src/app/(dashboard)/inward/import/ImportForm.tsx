"use client";

import { useState, useTransition } from "react";
import { previewInwardImport, commitInwardImport, type InwardPreviewRow } from "./actions";

export function ImportForm() {
  const [rows, setRows] = useState<InwardPreviewRow[]>([]);
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [committed, setCommitted] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await previewInwardImport(formData);
      setRows(result.rows);
      setErrors(result.errors);
    });
  }

  function setMatch(rowIndex: number, itemDetailId: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, matchedItemId: itemDetailId, issue: null }
          : r
      )
    );
  }

  function handleConfirm() {
    startTransition(async () => {
      await commitInwardImport(rows);
      setCommitted(true);
    });
  }

  const importableCount = rows.filter((r) => r.purchaseOrderId).length;

  return (
    <div className="max-w-6xl">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <label className="block text-sm font-medium text-neutral-700">
          Upload Inward CSV
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="mt-2 block text-sm"
        />
        {fileName && <p className="mt-1 text-xs text-neutral-500">{fileName}</p>}
      </div>

      {isPending && <p className="mt-4 text-sm text-neutral-500">Working…</p>}

      {!isPending && errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            {errors.length} row(s) failed validation and will NOT be imported:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {errors.map((e) => (
              <li key={e.row}>
                Row {e.row}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isPending && rows.length > 0 && !committed && (
        <div className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2">PO No.</th>
                  <th className="px-3 py-2">Item Type</th>
                  <th className="px-3 py-2">Spec</th>
                  <th className="px-3 py-2 text-right">Net Wt</th>
                  <th className="px-3 py-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowIndex} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{r.purchaseOrderNo}</td>
                    <td className="px-3 py-2">{r.itemType}</td>
                    <td className="px-3 py-2">
                      {r.thickness}x{r.width}
                      {r.length ? `x${r.length}` : ""} {r.coating}/{r.temper}
                    </td>
                    <td className="px-3 py-2 text-right">{r.netWt}</td>
                    <td className="px-3 py-2">
                      {!r.purchaseOrderId ? (
                        <span className="text-xs text-red-600">{r.issue}</span>
                      ) : r.matchedItemId ? (
                        <span className="text-xs text-green-700">Matched</span>
                      ) : r.matchCandidates.length > 0 ? (
                        <select
                          className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                          onChange={(e) => setMatch(r.rowIndex, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Select match…
                          </option>
                          {r.matchCandidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-amber-700">{r.issue}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleConfirm}
            disabled={importableCount === 0}
            className="mt-4 rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Confirm import ({importableCount} row{importableCount === 1 ? "" : "s"})
          </button>
          <p className="mt-2 text-xs text-neutral-500">
            Rows without a valid PO are skipped. Rows without a match still import —
            resolve the discrepancy afterward on the Inward screen.
          </p>
        </div>
      )}

      {committed && (
        <p className="mt-4 text-sm text-green-700">Import complete — redirecting…</p>
      )}
    </div>
  );
}
