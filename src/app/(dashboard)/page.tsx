import Link from "next/link";
import { auth } from "@/lib/auth";

const TILES = [
  {
    href: "/purchase-orders",
    title: "Purchase Orders",
    description: "Create and track POs and item details",
  },
  {
    href: "/inward",
    title: "Inward",
    description: "Receive goods against POs and review matches",
  },
  {
    href: "/master-stock",
    title: "Master Stock",
    description: "Allocate, split, offer, book and sell inventory",
  },
  {
    href: "/masters/customers",
    title: "Customers",
    description: "Customer master data",
  },
  {
    href: "/masters/dropdowns",
    title: "Dropdowns",
    description: "Shared lookup values used across the app",
  },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Zarhak Steels Private Limited — Phase 1: Procurement &amp; Inventory
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
          >
            <h2 className="font-medium text-neutral-900">{tile.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{tile.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
