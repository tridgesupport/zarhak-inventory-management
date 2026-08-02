"use client";

import { useMemo, useState, type ReactNode } from "react";

export type DataTableColumnDef = {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Show a per-column filter dropdown, built from the distinct `search[key]` values present in rows. */
  filterable?: boolean;
};

export type DataTableRow = {
  /** Unique row key. */
  key: string;
  /** Column key -> already-rendered cell content (a Server Component can render this before handing it down). */
  cells: Record<string, ReactNode>;
  /**
   * Column key -> plain-text value for that cell, used for free-text search and
   * (if the column is filterable) to build the filter dropdown's options. Only
   * needs an entry for columns you want searchable/filterable.
   */
  search?: Record<string, string>;
};

export function DataTable({
  columns,
  rows,
  emptyLabel = "Nothing here.",
}: {
  columns: DataTableColumnDef[];
  rows: DataTableRow[];
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const filterableColumns = useMemo(() => columns.filter((c) => c.filterable), [columns]);

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    for (const col of filterableColumns) {
      const values = new Set<string>();
      for (const row of rows) {
        const value = row.search?.[col.key];
        if (value) values.add(value);
      }
      options[col.key] = [...values].sort((a, b) => a.localeCompare(b));
    }
    return options;
  }, [filterableColumns, rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      for (const col of filterableColumns) {
        const active = columnFilters[col.key];
        if (active && row.search?.[col.key] !== active) return false;
      }
      if (!q) return true;
      const values = row.search ? Object.values(row.search) : [];
      return values.some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, filterableColumns, columnFilters, query]);

  const hasSearchableColumns = rows.some((r) => r.search && Object.keys(r.search).length > 0);

  return (
    <div>
      {(hasSearchableColumns || filterableColumns.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          {filterableColumns.map((col) => (
            <select
              key={col.key}
              value={columnFilters[col.key] ?? ""}
              onChange={(e) =>
                setColumnFilters((prev) => ({ ...prev, [col.key]: e.target.value }))
              }
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-700"
            >
              <option value="">{col.header}: All</option>
              {filterOptions[col.key]?.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ))}
          {(query || Object.values(columnFilters).some(Boolean)) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setColumnFilters({});
              }}
              className="text-xs text-neutral-500 underline"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-neutral-400">
            {filteredRows.length} of {rows.length}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.key} className="border-t border-neutral-100">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {row.cells[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-neutral-400">
                  {rows.length === 0 ? emptyLabel : "No rows match your search/filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
