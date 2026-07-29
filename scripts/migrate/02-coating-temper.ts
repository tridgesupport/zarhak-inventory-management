import { prisma, readSheet, s, n, MigrationReport } from "./lib";

// The "CoatingTemperMapping" sheet actually holds two unrelated column-pairs stacked
// side by side (Coating/Web Coating in columns A-B, Temper/Web Temper in columns C-D)
// — confirmed by inspection: rows run out of Coating values well before Temper values
// do. Treat them as two independent lookups, matching the schema and the source
// app's own LOOKUP() formulas (each keyed off "Dropdown and Master List", not a joint
// composite key).
export async function migrateCoatingTemperMapping(report: MigrationReport) {
  const rows = readSheet<Record<string, unknown>>("CoatingTemperMapping");

  let coatingImported = 0;
  let coatingSkipped = 0;
  let temperImported = 0;
  let temperSkipped = 0;
  const seenCoatings = new Set<string>();
  const seenTempers = new Set<string>();

  for (const row of rows) {
    const coating = s(row["Coating"]);
    const webCoating = s(row["Web Coating"]);
    if (coating && webCoating) {
      if (!seenCoatings.has(coating)) {
        seenCoatings.add(coating);
        await prisma.coatingMapping.upsert({
          where: { coating },
          update: { webCoating },
          create: { coating, webCoating },
        });
        coatingImported++;
      }
    } else if (coating || webCoating) {
      coatingSkipped++;
    }

    const temper = s(row["Temper"]);
    const webTemper = n(row["Web Temper"]);
    if (temper && webTemper !== null) {
      if (!seenTempers.has(temper)) {
        seenTempers.add(temper);
        await prisma.temperMapping.upsert({
          where: { temper },
          update: { webTemper },
          create: { temper, webTemper },
        });
        temperImported++;
      }
    } else if (temper || webTemper !== null) {
      temperSkipped++;
    }
  }

  report.recordCounts("CoatingMapping", rows.length, coatingImported, coatingSkipped);
  report.recordCounts("TemperMapping", rows.length, temperImported, temperSkipped);
}
