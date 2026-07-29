import Papa from "papaparse";
import { z } from "zod";
import { ItemType } from "@/generated/prisma/enums";
import { buildConcatenateKey } from "@/lib/matching";

export const ITEM_DETAILS_TEMPLATE_HEADERS = [
  "Item Type",
  "Thickness",
  "Width",
  "Length",
  "Coating",
  "Temper",
  "Finish",
  "Grade",
  "Annealed Type",
  "Vendor ID No.",
  "Qty (Mt)",
  "Coil ID",
  "Vendor Name",
  "Steel Type",
  "Purchase Price",
  "Product Category",
  "PO Item Remark",
  "Sleeve Type",
  "End Use",
] as const;

const rowSchema = z.object({
  "Item Type": z.enum(ItemType),
  Thickness: z.coerce.number().positive(),
  Width: z.coerce.number().positive(),
  // Blank means "no cut length" (coil-form item) — must short-circuit to undefined
  // BEFORE coercion, since Number("") is 0 in JS, not NaN, and would otherwise pass
  // validation as a bogus zero-length row instead of staying null.
  Length: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().nonnegative().optional()
  ),
  Coating: z.string().min(1),
  Temper: z.string().min(1),
  Finish: z.string().min(1),
  Grade: z.string().min(1),
  "Annealed Type": z.string().optional(),
  "Vendor ID No.": z.string().optional(),
  "Qty (Mt)": z.coerce.number().positive(),
  "Coil ID": z.string().optional(),
  "Vendor Name": z.string().min(1),
  "Steel Type": z.string().min(1),
  "Purchase Price": z.coerce.number().nonnegative(),
  "Product Category": z.string().min(1),
  "PO Item Remark": z.string().optional(),
  "Sleeve Type": z.string().optional(),
  "End Use": z.string().optional(),
});

const ITEM_NAME_MAP: Record<string, string> = {
  ETP: "tinplate",
  TFS: "Tin Free Steel",
  TMBP: "Tin Metal Black Plate",
  A: "Aluminium",
};

export interface ParsedItemDetailRow {
  itemType: (typeof ItemType)[keyof typeof ItemType];
  thickness: number;
  width: number;
  length: number | null;
  coating: string;
  temper: string;
  finish: string;
  grade: string;
  annealedType: string | null;
  vendorIdNo: string | null;
  qtyMt: number;
  coilId: string | null;
  vendorName: string;
  steelType: string;
  purchasePrice: number;
  productCategory: string;
  itemRemark: string | null;
  sleeveType: string | null;
  endUse: string | null;
  bundleCoil: string;
  itemName: string;
  concatenateKey: string;
}

export interface ParseResult {
  validRows: ParsedItemDetailRow[];
  errors: { row: number; message: string }[];
}

export function parseItemDetailsCsv(
  csvText: string,
  purchaseOrderNo: string
): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const validRows: ParsedItemDetailRow[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, idx) => {
    const rowNum = idx + 2; // account for header row, 1-indexed
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
    const length = r.Length === undefined ? null : r.Length;

    validRows.push({
      itemType: r["Item Type"],
      thickness: r.Thickness,
      width: r.Width,
      length,
      coating: r.Coating,
      temper: r.Temper,
      finish: r.Finish,
      grade: r.Grade,
      annealedType: r["Annealed Type"]?.trim() || null,
      vendorIdNo: r["Vendor ID No."]?.trim() || null,
      qtyMt: r["Qty (Mt)"],
      coilId,
      vendorName: r["Vendor Name"],
      steelType: r["Steel Type"],
      purchasePrice: r["Purchase Price"],
      productCategory: r["Product Category"],
      itemRemark: r["PO Item Remark"]?.trim() || null,
      sleeveType: r["Sleeve Type"]?.trim() || null,
      endUse: r["End Use"]?.trim() || null,
      bundleCoil: coilId ? "B" : "C",
      itemName: ITEM_NAME_MAP[r["Item Type"]] ?? "Other",
      concatenateKey: buildConcatenateKey({
        purchaseOrderNo,
        itemType: r["Item Type"],
        thickness: r.Thickness,
        width: r.Width,
        length,
        coating: r.Coating,
        temper: r.Temper,
        finish: r.Finish,
        grade: r.Grade,
        vendorIdNo: r["Vendor ID No."],
        coilId,
      }),
    });
  });

  return { validRows, errors };
}

export function itemDetailsTemplateCsv(): string {
  return Papa.unparse({
    fields: [...ITEM_DETAILS_TEMPLATE_HEADERS],
    data: [],
  });
}
