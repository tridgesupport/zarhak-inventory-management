import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import XLSX from "xlsx";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

const WORKBOOK_PATH = path.join(__dirname, "data", "zarhak-production-export.xlsx");

function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return connectionString.includes("neon.tech")
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
}

export const prisma = new PrismaClient({ adapter: createAdapter() });

let workbook: XLSX.WorkBook | null = null;
function getWorkbook(): XLSX.WorkBook {
  if (!workbook) {
    if (!fs.existsSync(WORKBOOK_PATH)) {
      throw new Error(
        `Migration source not found at ${WORKBOOK_PATH}. Copy the exported workbook there first.`
      );
    }
    workbook = XLSX.readFile(WORKBOOK_PATH, { cellDates: true });
  }
  return workbook;
}

export function readSheet<T = Record<string, unknown>>(sheetName: string): T[] {
  const wb = getWorkbook();
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found in workbook`);
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: null, raw: true });
}

export interface RowError {
  sheet: string;
  rowNum: number;
  key: string | null;
  message: string;
}

export class MigrationReport {
  errors: RowError[] = [];
  counts: Record<string, { read: number; imported: number; skipped: number }> = {};

  recordError(sheet: string, rowNum: number, key: string | null, message: string) {
    this.errors.push({ sheet, rowNum, key, message });
  }

  recordCounts(sheet: string, read: number, imported: number, skipped: number) {
    this.counts[sheet] = { read, imported, skipped };
  }

  print() {
    console.log("\n=== Migration Report ===");
    for (const [sheet, c] of Object.entries(this.counts)) {
      console.log(
        `${sheet}: read=${c.read} imported=${c.imported} skipped=${c.skipped}`
      );
    }
    if (this.errors.length > 0) {
      console.log(`\n${this.errors.length} row error(s):`);
      for (const e of this.errors.slice(0, 50)) {
        console.log(`  [${e.sheet}] row ${e.rowNum} (key=${e.key}): ${e.message}`);
      }
      if (this.errors.length > 50) {
        console.log(`  ... and ${this.errors.length - 50} more`);
      }
    }
  }

  writeJson(filePath: string) {
    fs.writeFileSync(filePath, JSON.stringify({ counts: this.counts, errors: this.errors }, null, 2));
  }
}

// Trim helper — the real export has stray leading/trailing whitespace in some text
// cells (confirmed during inspection, e.g. "BR " with a trailing space).
export function s(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

export function n(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function d(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
