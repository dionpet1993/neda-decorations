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
  heroImageAlt: string;
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
    hellip: "…",
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

export interface WpImage {
  src: string;
  alt: string;
}

// Pull every <img> out of rendered block content (works for both the
// Gallery block and plain Image blocks) so we can build a custom grid
// instead of relying on WordPress's own gallery markup/styles.
function extractImages(html: string): WpImage[] {
  return [...html.matchAll(/<img[^>]*>/g)].map((m) => {
    const tag = m[0];
    const src = tag.match(/src="([^"]+)"/)?.[1] ?? "";
    const alt = decodeEntities(tag.match(/alt="([^"]*)"/)?.[1] ?? "");
    return { src, alt };
  });
}

// Remove the images (and their <figure>/<figcaption> wrappers) from
// rendered content, leaving just the descriptive text paragraphs.
function stripImages(html: string): string {
  return html
    .replace(/<img[^>]*\/?>/g, "")
    .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/g, "")
    .replace(/<\/?figure[^>]*>/g, "")
    .trim();
}

interface RawWpPost {
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string; alt_text?: string }>;
    "wp:term"?: Array<Array<{ taxonomy: string; name: string }>>;
  };
}

function mapPost(raw: RawWpPost): WpPost {
  const categories = raw._embedded?.["wp:term"]?.[0] ?? [];
  const category = categories.find((c) => c.name !== "Uncategorized")?.name ?? "Journal";
  const title = decodeEntities(raw.title.rendered);
  const media = raw._embedded?.["wp:featuredmedia"]?.[0];

  return {
    // WordPress percent-encodes slugs for non-Latin titles (e.g. Greek) —
    // decode so Astro's routing and our generated URLs stay consistent.
    slug: decodeURIComponent(raw.slug),
    title,
    excerpt: stripTags(raw.excerpt.rendered),
    content: raw.content.rendered,
    category,
    pubDate: new Date(raw.date),
    heroImage: media?.source_url ?? FALLBACK_IMAGE,
    heroImageAlt: media?.alt_text || title,
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

export interface WpProject {
  slug: string;
  title: string;
  excerpt: string;
  description: string; // rendered HTML, images stripped out
  images: WpImage[];
  coverImage: string;
  coverImageAlt: string;
  pubDate: Date;
}

interface RawWpProject {
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string; alt_text?: string }>;
  };
}

function mapProject(raw: RawWpProject): WpProject {
  const images = extractImages(raw.content.rendered);
  const media = raw._embedded?.["wp:featuredmedia"]?.[0];
  const title = decodeEntities(raw.title.rendered);
  const coverImage = media?.source_url ?? images[0]?.src ?? FALLBACK_IMAGE;

  return {
    slug: decodeURIComponent(raw.slug),
    title,
    excerpt: stripTags(raw.excerpt.rendered),
    description: stripImages(raw.content.rendered),
    images,
    coverImage,
    coverImageAlt: media?.alt_text || title,
    pubDate: new Date(raw.date),
  };
}

export async function getProjects(): Promise<WpProject[]> {
  try {
    const res = await fetch(`${WP_API}/projects?_embed&per_page=100&status=publish`);
    if (!res.ok) throw new Error(`WordPress API responded ${res.status}`);
    const raw = (await res.json()) as RawWpProject[];
    return raw.map(mapProject).sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
  } catch (err) {
    console.warn(`[wordpress] Could not fetch projects, building with none: ${err}`);
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<WpProject | null> {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}
