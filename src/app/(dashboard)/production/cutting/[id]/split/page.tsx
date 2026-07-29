import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canManageProduction } from "@/lib/permissions";
import { splitCuttingOrder } from "./actions";

export default async function SplitCuttingOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !canManageProduction(session.user.role)) {
    redirect(`/production/cutting/${id}`);
  }

  const order = await prisma.cuttingOrderSummary.findUnique({ where: { id } });
  if (!order) notFound();

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-neutral-900">Split {order.zsplId}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Available weight: {order.availableWeight.toString()} MT.
      </p>

      <form
        action={splitCuttingOrder.bind(null, order.id)}
        className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-6"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <label key={n} className="block">
            <span className="block text-xs font-medium text-neutral-500">
              Split {n} Qty
            </span>
            <input
              name={`split${n}`}
              type="number"
              step="0.001"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
          </label>
        ))}
        <button
          type="submit"
          className="col-span-2 mt-2 w-fit rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Split
        </button>
      </form>
    </div>
  );
}
