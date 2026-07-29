import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma, readSheet, s, MigrationReport, mapConcurrent } from "./lib";

// The source "Users" table doubles as a per-current-user scratchpad (per the plan,
// its "Status"/"Choose Master stock data" columns are workflow staging fields, not a
// real role) — we only migrate identity (email, name) here. Roles are assigned
// afterward by an admin via /masters/users. Existing roles (e.g. the seeded ADMIN)
// are never overwritten by this migration.
//
// The source app used Google identity, so migrated users never had a password.
// Give each one a random, unguessable placeholder hash — they can't log in until an
// admin resets their password (not yet built as a self-serve flow in Phase 1).
export async function migrateUsers(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("Users");
  let imported = 0;
  let skipped = 0;

  const seen = new Set<string>();

  await mapConcurrent(rows, 10, async (row) => {
    const email = s(row["Email ID"])?.toLowerCase();
    if (!email || seen.has(email)) {
      skipped++;
      return;
    }
    seen.add(email);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      imported++;
      return;
    }

    const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 12);
    await prisma.user.create({
      data: {
        email,
        name: s(row["Name"]) ?? email,
        passwordHash: placeholderHash,
        role: "PENDING",
      },
    });
    imported++;
  });

  report.recordCounts("Users", rows.length, imported, skipped);
}
