"use client";

import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-3">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <input
        name="name"
        type="text"
        placeholder="Full name"
        required
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="you@example.com"
        required
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <input
        name="password"
        type="password"
        placeholder="Password (min. 8 characters)"
        required
        minLength={8}
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
