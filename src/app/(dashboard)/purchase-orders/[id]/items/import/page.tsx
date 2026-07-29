import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canImportItemDetails } from "@/lib/permissions";
import { ImportForm } from "./ImportForm";

export default async function ImportItemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !canImportItemDetails(session.user.role)) {
    redirect(`/purchase-orders/${id}`);
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) notFound();

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">
        Import Item Details — {po.poNumber}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Download the template, fill it offline matching the values in{" "}
        <Link href="/masters/dropdowns" className="underline">
          Dropdowns
        </Link>
        , then upload it here. Rows are validated before anything is saved.
      </p>
      <a
        href="/api/templates/item-details"
        className="mt-3 inline-block text-sm text-neutral-700 underline"
      >
        Download CSV template
      </a>

      <div className="mt-6">
        <ImportForm poId={po.id} />
      </div>
    </div>
  );
}
