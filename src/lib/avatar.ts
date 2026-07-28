const AVATARS_BASE = "https://avatars.accounts.bilup.org";

export function avatarUrl(username: string): string {
  return `${AVATARS_BASE}/${username}`;
}

export function overlayUrl(username: string): string {
  return `${AVATARS_BASE}/.overlay/${username}`;
}

export function bannerUrl(username: string): string {
  return `${AVATARS_BASE}/.banners/${username}`;
}

export function isCrackedAccount(username: string): boolean {
  return username.startsWith("USR:");
}
