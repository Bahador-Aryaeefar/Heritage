/**
 * Maps API media URLs to same-origin static paths bundled under public/media/{slug}/.
 * Falls back to /uploads proxy paths when static files are unavailable.
 */
const STATIC_MEDIA: Record<string, Record<string, string>> = {
  'taq-e-bostan': {
    cover: '/media/taq-e-bostan/cover.webp',
    'tree-of-life': '/media/taq-e-bostan/tree-of-life.webp',
    'large-ivan': '/media/taq-e-bostan/large-ivan.webp',
  },
};

function extractImageKey(url: string): string | null {
  const match = url.match(/\/images\/([^/?#]+)\.webp/i);
  return match?.[1] ?? null;
}

export function resolveMediaUrl(apiUrl: string | null, siteSlug?: string): string | null {
  if (!apiUrl) return null;

  const key = extractImageKey(apiUrl);
  if (siteSlug && key && STATIC_MEDIA[siteSlug]?.[key]) {
    return STATIC_MEDIA[siteSlug][key];
  }

  try {
    const parsed = new URL(apiUrl);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    if (apiUrl.startsWith('/uploads/')) {
      return apiUrl;
    }
  }

  return apiUrl;
}

export function resolveCoverUrl(coverUrl: string | null, siteSlug: string): string | null {
  return resolveMediaUrl(coverUrl, siteSlug);
}
