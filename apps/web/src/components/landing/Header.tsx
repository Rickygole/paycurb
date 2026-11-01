"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "../Logo";
import { nav } from "./copy";

export function Header({ heroActions = false }: { heroActions?: boolean }) {
  const [hideDemo, setHideDemo] = useState(heroActions);

  useEffect(() => {
    const target = document.getElementById("hero-actions");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHideDemo(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="bar">
      <Link className="bar-home" href="/" aria-label="Paycurb home">
        <Logo />
      </Link>
      <nav aria-label="Site" className="bar-links">
        {nav.links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <Link className="bar-signin" href="/login">
        {nav.signIn}
      </Link>
      <Link className="btn btn-solid btn-bar" href="/login" data-hidden={hideDemo} aria-hidden={hideDemo || undefined} tabIndex={hideDemo ? -1 : undefined}>
        {nav.start}
      </Link>
    </header>
  );
}
