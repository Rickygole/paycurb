"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

type Theme = "system" | "light" | "dark";
const order: Theme[] = ["system", "light", "dark"];
const names: Record<Theme, string> = { system: "Match the system", light: "Light", dark: "Dark" };

const listeners = new Set<() => void>();

function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(KEY);
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }
  listeners.forEach((listener) => listener());
}

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;
  const label = `Theme: ${names[theme].toLowerCase()}. Switch to ${names[next].toLowerCase()}`;

  if (variant === "row") {
    return (
      <button type="button" className="menu-item" onClick={() => applyTheme(next)} aria-label={label}>
        <Icon size={16} />
        <span>Theme: {names[theme].toLowerCase()}</span>
      </button>
    );
  }

  return (
    <button type="button" className="btn btn-icon" onClick={() => applyTheme(next)} aria-label={label} title={label}>
      <Icon size={17} />
    </button>
  );
}
