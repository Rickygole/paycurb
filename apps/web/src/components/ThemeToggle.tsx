"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "@/lib/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

type Theme = "system" | "light" | "dark";
const order: Theme[] = ["system", "light", "dark"];
const names: Record<Theme, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

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

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted md:w-full hover:bg-surface-2 hover:text-fg"
      aria-label={`${names[theme]}. Switch to ${names[next].toLowerCase()}`}
    >
      <Icon size={16} />
      <span>{names[theme]}</span>
    </button>
  );
}
