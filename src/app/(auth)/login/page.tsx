import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;
  if (session?.user) redirect(callbackUrl ?? "/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">
          Zarhak Inventory Management
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sign in with your @zarhak.com Google account.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "AccessDenied"
              ? "That account is not authorized for this app."
              : "Something went wrong signing in."}
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in with Google
          </button>
        </form>

        {devLoginEnabled && <DevLoginForm callbackUrl={callbackUrl} />}
      </div>
    </div>
  );
}

function DevLoginForm({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <form
      className="mt-4 space-y-2 border-t border-neutral-200 pt-4"
      action={async (formData: FormData) => {
        "use server";
        await signIn("dev-login", {
          email: formData.get("email"),
          name: formData.get("name"),
          redirectTo: callbackUrl ?? "/",
        });
      }}
    >
      <p className="text-xs font-medium text-amber-700">
        Dev-only login (never available in production)
      </p>
      <input
        name="email"
        type="email"
        placeholder="you@zarhak.com"
        required
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <input
        name="name"
        type="text"
        placeholder="Display name"
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="w-full rounded-md border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Sign in (dev)
      </button>
    </form>
  );
}
