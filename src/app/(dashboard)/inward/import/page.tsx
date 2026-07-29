import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canImportInward } from "@/lib/permissions";
import { ImportForm } from "./ImportForm";

export default async function ImportInwardPage() {
  const session = await auth();
  if (!session?.user || !canImportInward(session.user.role)) {
    redirect("/inward");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Import Inward CSV</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Each row is matched against its Purchase Order&apos;s Item Details
        automatically. Unmatched rows can still be imported and resolved manually
        afterward.
      </p>
      <a
        href="/api/templates/inward"
        className="mt-3 inline-block text-sm text-neutral-700 underline"
      >
        Download CSV template
      </a>

      <div className="mt-6">
        <ImportForm />
      </div>
    </div>
  );
}
