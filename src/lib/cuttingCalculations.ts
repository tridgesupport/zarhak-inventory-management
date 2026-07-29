// Derived shop-floor figures for Cutting Order Summary. Computed on read (not
// stored) — same principle as the PO/Master Stock totals elsewhere.
//
// Note: the source AppSheet formulas for actual-sheets/weight/bundle-height were
// recovered from a PDF export with garbled operators (missing "*" between terms).
// These are re-derived from first principles (steel density 7850 kg/m³) rather than
// guessed at the exact historical spreadsheet quirk — validate against shop-floor
// expectations before relying on them for billing.

const STEEL_DENSITY_KG_M3 = 7850;

export function weightPerSheetMt(thicknessMm: number, widthMm: number, lengthMm: number) {
  const volumeM3 = (thicknessMm / 1000) * (widthMm / 1000) * (lengthMm / 1000);
  return (volumeM3 * STEEL_DENSITY_KG_M3) / 1000; // kg -> MT
}

export function palletOrientation(widthMm: number, lengthMm: number): "V" | "H" {
  return widthMm - lengthMm > 80 ? "V" : "H";
}

function floorTo10(n: number) {
  return Math.floor((n - 4) / 10) * 10;
}

export function palletSize(widthMm: number, lengthMm: number): string {
  const w = floorTo10(widthMm);
  const l = floorTo10(lengthMm);
  const [a, b] = w > l + 79 ? [l, w] : [w, l];
  return `${a} X ${b}`;
}

export interface ActualSheetsInput {
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  noOfSheetsPerPallet?: number | null;
  wtPerBundleMt?: number | null;
}

export function actualNoOfSheets(input: ActualSheetsInput): number {
  const perSheet = weightPerSheetMt(input.thicknessMm, input.widthMm, input.lengthMm);
  const base =
    input.noOfSheetsPerPallet && input.noOfSheetsPerPallet > 0
      ? input.noOfSheetsPerPallet
      : perSheet > 0 && input.wtPerBundleMt
        ? input.wtPerBundleMt / perSheet
        : 0;
  if (base <= 0) return 0;
  return Math.ceil((base - 10) / 50) * 50;
}

export function actualWeightOfBundleMt(
  thicknessMm: number,
  widthMm: number,
  lengthMm: number,
  sheets: number
) {
  return weightPerSheetMt(thicknessMm, widthMm, lengthMm) * sheets;
}

export function bundleHeightMm(thicknessMm: number, sheets: number) {
  return thicknessMm * sheets;
}
