import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/purchase-orders", label: "Purchase Orders" },
  { href: "/inward", label: "Inward" },
  { href: "/master-stock", label: "Master Stock" },
  { href: "/masters/customers", label: "Customers" },
  { href: "/masters/dropdowns", label: "Dropdowns" },
  { href: "/masters/coating-temper", label: "Coating/Temper Map" },
  { href: "/masters/users", label: "Users" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "PENDING") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-amber-900">
            Account pending approval
          </h1>
          <p className="mt-2 text-sm text-amber-800">
            Signed in as {session.user.email}. An admin needs to assign you a role
            before you can use the app.
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="mt-4 rounded-md border border-amber-300 px-4 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-900 text-neutral-100">
        <div className="px-4 py-5">
          <p className="text-sm font-semibold tracking-wide">ZARHAK</p>
          <p className="text-xs text-neutral-400">Inventory Management</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-4 py-4">
          <p className="truncate text-xs text-neutral-400">{session.user.email}</p>
          <p className="text-xs text-neutral-500">{session.user.role}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="mt-2 text-xs text-neutral-400 underline hover:text-neutral-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-neutral-50 p-8">{children}</main>
    </div>
  );
}
