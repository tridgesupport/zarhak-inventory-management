// Reusable core for the "split a lot into up to 10 numbered sub-items, decrementing
// the parent's available quantity" pattern — used by Master Stock now and, per the
// plan, identically by Cutting Order Summary / Trading Summary / Slitting Production
// Data in Phase 2. Keep this pure (no Prisma/IO) so it's trivially unit-testable and
// reusable from any table's split wrapper action.

export interface SplitInput {
  qty: number;
}

export interface SplitComputation {
  childQtys: number[];
  remainingAvailable: number;
}

export function computeSplit(
  availableWeight: number,
  splits: SplitInput[]
): SplitComputation {
  if (splits.length === 0) {
    throw new Error("At least one split is required");
  }
  if (splits.length > 10) {
    throw new Error("A maximum of 10 splits is supported");
  }

  const childQtys = splits.map((s, i) => {
    if (!(s.qty > 0)) {
      throw new Error(`Split ${i + 1} quantity must be greater than 0`);
    }
    return s.qty;
  });

  const sum = childQtys.reduce((a, b) => a + b, 0);
  // Small epsilon to tolerate floating-point rounding on decimal weights.
  if (sum > availableWeight + 1e-9) {
    throw new Error(
      `Split total (${sum}) exceeds available weight (${availableWeight})`
    );
  }

  return { childQtys, remainingAvailable: availableWeight - sum };
}
