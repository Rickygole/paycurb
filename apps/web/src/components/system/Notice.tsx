import "../ledger.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoGlyph } from "../Logo";

export function SystemNotice({ code, title, children, actions }: { code: string; title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="ledger system">
      <header className="col system-top">
        <Link href="/feed" className="brand" aria-label="Paycurb, live feed">
          <span className="mark">
            <LogoGlyph size={20} />
          </span>
          Paycurb
        </Link>
      </header>
      <main id="main" className="col system-main">
        <p className="system-code num">{code}</p>
        <h1 className="title">{title}</h1>
        <div className="lede">{children}</div>
        <div className="system-actions">{actions}</div>
      </main>
    </div>
  );
}
