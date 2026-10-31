"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, postJson, useApi } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { ActivityIcon, BotIcon, FileTextIcon, InboxIcon, ListIcon, LogOutIcon, ShieldIcon, TargetIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { Skeleton } from "./states";

const nav = [
  { href: "/feed", label: "Live Feed", Icon: ActivityIcon },
  { href: "/approvals", label: "Approvals", Icon: InboxIcon },
  { href: "/policy", label: "Policy", Icon: FileTextIcon },
  { href: "/audit", label: "Audit Log", Icon: ListIcon },
  { href: "/attacks", label: "Attack Results", Icon: TargetIcon },
  { href: "/agent", label: "Demo Agent", Icon: BotIcon },
];

function PendingCount() {
  const { data } = useApi<Stats>("/api/stats", 5000);
  if (!data || data.pending_approvals === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-escalate-soft px-1.5 py-px text-xs font-semibold text-escalate num" aria-label={`${data.pending_approvals} pending`}>
      {data.pending_approvals}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    api<{ ok: boolean }>("/api/session")
      .then((session) => {
        if (session.ok) setChecked(true);
        else router.replace("/login");
      })
      .catch(() => setChecked(true));
  }, [router]);

  async function signOut() {
    await postJson("/api/logout").catch(() => null);
    router.replace("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop">
        Skip to content
      </a>
      <aside className="flex shrink-0 flex-col border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:border-r max-md:border-b">
        <div className="flex items-center gap-2.5 px-5 py-4 md:py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-contrast">
            <ShieldIcon size={18} strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight">Paycurb</p>
            <p className="text-xs text-muted">Payment firewall</p>
          </div>
        </div>
        <nav aria-label="Main" className="px-3 max-md:overflow-x-auto max-md:pb-2">
          <ul className="flex gap-0.5 md:flex-col">
            {nav.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                      active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                    {href === "/approvals" && checked && <PendingCount />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto flex gap-0.5 border-t border-line px-3 py-2 md:flex-col md:py-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted md:w-full hover:bg-surface-2 hover:text-fg"
          >
            <LogOutIcon size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1">
        {checked ? (
          children
        ) : (
          <div className="mx-auto max-w-6xl space-y-4 p-6" role="status">
            <span className="sr-only">Checking your session</span>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full px-5 py-6 md:px-8 md:py-8 ${wide ? "max-w-[1600px]" : "max-w-6xl"}`}>{children}</div>;
}
