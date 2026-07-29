import path from "node:path";
import { prisma, MigrationReport } from "./lib";
import { migrateDropdowns } from "./01-dropdowns";
import { migrateCoatingTemperMapping } from "./02-coating-temper";
import { migrateCustomers } from "./03-customers";
import { migrateUsers } from "./04-users";
import { migratePurchaseOrders } from "./05-purchase-orders";
import { migrateItemDetails } from "./06-item-details";
import { migrateInward } from "./07-inward";
import { migrateMasterStock } from "./08-master-stock";

async function main() {
  const report = new MigrationReport();

  // Order matters — respects FKs (Master Stock last, since it references both
  // Inward and Customer).
  await migrateDropdowns(report);
  await migrateCoatingTemperMapping(report);
  await migrateCustomers(report);
  await migrateUsers(report);
  await migratePurchaseOrders(report);
  await migrateItemDetails(report);
  await migrateInward(report);
  await migrateMasterStock(report);

  report.print();
  const reportPath = path.join(__dirname, "migration-report.json");
  report.writeJson(reportPath);
  console.log(`\nFull report written to ${reportPath}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
