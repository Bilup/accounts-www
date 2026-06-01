const BUST_MIN = 10000000;
const BUST_MAX = 99999999;

const avatarBustCache: Record<string, number> = {};
const overlayBustCache: Record<string, number> = {};

function randomBust(): number {
  return Math.floor(Math.random() * (BUST_MAX - BUST_MIN + 1)) + BUST_MIN;
}

export function reloadAvatar(username: string): void {
  avatarBustCache[username] = randomBust();
}

export function reloadOverlay(username: string): void {
  overlayBustCache[username] = randomBust();
}

export function avatarUrl(username: string): string {
  const bust = avatarBustCache[username];
  return `https://avatars.rotur.dev/${username}${bust ? `?v=${bust}` : ""}`;
}

export function overlayUrl(username: string): string {
  const bust = overlayBustCache[username];
  return `https://avatars.rotur.dev/.overlay/${username}${bust ? `?v=${bust}` : ""}`;
}

export function bannerUrl(username: string): string {
  return `https://avatars.rotur.dev/.banners/${username}`;
}

export function isCrackedAccount(username: string): boolean {
  return username.startsWith("USR:");
}

export function pfpUrl(pfp: string | undefined, username: string): string {
  if (!pfp) return avatarUrl(username);
  if (/^https?:\/\//i.test(pfp)) {
    const bust = avatarBustCache[username];
    return bust ? `${pfp}${pfp.includes("?") ? "&" : "?"}v=${bust}` : pfp;
  }
  const stripped = pfp.replace(/^\/+/, "");
  const full = `https://avatars.rotur.dev/${stripped}`;
  const bust = avatarBustCache[username];
  return bust ? `${full}?v=${bust}` : full;
}
