import Link from "next/link";
import { adminLogout } from "@/lib/actions";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="text-sm font-medium uppercase tracking-widest text-brand">
              AI Fund
            </span>
            <span className="font-semibold">EIR Events</span>
          </Link>
          <form action={adminLogout}>
            <button
              type="submit"
              className="text-sm text-muted hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </div>
    </div>
  );
}
