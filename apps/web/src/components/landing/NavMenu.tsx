"use client";

import { useRef } from "react";
import { MenuIcon, XIcon } from "../icons";
import { Logo } from "../Logo";
import "./menu.css";

export function NavMenu({ links, className }: { links: { href: string; label: string }[]; className: string }) {
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();

  function dismiss(event: React.MouseEvent<HTMLDialogElement>) {
    const target = event.target as Element;
    if (target === event.currentTarget || target.closest("a")) close();
  }

  function trap(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const items = event.currentTarget.querySelectorAll<HTMLElement>("button, a");
    const first = items[0];
    const last = items[items.length - 1];
    if (document.activeElement === (event.shiftKey ? first : last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  return (
    <>
      <button type="button" className={`nav-menu ${className}`} aria-haspopup="dialog" aria-label="Menu" onClick={() => sheet.current?.showModal()}>
        <MenuIcon size={20} />
      </button>
      <dialog ref={sheet} className="nav-sheet" aria-label="Menu" onClick={dismiss} onKeyDown={trap}>
        <div className="nav-sheet-body">
          <div className="nav-sheet-head">
            <Logo size={24} />
            <button type="button" className="nav-menu" aria-label="Close menu" onClick={close}>
              <XIcon size={20} />
            </button>
          </div>
          <nav aria-label="Site">
            {links.map((link) => (
              <a key={link.href} className="nav-sheet-link" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
