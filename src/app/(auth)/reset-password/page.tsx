import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Set a new password</h1>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p className="mt-2 text-sm text-red-700">
              This reset link is missing its token.
            </p>
            <p className="mt-4 text-center text-sm text-neutral-500">
              <Link href="/forgot-password" className="underline">
                Request a new reset link
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
