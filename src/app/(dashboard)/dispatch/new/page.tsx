import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canDispatch } from "@/lib/permissions";
import { DispatchWizard } from "./DispatchWizard";

export default async function NewDispatchPage() {
  const session = await auth();
  if (!session?.user || !canDispatch(session.user.role)) notFound();

  const [customers, transporters] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
    prisma.transporter.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">New Dispatch</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Pick items from Cutting, Slitting, or Trading Finished Goods, then fill in shared
        dispatch details once. A DO number is assigned automatically.
      </p>
      <div className="mt-6">
        <DispatchWizard customers={customers} transporters={transporters} />
      </div>
    </div>
  );
}
