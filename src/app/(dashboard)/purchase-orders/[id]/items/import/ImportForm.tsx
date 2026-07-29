"use client";

import { useState, useTransition } from "react";
import type { ParsedItemDetailRow } from "@/lib/csv/itemDetails";
import { previewItemDetailsImport, commitItemDetailsImport } from "./actions";

export function ImportForm({ poId }: { poId: string }) {
  const [rows, setRows] = useState<ParsedItemDetailRow[]>([]);
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
      const result = await previewItemDetailsImport(poId, formData);
      setRows(result.validRows);
      setErrors(result.errors);
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await commitItemDetailsImport(poId, rows);
      setCommitted(true);
    });
  }

  return (
    <div className="max-w-4xl">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <label className="block text-sm font-medium text-neutral-700">
          Upload Item Details CSV
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
                  <th className="px-3 py-2">Item Type</th>
                  <th className="px-3 py-2">Thickness</th>
                  <th className="px-3 py-2">Width</th>
                  <th className="px-3 py-2">Length</th>
                  <th className="px-3 py-2">Coating</th>
                  <th className="px-3 py-2">Temper</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2 text-right">Qty (MT)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{r.itemType}</td>
                    <td className="px-3 py-2">{r.thickness}</td>
                    <td className="px-3 py-2">{r.width}</td>
                    <td className="px-3 py-2">{r.length ?? "—"}</td>
                    <td className="px-3 py-2">{r.coating}</td>
                    <td className="px-3 py-2">{r.temper}</td>
                    <td className="px-3 py-2">{r.grade}</td>
                    <td className="px-3 py-2 text-right">{r.qtyMt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleConfirm}
            className="mt-4 rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Confirm import ({rows.length} row{rows.length === 1 ? "" : "s"})
          </button>
        </div>
      )}

      {committed && (
        <p className="mt-4 text-sm text-green-700">
          Import complete — redirecting…
        </p>
      )}
    </div>
  );
}
