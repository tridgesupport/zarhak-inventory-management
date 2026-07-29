import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { LookupDomain } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return connectionString.includes("neon.tech")
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
}

const prisma = new PrismaClient({ adapter: createAdapter() });

// Starter values only — the real, complete lookup lists come from migrating the
// "Dropdown and Master List" tab in scripts/migrate (see M7). This just seeds enough
// to exercise the Phase 1 screens end-to-end during development.
const LOOKUP_SEED: Record<LookupDomain, string[]> = {
  PO_TYPE: ["P", "C"],
  PO_GRADE: ["A", "B", "C"],
  TYPE_OF_STEEL: ["NA", "Prime", "Secondary"],
  ITEM_TYPE: ["ETP", "TFS", "TMBP", "A", "OTHER"],
  ITEM_NAME: ["tinplate", "Tin Free Steel", "Tin Metal Black Plate", "Aluminium"],
  VENDOR_NAME: ["JSW SCPPL", "JSW"],
  MILL: ["JSW-T"],
  WEB_COATING: ["E25"],
  COATING: ["2.8/2.8"],
  WEB_TEMPER: ["2.5"],
  TEMPER: ["T53", "T55", "T57"],
  GRADE: ["A"],
  FINISH: ["BR"],
  ANNEALED_TYPE: ["CA", "BA"],
  COIL_ID: [],
  PRODUCT_CATEGORY: ["Tinplate"],
  PURCHASE_TYPE: ["Import", "Domestic"],
  DELIVERY_LOCATION: ["Taloja"],
  STATE_NAME: ["Maharashtra"],
  UNLOADED_BY: ["Azeem"],
  REVIEWED_BY: ["Aliasger"],
  BAY_LOCATION: ["Bay 1", "Bay 2", "Bay 3"],
  SALES_TYPE: ["Cutting", "Slitting", "Trading"],
  FACTORY_LOCATION: ["Taloja"],
  END_USE: [],
  OPERATOR: [],
  ASSISTANT_OPERATOR: [],
  ORIGIN: ["JSW-T"],
  COIL_FEEDING_OPERATOR: [],
  ORDER_CATEGORY: ["C"],
  SHIP_TO: ["ZARHAK STEELS PVT LTD"],
};

async function main() {
  const adminEmail = "tridgebusiness@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash },
    create: {
      email: adminEmail,
      name: "Hardik (Admin)",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(
    `Seeded admin ${adminEmail} — password: ${adminPassword} (change it after first login; set SEED_ADMIN_PASSWORD to override)`
  );

  for (const [domain, values] of Object.entries(LOOKUP_SEED) as [
    LookupDomain,
    string[],
  ][]) {
    for (const value of values) {
      await prisma.lookupValue.upsert({
        where: { domain_value: { domain, value } },
        update: {},
        create: { domain, value, createdBy: "seed" },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
