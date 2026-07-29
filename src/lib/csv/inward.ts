import Papa from "papaparse";
import { z } from "zod";

export const INWARD_TEMPLATE_HEADERS = [
  "Purchase Order No.",
  "Dispatch date",
  "Item Type",
  "Grade",
  "Thickness",
  "Width",
  "Length",
  "Mill",
  "Coating",
  "Temper",
  "Finish",
  "Net Wt",
  "Coil Length",
  "No of sheets",
  "Coil ID",
  "Vendor Name",
  "Vehicle No.",
  "Vendor ID No.",
  "Heat No",
  "Mill TC",
  "Purchase Type",
  "Vendor Inv No.",
  "Vendor Inv Date",
  "Annealed Type",
] as const;

const optionalNumber = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce.number().optional()
);

const rowSchema = z.object({
  "Purchase Order No.": z.string().min(1),
  "Dispatch date": z.string().optional(),
  "Item Type": z.string().min(1),
  Grade: z.string().min(1),
  Thickness: z.coerce.number().positive(),
  Width: z.coerce.number().positive(),
  Length: optionalNumber,
  Mill: z.string().min(1),
  Coating: z.string().min(1),
  Temper: z.string().min(1),
  Finish: z.string().min(1),
  "Net Wt": z.coerce.number().positive(),
  "Coil Length": optionalNumber,
  "No of sheets": optionalNumber,
  "Coil ID": z.string().optional(),
  "Vendor Name": z.string().min(1),
  "Vehicle No.": z.string().min(1),
  "Vendor ID No.": z.string().optional(),
  "Heat No": z.string().optional(),
  "Mill TC": z.string().optional(),
  "Purchase Type": z.string().min(1),
  "Vendor Inv No.": z.string().optional(),
  "Vendor Inv Date": z.string().optional(),
  "Annealed Type": z.string().optional(),
});

export interface ParsedInwardRow {
  purchaseOrderNo: string;
  dispatchDate: Date | null;
  itemType: string;
  grade: string;
  thickness: number;
  width: number;
  length: number | null;
  mill: string;
  coating: string;
  temper: string;
  finish: string;
  netWt: number;
  coilLength: number | null;
  noOfSheets: number | null;
  coilId: string | null;
  vendorName: string;
  vehicleNo: string;
  vendorIdNo: string | null;
  heatNo: string | null;
  millTc: string | null;
  purchaseType: string;
  vendorInvoiceNo: string | null;
  vendorInvDate: Date | null;
  annealedType: string | null;
  concatenatedId: string;
  bundleCoil: string;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface StaticParseResult {
  validRows: ParsedInwardRow[];
  errors: { row: number; message: string }[];
}

// Only validates/shapes the CSV's own columns — PO lookup, item-detail matching, and
// coating/temper-mapping resolution all need DB access and happen in the server action
// that calls this (see actions.ts), since unlike Item Details (scoped to one known PO)
// each Inward row carries its own PO No. and must be resolved independently.
export function parseInwardCsv(csvText: string): StaticParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const validRows: ParsedInwardRow[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      errors.push({
        row: rowNum,
        message: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
      return;
    }
    const r = result.data;
    const coilId = r["Coil ID"]?.trim() || null;

    validRows.push({
      purchaseOrderNo: r["Purchase Order No."],
      dispatchDate: parseDate(r["Dispatch date"]),
      itemType: r["Item Type"],
      grade: r.Grade,
      thickness: r.Thickness,
      width: r.Width,
      length: r.Length ?? null,
      mill: r.Mill,
      coating: r.Coating,
      temper: r.Temper,
      finish: r.Finish,
      netWt: r["Net Wt"],
      coilLength: r["Coil Length"] ?? null,
      noOfSheets: r["No of sheets"] ?? null,
      coilId,
      vendorName: r["Vendor Name"],
      vehicleNo: r["Vehicle No."],
      vendorIdNo: r["Vendor ID No."]?.trim() || null,
      heatNo: r["Heat No"]?.trim() || null,
      millTc: r["Mill TC"]?.trim() || null,
      purchaseType: r["Purchase Type"],
      vendorInvoiceNo: r["Vendor Inv No."]?.trim() || null,
      vendorInvDate: parseDate(r["Vendor Inv Date"]),
      annealedType: r["Annealed Type"]?.trim() || null,
      bundleCoil: coilId ? "B" : "C",
      // filled in below once we know the PO number is valid — placeholder here
      concatenatedId: "",
    });
  });

  return { validRows, errors };
}

export function inwardTemplateCsv(): string {
  return Papa.unparse({ fields: [...INWARD_TEMPLATE_HEADERS], data: [] });
}
