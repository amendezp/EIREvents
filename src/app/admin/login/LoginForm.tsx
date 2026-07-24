"use client";

import { useActionState } from "react";
import { adminLogin, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    adminLogin,
    initialState,
  );

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <form
        action={formAction}
        className="w-full max-w-xs rounded-3xl border border-line bg-white p-6 shadow-soft"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-brand">
          AI Fund
        </p>
        <h1 className="mt-1 font-serif text-xl font-semibold">EIR Events Admin</h1>
        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        {state.error && (
          <p className="mt-2 text-sm font-medium text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
