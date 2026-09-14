// Headless WordPress connector.
// Fetches published posts from the client's WordPress at build time
// (WordPress is used only as a content backend — it has no public theme).

const WP_URL = "https://cms.nedadecorations.gr";
const WP_API = `${WP_URL}/wp-json/wp/v2`;

// TODO: swap for a real fallback image once the client confirms one.
const FALLBACK_IMAGE = "/images/story-main.webp";

export interface WpPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  pubDate: Date;
  heroImage: string;
}

// Decode the handful of HTML entities WordPress commonly emits in
// title/excerpt fields (curly quotes, dashes, ellipsis, ampersands…).
function decodeEntities(html: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    "#039": "'",
    "#39": "'",
    "#8217": "’",
    "#8216": "‘",
    "#8220": "“",
    "#8221": "”",
    "#8211": "–",
    "#8212": "—",
    "#8230": "…",
    nbsp: " ",
  };

  return html
    .replace(/&(#?\w+);/g, (match, code) => named[code] ?? match)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}

interface RawWpPost {
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
    "wp:term"?: Array<Array<{ taxonomy: string; name: string }>>;
  };
}

function mapPost(raw: RawWpPost): WpPost {
  const categories = raw._embedded?.["wp:term"]?.[0] ?? [];
  const category = categories.find((c) => c.name !== "Uncategorized")?.name ?? "Journal";

  return {
    // WordPress percent-encodes slugs for non-Latin titles (e.g. Greek) —
    // decode so Astro's routing and our generated URLs stay consistent.
    slug: decodeURIComponent(raw.slug),
    title: decodeEntities(raw.title.rendered),
    excerpt: stripTags(raw.excerpt.rendered),
    content: raw.content.rendered,
    category,
    pubDate: new Date(raw.date),
    heroImage: raw._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? FALLBACK_IMAGE,
  };
}

export async function getPosts(): Promise<WpPost[]> {
  try {
    const res = await fetch(`${WP_API}/posts?_embed&per_page=100&status=publish`);
    if (!res.ok) throw new Error(`WordPress API responded ${res.status}`);
    const raw = (await res.json()) as RawWpPost[];
    return raw.map(mapPost).sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
  } catch (err) {
    console.warn(`[wordpress] Could not fetch posts, building with none: ${err}`);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<WpPost | null> {
  // WordPress stores non-Latin (e.g. Greek) slugs percent-encoded, which makes
  // querying `?slug=` unreliable (encoding/casing can mismatch). Resolving
  // against the already-fetched, already-decoded list is small and robust.
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}
