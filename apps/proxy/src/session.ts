import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { config } from "./config";

const COOKIE = "paycurb_session";
const LIFETIME_SECONDS = 60 * 60 * 12;

const sign = (value: string) => createHmac("sha256", config.sessionSecret()).update(value).digest("hex");

export function passwordMatches(candidate: string): boolean {
  const expected = Buffer.from(config.ownerPassword());
  const given = Buffer.from(candidate);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function startSession(c: Context) {
  const expires = Math.floor(Date.now() / 1000) + LIFETIME_SECONDS;
  setCookie(c, COOKIE, `${expires}.${sign(String(expires))}`, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: LIFETIME_SECONDS });
}

export function endSession(c: Context) {
  deleteCookie(c, COOKIE, { path: "/" });
}

export function hasSession(c: Context): boolean {
  const cookie = getCookie(c, COOKIE);
  if (!cookie) return false;
  const [expires, signature] = cookie.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const requireSession: MiddlewareHandler = async (c, next) => {
  if (!hasSession(c)) return c.json({ error: "login required" }, 401);
  await next();
};
