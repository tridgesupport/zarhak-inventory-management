"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);

  if (state.success) {
    return (
      <div className="mt-6 space-y-3">
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated. You can now sign in.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-md bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <input
        name="password"
        type="password"
        placeholder="New password (min. 8 characters)"
        required
        minLength={8}
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        required
        minLength={8}
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
