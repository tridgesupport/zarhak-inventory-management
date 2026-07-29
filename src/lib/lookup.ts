import { prisma } from "@/lib/db";
import type { LookupDomain } from "@/generated/prisma/enums";

export async function getLookupOptions(domain: LookupDomain): Promise<string[]> {
  const rows = await prisma.lookupValue.findMany({
    where: { domain, isActive: true },
    orderBy: { value: "asc" },
  });
  return rows.map((r) => r.value);
}
