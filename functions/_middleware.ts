const RESERVED = new Set([
  "",
  "home",
  "services",
  "premium",
  "inventory-manager",
  "key-manager",
  "token-manager",
  "shop",
  "notifications",
  "groups",
  "me",
  "profile",
  "privacy-policy",
  "terms-of-service",
  "auth",
  "link",
  "reset_password",
  "gift",
  "assets",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

const FETCH_TIMEOUT_MS = 3000;

interface Meta {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  card: string;
  type: string;
}

function proxyImage(url: string, wide: boolean): string {
  const clean = url.replace(/\/*$/, "");
  const size = wide ? "w=1200&h=630&fit=cover" : "w=600&h=600&fit=cover";
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&${size}&output=png`;
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function usernameFromPath(parts: string[]): string | null {
  if (parts.length === 1) {
    let seg = decodeURIComponent(parts[0]);
    if (seg.startsWith("@")) seg = seg.slice(1);
    if (!seg || RESERVED.has(seg.toLowerCase())) return null;
    return seg;
  }
  if (parts.length === 2 && parts[0].toLowerCase() === "profile") {
    const seg = decodeURIComponent(parts[1]);
    return seg || null;
  }
  return null;
}

async function profileMeta(username: string): Promise<Meta | null> {
  const profile = await fetchJson(
    `https://api.accounts.bilup.org/profile?name=${encodeURIComponent(username)}&include_posts=0`,
  );
  if (!profile || profile.error || !profile.username || profile["sys.banned"]) {
    return null;
  }

  const name = String(profile.username);
  const isPrivate = profile.private === true;
  const bio = isPrivate ? "" : String(profile.bio || "").trim();

  const statBits: string[] = [];
  if (typeof profile.followers === "number") {
    statBits.push(
      `${profile.followers} follower${profile.followers === 1 ? "" : "s"}`,
    );
  }
  if (typeof profile.following === "number") {
    statBits.push(`${profile.following} following`);
  }

  const banner =
    !isPrivate && profile.banner ? proxyImage(String(profile.banner), true) : null;
  const avatarSource = profile.pfp
    ? String(profile.pfp)
    : `https://avatars.accounts.bilup.org/${name.toLowerCase()}`;

  return {
    title: `@${name} on Bilup`,
    description:
      [bio, statBits.join(" · ")].filter(Boolean).join(" · ") ||
      `@${name}'s Bilup account.`,
    image: banner || proxyImage(avatarSource, false),
    imageAlt: `${name}'s avatar`,
    card: banner ? "summary_large_image" : "summary",
    type: "profile",
  };
}

async function groupMeta(tag: string): Promise<Meta | null> {
  const group = await fetchJson(
    `https://api.accounts.bilup.org/groups/${encodeURIComponent(tag)}`,
  );
  if (!group || group.error || !group.name) return null;

  const name = String(group.name);
  const desc = String(group.description || "").trim();
  const members =
    typeof group.member_count === "number"
      ? `${group.member_count} member${group.member_count === 1 ? "" : "s"}`
      : "";

  const banner = group.banner_url ? proxyImage(String(group.banner_url), true) : null;
  const icon = group.icon_url ? proxyImage(String(group.icon_url), false) : null;

  return {
    title: `${name} on Bilup`,
    description:
      [desc, members].filter(Boolean).join(" · ") || `Join ${name} on Bilup.`,
    image: banner || icon || proxyImage("https://accounts.bilup.org/logo.png", false),
    imageAlt: `${name} group`,
    card: banner ? "summary_large_image" : "summary",
    type: "website",
  };
}

async function giftMeta(code: string): Promise<Meta | null> {
  const data = await fetchJson(
    `https://api.accounts.bilup.org/gifts/${encodeURIComponent(code)}`,
  );
  const gift = data?.gift;
  if (!gift || !gift.code) return null;

  const amount = Number(gift.amount || 0).toFixed(2);
  const from = gift.creator_id ? `@${gift.creator_id}` : "Someone";
  const note = String(gift.note || "").trim();

  return {
    title: `${from} sent you ${amount} credits on Bilup`,
    description: note || "Open this link to claim your gift on Bilup.",
    image: proxyImage("https://accounts.bilup.org/logo.png", false),
    imageAlt: "Bilup gift",
    card: "summary",
    type: "website",
  };
}

class AttrSetter {
  name: string;
  value: string;
  constructor(name: string, value: string) {
    this.name = name;
    this.value = value;
  }
  element(el: any) {
    el.setAttribute(this.name, this.value);
  }
}

class TextReplacer {
  value: string;
  first = true;
  constructor(value: string) {
    this.value = value;
  }
  text(chunk: any) {
    chunk.replace(this.first ? this.value : "");
    this.first = false;
  }
}

async function metaForPath(pathname: string): Promise<Meta | null> {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0].toLowerCase() === "groups") {
    return groupMeta(decodeURIComponent(parts[1]));
  }
  if (parts.length === 2 && parts[0].toLowerCase() === "gift") {
    return giftMeta(decodeURIComponent(parts[1]));
  }
  const username = usernameFromPath(parts);
  if (username) return profileMeta(username);
  return null;
}

export const onRequest = async (context: any) => {
  const { request, next } = context;
  const url = new URL(request.url);

  if (request.method !== "GET") return next();

  const parts = url.pathname.split("/").filter(Boolean);
  const isCandidate =
    (parts.length === 2 &&
      ["groups", "gift", "profile"].includes(parts[0].toLowerCase())) ||
    parts.length === 1;
  if (!isCandidate) return next();

  const response = await next();
  if (!(response.headers.get("content-type") || "").includes("text/html")) {
    return response;
  }

  const meta = await metaForPath(url.pathname);
  if (!meta) return response;

  const rewriter = new HTMLRewriter()
    .on("title", new TextReplacer(meta.title))
    .on('meta[name="description"]', new AttrSetter("content", meta.description))
    .on('meta[property="og:title"]', new AttrSetter("content", meta.title))
    .on('meta[property="og:description"]', new AttrSetter("content", meta.description))
    .on('meta[property="og:url"]', new AttrSetter("content", url.href))
    .on('meta[property="og:type"]', new AttrSetter("content", meta.type))
    .on('meta[property="og:image"]', new AttrSetter("content", meta.image))
    .on('meta[property="og:image:alt"]', new AttrSetter("content", meta.imageAlt))
    .on('meta[name="twitter:card"]', new AttrSetter("content", meta.card))
    .on('meta[name="twitter:title"]', new AttrSetter("content", meta.title))
    .on('meta[name="twitter:description"]', new AttrSetter("content", meta.description))
    .on('meta[name="twitter:image"]', new AttrSetter("content", meta.image));

  return rewriter.transform(response);
};
