"use client";

import "./ledger.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, postJson, useApi } from "@/lib/api";
import { bump, STATS_EVENT } from "@/lib/motion";
import type { Stats } from "@/lib/types";
import { ChevronDownIcon, LogOutIcon, MenuIcon, XIcon } from "./icons";
import { LogoGlyph } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { href: "/feed", label: "Feed" },
  { href: "/approvals", label: "Approvals" },
  { href: "/policy", label: "Policy" },
  { href: "/audit", label: "Audit" },
  { href: "/attacks", label: "Attacks" },
];

function PendingPill({ count }: { count: number | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  useEffect(() => {
    if (previous.current !== null && count !== null && count !== previous.current) bump(ref.current);
    previous.current = count;
  }, [count]);

  if (!count) return null;
  return (
    <span ref={ref} className="count-pill num" aria-label={`${count} waiting for you`}>
      {count}
    </span>
  );
}

function usePending(enabled: boolean) {
  const stats = useApi<Stats>(enabled ? "/api/stats" : null, enabled ? 5000 : undefined);
  const reload = stats.reload;
  useEffect(() => {
    const listener = () => reload();
    window.addEventListener(STATS_EVENT, listener);
    return () => window.removeEventListener(STATS_EVENT, listener);
  }, [reload]);
  return enabled ? (stats.data?.pending_approvals ?? null) : null;
}

export function Brand() {
  return (
    <Link href="/feed" className="brand" aria-label="Paycurb, live feed">
      <span className="mark">
        <LogoGlyph size={20} />
      </span>
      Paycurb
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const pending = usePending(checked);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ ok: boolean }>("/api/session")
      .then((session) => {
        if (session.ok) setChecked(true);
        else router.replace("/login");
      })
      .catch(() => setChecked(true));
  }, [router]);

  useEffect(() => {
    sheet.current?.hidePopover?.();
  }, [pathname]);

  async function signOut() {
    await postJson("/api/logout").catch(() => null);
    router.replace("/login");
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="ledger">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="col topbar-inner">
          <Brand />
          <nav aria-label="Main" className="nav wide-only">
            {nav.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className="nav-link">
                {label}
                {href === "/approvals" && <PendingPill count={pending} />}
              </Link>
            ))}
          </nav>
          <div className="bar-end">
            <Link href="/agent" className="btn btn-primary btn-sm wide-only" aria-current={isActive("/agent") ? "page" : undefined}>
              Run the agent
            </Link>
            <span className="wide-only">
              <ThemeToggle />
            </span>
            <button type="button" className="btn btn-quiet btn-sm wide-only" popoverTarget="account-menu" aria-haspopup="menu">
              Owner
              <ChevronDownIcon size={15} />
            </button>
            <Link href="/approvals" className="phone-only" aria-label={pending ? `${pending} orders waiting for you` : "Approvals"}>
              <PendingPill count={pending} />
            </Link>
            <button type="button" className="btn btn-outline btn-sm phone-only" popoverTarget="nav-sheet" aria-haspopup="dialog">
              <MenuIcon size={16} />
              Menu
            </button>
          </div>
        </div>
      </header>

      <div id="account-menu" popover="auto" role="menu" aria-label="Account" className="menu">
        <p className="menu-label">Signed in as the owner</p>
        <ThemeToggle variant="row" />
        <div className="menu-rule" />
        <button type="button" role="menuitem" className="menu-item" onClick={signOut}>
          <LogOutIcon size={16} />
          Sign out
        </button>
      </div>

      <div id="nav-sheet" ref={sheet} popover="auto" role="dialog" aria-label="Menu" className="sheet">
        <div className="sheet-head">
          <Brand />
          <button type="button" className="btn btn-icon" popoverTarget="nav-sheet" popoverTargetAction="hide" aria-label="Close menu">
            <XIcon size={18} />
          </button>
        </div>
        <nav aria-label="Main">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className="sheet-link">
              <span>{label}</span>
              {href === "/approvals" && <PendingPill count={pending} />}
            </Link>
          ))}
        </nav>
        <div className="sheet-actions">
          <Link href="/agent" className="btn btn-primary">
            Run the agent
          </Link>
          <ThemeToggle variant="row" />
          <button type="button" className="menu-item" onClick={signOut}>
            <LogOutIcon size={16} />
            Sign out
          </button>
        </div>
      </div>

      <main id="main" className="col page">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions, id }: { title: string; description?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <header className="title-row">
      <div style={{ minWidth: 0 }}>
        <h1 id={id} className="title">
          {title}
        </h1>
        {description && <p className="lede">{description}</p>}
      </div>
      {actions && <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>{actions}</div>}
    </header>
  );
}
