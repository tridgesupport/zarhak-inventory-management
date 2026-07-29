// Shared composite match key used to link Inward records back to the PO Item Detail
// line they were received against. Replaces the source app's manual, error-prone
// "Concatenate Item details" field — computed identically here and in the Inward
// import path so an exact-match lookup is all that's needed (see plan §5: exact-key
// only, no fuzzy matching — ambiguity in weight reconciliation is a real business risk).

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function normNum(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "";
  return String(n);
}

export interface MatchKeyInput {
  purchaseOrderNo: string;
  itemType: string;
  thickness: number | string | null | undefined;
  width: number | string | null | undefined;
  length: number | string | null | undefined;
  coating: string | null | undefined;
  temper: string | null | undefined;
  finish: string | null | undefined;
  grade: string | null | undefined;
  vendorIdNo: string | null | undefined;
  coilId: string | null | undefined;
}

export function buildConcatenateKey(input: MatchKeyInput): string {
  return [
    norm(input.purchaseOrderNo),
    norm(input.itemType),
    normNum(input.thickness),
    normNum(input.width),
    normNum(input.length),
    norm(input.coating),
    norm(input.temper),
    norm(input.finish),
    norm(input.grade),
    norm(input.vendorIdNo),
    norm(input.coilId),
  ].join("|");
}
