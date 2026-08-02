import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// Atomic upsert-and-increment, replacing AppSheet's racy MAX(...)+1 pattern. Must be
// called inside the same transaction as the row it numbers, so a failed insert doesn't
// burn a sequence number silently out of band (a gap is fine; a duplicate is not).

export async function nextPoSeq(tx: Tx, fy: string): Promise<number> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "PoSequence" (fy, "lastSeq") VALUES (${fy}, 1)
    ON CONFLICT (fy) DO UPDATE SET "lastSeq" = "PoSequence"."lastSeq" + 1
    RETURNING "lastSeq"
  `;
  return rows[0].lastSeq;
}

export async function nextSalesSeq(tx: Tx, fy: string): Promise<number> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "SalesSequence" (fy, "lastSeq") VALUES (${fy}, 1)
    ON CONFLICT (fy) DO UPDATE SET "lastSeq" = "SalesSequence"."lastSeq" + 1
    RETURNING "lastSeq"
  `;
  return rows[0].lastSeq;
}

export async function nextZsplSeq(tx: Tx): Promise<number> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "ZsplSequence" (key, "lastSeq") VALUES ('global', 1)
    ON CONFLICT (key) DO UPDATE SET "lastSeq" = "ZsplSequence"."lastSeq" + 1
    RETURNING "lastSeq"
  `;
  return rows[0].lastSeq;
}

export async function nextDoSeq(tx: Tx, fy: string): Promise<number> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "DoSequence" (fy, "lastSeq") VALUES (${fy}, 1)
    ON CONFLICT (fy) DO UPDATE SET "lastSeq" = "DoSequence"."lastSeq" + 1
    RETURNING "lastSeq"
  `;
  return rows[0].lastSeq;
}

export async function nextWorkOrderSeq(tx: Tx, year: number): Promise<number> {
  const rows = await tx.$queryRaw<{ lastSeq: number }[]>`
    INSERT INTO "WorkOrderSequence" (year, "lastSeq") VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET "lastSeq" = "WorkOrderSequence"."lastSeq" + 1
    RETURNING "lastSeq"
  `;
  return rows[0].lastSeq;
}

// Indian FY: Apr(4)-Mar(3), formatted as "25-26" style 2-digit-2-digit.
export function fiscalYearFor(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const startYear = month <= 3 ? year - 1 : year;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}
