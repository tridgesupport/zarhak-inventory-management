import { prisma, readSheet, s, MigrationReport } from "./lib";

export async function migrateCustomers(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("customer_master_data");
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const legalName = s(row["Consignee/Buyer"]);
    if (!legalName) {
      skipped++; // blank template rows — the sheet has 1000 rows, most unused
      continue;
    }

    await prisma.customer.upsert({
      where: { id: legalName }, // natural key: legal name is the source app's KEY column
      update: {
        alpha: s(row["Alpha"]),
        address: s(row["Address"]),
        gstin: s(row["GSTIN/UIN"]),
        zsplCode: s(row["ZSPL Costomer Code"]),
        location: s(row["Location"]),
        stateName: s(row["State Name"]),
      },
      create: {
        id: legalName,
        legalName,
        displayName: legalName, // user asked for a distinct display name later; defaults to legal name on migration
        alpha: s(row["Alpha"]),
        address: s(row["Address"]),
        gstin: s(row["GSTIN/UIN"]),
        zsplCode: s(row["ZSPL Costomer Code"]),
        location: s(row["Location"]),
        stateName: s(row["State Name"]),
      },
    });
    imported++;
  }

  report.recordCounts("customer_master_data", rows.length, imported, skipped);
}
