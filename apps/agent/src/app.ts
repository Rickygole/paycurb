import { Hono } from "hono";
import { renderPage } from "./pages";

export const pages = new Hono();

pages.get("/merchant/:id", (c) => {
  const html = renderPage(c.req.param("id"));
  if (!html) return c.text("not found", 404);
  return c.html(html);
});
