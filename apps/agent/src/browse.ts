const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " [image: $1] ")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, " $2 ($1) ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39);/g, (match) => entities[match])
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveUrl(url: string, baseUrl: string): string {
  const resolved = new URL(url, baseUrl);
  if (resolved.origin !== new URL(baseUrl).origin) throw new Error("browse is limited to the merchant pages of this agent");
  return resolved.toString();
}

export async function browse(url: string, baseUrl: string): Promise<string> {
  const response = await fetch(resolveUrl(url, baseUrl), { redirect: "manual" });
  if (response.status >= 300 && response.status < 400) throw new Error("browse does not follow redirects");
  if (!response.ok) return `page not found, status ${response.status}`;
  return htmlToText(await response.text());
}
