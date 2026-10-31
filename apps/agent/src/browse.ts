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
  return new URL(url, baseUrl).toString();
}

export async function browse(url: string, baseUrl: string): Promise<string> {
  const response = await fetch(resolveUrl(url, baseUrl));
  if (!response.ok) return `page not found, status ${response.status}`;
  return htmlToText(await response.text());
}
