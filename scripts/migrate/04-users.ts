import { prisma, readSheet, s, MigrationReport } from "./lib";

// The source "Users" table doubles as a per-current-user scratchpad (per the plan,
// its "Status"/"Choose Master stock data" columns are workflow staging fields, not a
// real role) — we only migrate identity (email, name) here. Roles are assigned
// afterward by an admin via /masters/users. Existing roles (e.g. the seeded ADMIN)
// are never overwritten by this migration.
export async function migrateUsers(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Users");
  let imported = 0;
  let skipped = 0;

  const seen = new Set<string>();

  for (const row of rows) {
    const email = s(row["Email ID"])?.toLowerCase();
    if (!email || seen.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: s(row["Name"]) ?? email,
        role: "PENDING",
      },
    });
    imported++;
  }

  report.recordCounts("Users", rows.length, imported, skipped);
}
