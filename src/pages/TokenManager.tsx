import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import {
  Key,
  PlusCircle,
  Copy,
  Trash2,
  RotateCcw,
  X,
  Shield,
  Clock,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-preact";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useAuth, getToken } from "../lib/auth";
import s from "./TokenManager.module.css";

const API_BASE_URL = "https://api.rotur.dev";

interface SubToken {
  id: string;
  name: string;
  permissions: string[];
  created_at: number;
  last_used_at?: number | null;
  expires_at?: number | null;
  revoked: boolean;
  revoked_at?: number | null;
  origin?: string;
  description?: string;
  websites?: string[];
}

interface PermissionGroup {
  name: string;
  description: string;
  permissions: string[];
}

interface PermissionSchema {
  permissions: string[];
  groups: PermissionGroup[];
}

const FORBIDDEN_PERMISSIONS = new Set(["tokens:manage", "account:delete"]);

const OTHER_ROOTS = [
  "validators:generate",
  "blocked:view",
  "blocked:manage",
  "tokens:manage",
];

function matchesOther(p: string): boolean {
  if (!p.includes(":")) return true;
  return OTHER_ROOTS.some((root) => p === root || p.startsWith(root + ":"));
}

const PERM_CATEGORIES: { label: string; match: (p: string) => boolean }[] = [
  { label: "Account", match: (p) => p.startsWith("account:") },
  { label: "Credits", match: (p) => p.startsWith("credits:") },
  { label: "Friends", match: (p) => p.startsWith("friends:") },
  { label: "Posts", match: (p) => p.startsWith("posts:") },
  { label: "Following", match: (p) => p.startsWith("following:") },
  { label: "Files", match: (p) => p.startsWith("files:") },
  { label: "Keys", match: (p) => p.startsWith("keys:") },
  { label: "Groups", match: (p) => p.startsWith("groups:") },
  { label: "Notifications", match: (p) => p.startsWith("notifications:") },
  { label: "Gifts", match: (p) => p.startsWith("gifts:") },
  { label: "Items", match: (p) => p.startsWith("items:") },
  { label: "Other", match: matchesOther },
];

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function categorizePermissions(perms: string[]) {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const cat = PERM_CATEGORIES.find((c) => c.match(p))?.label || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
}

function togglePerm(set: Set<string>, perm: string): Set<string> {
  if (FORBIDDEN_PERMISSIONS.has(perm)) return set;
  const next = new Set(set);
  if (next.has(perm)) next.delete(perm);
  else next.add(perm);
  return next;
}

function applyGroup(set: Set<string>, perms: string[]): Set<string> {
  const next = new Set(set);
  for (const p of perms) if (!FORBIDDEN_PERMISSIONS.has(p)) next.add(p);
  return next;
}

function clearGroup(set: Set<string>, perms: string[]): Set<string> {
  const next = new Set(set);
  for (const p of perms) next.delete(p);
  return next;
}

function formatDate(ts?: number | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOf(token: SubToken): { label: string; cls: string } {
  if (token.revoked) return { label: "Revoked", cls: "tagRevoked" };
  if (token.expires_at && token.expires_at < Date.now())
    return { label: "Expired", cls: "tagExpired" };
  return { label: "Active", cls: "tagActive" };
}

type TabName = "your-tokens" | "create-token";

const TABS: { id: TabName; label: string; icon: typeof Key }[] = [
  { id: "your-tokens", label: "Your Tokens", icon: Key },
  { id: "create-token", label: "Create Token", icon: PlusCircle },
];

export function TokenManager() {
  const { user } = useAuth();
  const currentUser = user?.username || "";

  const [tokens, setTokens] = useState<SubToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [schema, setSchema] = useState<PermissionSchema | null>(null);
  const [selectedToken, setSelectedToken] = useState<SubToken | null>(null);
  const [tokenMessages, setTokenMessages] = useState<
    Record<string, { text: string; type: "success" | "error" }>
  >({});

  const [activeTab, setActiveTab] = useState<TabName>("your-tokens");

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOrigin, setCreateOrigin] = useState("");
  const [createWebsites, setCreateWebsites] = useState("");
  const [createExpiresHrs, setCreateExpiresHrs] = useState("");
  const [createPerms, setCreatePerms] = useState<Set<string>>(new Set());
  const [createPermSearch, setCreatePermSearch] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createMessageType, setCreateMessageType] = useState<
    "success" | "error"
  >("success");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<{
    id: string;
    token: string;
    name: string;
  } | null>(null);

  // Edit state per token
  const [editingPerms, setEditingPerms] = useState<
    Record<string, Set<string> | null>
  >({});
  const [editSearch, setEditSearch] = useState<Record<string, string>>({});

  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const descInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Init ──

  useEffect(() => {
    if (currentUser) {
      fetchUserTokens();
      fetchSchema();
    }
  }, [currentUser]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedToken) setSelectedToken(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedToken]);

  // ── Auth ──

  function setTokenMsg(
    tokenId: string,
    text: string,
    type: "success" | "error",
  ) {
    setTokenMessages((prev) => ({ ...prev, [tokenId]: { text, type } }));
    setTimeout(() => {
      setTokenMessages((prev) => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
    }, 4000);
  }

  // ── Data loading ──

  async function fetchSchema() {
    try {
      const res = await fetch(`${API_BASE_URL}/tokens/permissions`);
      if (res.ok) {
        const data = await res.json();
        setSchema({
          permissions: data.permissions || [],
          groups: data.groups || [],
        });
      }
    } catch {
      /* ignore */
    }
  }

  async function fetchUserTokens() {
    setTokensLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.tokens)) {
        setTokens(data.tokens);
      } else if (res.ok && Array.isArray(data)) {
        setTokens(data);
      }
    } catch {
      /* ignore */
    }
    setTokensLoading(false);
  }

  // ── Permission helpers ──

  const allPerms = useMemo(() => schema?.permissions || [], [schema]);
  const groupedPerms = useMemo(
    () => categorizePermissions(allPerms),
    [allPerms],
  );

  const filteredCreatePerms = useMemo(() => {
    if (!createPermSearch.trim()) return allPerms;
    const q = createPermSearch.toLowerCase();
    return allPerms.filter((p) => p.toLowerCase().includes(q));
  }, [allPerms, createPermSearch]);

  // ── Create token ──

  async function createNewToken() {
    const name = createName.trim();
    if (!name) {
      setCreateMessage("Token name is required");
      setCreateMessageType("error");
      return;
    }
    if (name.length > 50) {
      setCreateMessage("Name must be 50 characters or fewer");
      setCreateMessageType("error");
      return;
    }
    if (createPerms.size === 0) {
      setCreateMessage("At least one permission is required");
      setCreateMessageType("error");
      return;
    }
    const expiresHrs = createExpiresHrs
      ? Math.floor(parseInt(createExpiresHrs))
      : 0;
    if (createExpiresHrs && (isNaN(expiresHrs) || expiresHrs < 0)) {
      setCreateMessage("Expiry must be a non-negative number of hours");
      setCreateMessageType("error");
      return;
    }
    if (expiresHrs > 8760) {
      setCreateMessage("Maximum expiry is 1 year (8760 hours)");
      setCreateMessageType("error");
      return;
    }

    setCreateSubmitting(true);
    setCreateMessage("Creating token…");
    setCreateMessageType("success");

    const body: any = {
      name,
      permissions: Array.from(createPerms),
    };
    if (expiresHrs > 0) body.expires_in_hrs = expiresHrs;
    if (createDescription.trim()) body.description = createDescription.trim();
    if (createOrigin.trim()) body.origin = createOrigin.trim();
    const sites = createWebsites
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sites.length) body.websites = sites;

    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/create?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setCreatedToken({ id: data.id, token: data.token, name: data.name });
        setCreateMessage("");
        setCreateName("");
        setCreateDescription("");
        setCreateOrigin("");
        setCreateWebsites("");
        setCreateExpiresHrs("");
        setCreatePerms(new Set());
        setCreatePermSearch("");
        fetchUserTokens();
      } else {
        setCreateMessage(data.error || "Failed to create token");
        setCreateMessageType("error");
      }
    } catch {
      setCreateMessage("Network error occurred");
      setCreateMessageType("error");
    }
    setCreateSubmitting(false);
  }

  // ── Token actions ──

  async function renameToken(tokenId: string) {
    const input = nameInputRefs.current[tokenId];
    const name = (input?.value || "").trim();
    if (!name) {
      setTokenMsg(tokenId, "Name cannot be empty", "error");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(tokenId)}/rename?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTokenMsg(tokenId, "Name updated", "success");
        fetchUserTokens();
      } else {
        setTokenMsg(tokenId, data.error || "Failed to rename", "error");
      }
    } catch {
      setTokenMsg(tokenId, "Network error", "error");
    }
  }

  async function updateDescription(tokenId: string) {
    const input = descInputRefs.current[tokenId];
    const description = (input?.value || "").trim();
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(tokenId)}?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTokenMsg(tokenId, "Description updated", "success");
        fetchUserTokens();
      } else {
        setTokenMsg(
          tokenId,
          data.error || "Failed to update description",
          "error",
        );
      }
    } catch {
      setTokenMsg(tokenId, "Network error", "error");
    }
  }

  async function saveEditedPerms(tokenId: string, perms: Set<string>) {
    if (perms.size === 0) {
      setTokenMsg(tokenId, "At least one permission is required", "error");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(tokenId)}?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: Array.from(perms) }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTokenMsg(tokenId, "Permissions updated", "success");
        setEditingPerms((prev) => ({ ...prev, [tokenId]: null }));
        fetchUserTokens();
      } else {
        setTokenMsg(
          tokenId,
          data.error || "Failed to update permissions",
          "error",
        );
      }
    } catch {
      setTokenMsg(tokenId, "Network error", "error");
    }
  }

  async function revokeToken(tokenId: string) {
    if (!confirm("Revoke this token? It will become immediately unusable."))
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(tokenId)}/revoke?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTokenMsg(tokenId, "Token revoked", "success");
        fetchUserTokens();
      } else {
        setTokenMsg(tokenId, data.error || "Failed to revoke", "error");
      }
    } catch {
      setTokenMsg(tokenId, "Network error", "error");
    }
  }

  async function deleteToken(tokenId: string) {
    if (!confirm("Delete this token permanently? This cannot be undone."))
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(tokenId)}?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (res.ok) {
        setSelectedToken(null);
        fetchUserTokens();
      } else {
        setTokenMsg(tokenId, data.error || "Failed to delete", "error");
      }
    } catch {
      setTokenMsg(tokenId, "Network error", "error");
    }
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setTokenMsg(key, "Copied!", "success");
      setTimeout(
        () =>
          setTokenMessages((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          }),
        2000,
      );
    } catch {
      setTokenMsg(key, "Failed to copy", "error");
    }
  }

  function startEditPerms(token: SubToken) {
    setEditingPerms((prev) => ({
      ...prev,
      [token.id]: new Set(token.permissions),
    }));
  }

  function cancelEditPerms(tokenId: string) {
    setEditingPerms((prev) => {
      const next = { ...prev };
      delete next[tokenId];
      return next;
    });
  }

  // ── Render ──

  if (!currentUser) {
    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
            <div class={s.authRequired}>
              <div class={s.authRequiredIcon}>
                <Key size={28} />
              </div>
              <div class={s.authRequiredTitle}>
                Sign in to manage sub-tokens
              </div>
              <p class={s.authRequiredText}>
                Sign in to create and manage permission-scoped sub-tokens for
                the apps you use.
              </p>
              <a
                href={`/auth?return_to=${encodeURIComponent("/tokens")}`}
                class={s.btnPrimary}
              >
                Sign in
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
          <div class={s.pageHeader}>
            <div>
              <h1 class={s.pageTitle}>Token Manager</h1>
              <p class={s.pageSubtitle}>
                Create and manage permission-scoped sub-tokens for the apps you
                use
              </p>
            </div>
          </div>

          {/* Newly created token reveal */}
          {createdToken && (
            <div class={s.tokenReveal}>
              <div class={s.tokenRevealHeader}>
                <Shield size={16} /> Token created:{" "}
                {escapeHtml(createdToken.name)}
              </div>
              <p class={s.tokenRevealText}>
                Copy this token now.{" "}
                <strong>It will never be shown again.</strong> Store it
                somewhere safe, you'll need to provide it to the app that
                requested it.
              </p>
              <div class={s.tokenRevealValue}>
                <code>{createdToken.token}</code>
                <button
                  class={s.copyBtn}
                  onClick={() => copyToClipboard(createdToken.token, "__new__")}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <button
                class={s.btnSecondary}
                style={{ marginTop: "0.75rem" }}
                onClick={() => setCreatedToken(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <div class={s.tabsBar} role="tablist" aria-label="Token sections">
            <div class={s.tabs}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  class={`${s.tab} ${activeTab === id ? s.tabActive : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                  {id === "your-tokens" && tokens.length > 0 && (
                    <span class={s.tabBadge}>{tokens.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div role="tabpanel" class={s.tabPanel}>
            {activeTab === "your-tokens" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <Key size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Your Sub-Tokens</h2>
                      <p class={s.sectionSubtitle}>
                        {tokens.length}/25 created
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  {tokensLoading && (
                    <div class={s.loading}>Loading your tokens…</div>
                  )}
                  {!tokensLoading && tokens.length === 0 && (
                    <div class={s.empty}>
                      <div class={s.emptyIcon}>
                        <Key size={24} />
                      </div>
                      <div class={s.emptyTitle}>No sub-tokens yet</div>
                      <div class={s.emptyText}>
                        Create one in the Create Token tab or grant scoped
                        access from the /auth page.
                      </div>
                    </div>
                  )}
                  <div class={s.tokenGrid}>
                    {tokens.map((token) => {
                      const st = statusOf(token);
                      return (
                        <div
                          key={token.id}
                          class={`${s.tokenCard} ${token.revoked ? s.tokenCardRevoked : ""}`}
                          onClick={() => setSelectedToken(token)}
                        >
                          <div class={s.tokenHeader}>
                            <h3 class={s.tokenName}>
                              {escapeHtml(token.name)}
                            </h3>
                            <span class={`${s.tokenTag} ${s[st.cls]}`}>
                              {st.label}
                            </span>
                          </div>
                          <div class={s.tokenInfo}>
                            <div class={s.tokenInfoRow}>
                              <span class={s.tokenInfoLabel}>Permissions:</span>
                              <span class={s.tokenInfoValue}>
                                {token.permissions.length}
                              </span>
                            </div>
                            <div class={s.tokenInfoRow}>
                              <span class={s.tokenInfoLabel}>Created:</span>
                              <span class={s.tokenInfoValue}>
                                {formatDate(token.created_at)}
                              </span>
                            </div>
                            {token.origin && (
                              <div class={s.tokenInfoRow}>
                                <span class={s.tokenInfoLabel}>Origin:</span>
                                <span class={s.tokenInfoValue}>
                                  {escapeHtml(token.origin)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "create-token" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <PlusCircle size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Create New Sub-Token</h2>
                      <p class={s.sectionSubtitle}>
                        Set up a new permission-scoped token
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  <div class={s.formGroup}>
                    <label for="new-token-name">
                      Token Name{" "}
                      <span style={{ color: "var(--text-subtle)" }}>
                        (1–50 chars)
                      </span>
                    </label>
                    <input
                      type="text"
                      id="new-token-name"
                      class={s.formInput}
                      placeholder='e.g. "My App, read-only"'
                      value={createName}
                      maxLength={50}
                      onInput={(e: any) => setCreateName(e.target.value)}
                    />
                  </div>

                  <div class={s.formRow}>
                    <div class={s.formGroup}>
                      <label for="new-token-origin">Origin / App</label>
                      <input
                        type="text"
                        id="new-token-origin"
                        class={s.formInput}
                        placeholder="https://myapp.example.com"
                        value={createOrigin}
                        onInput={(e: any) => setCreateOrigin(e.target.value)}
                      />
                    </div>
                    <div class={s.formGroup}>
                      <label for="new-token-expires">
                        Expires in (hours){" "}
                        <span style={{ color: "var(--text-subtle)" }}>
                          (blank = never)
                        </span>
                      </label>
                      <input
                        type="number"
                        id="new-token-expires"
                        class={s.formInput}
                        placeholder="e.g. 720 for 30 days"
                        min={0}
                        max={8760}
                        value={createExpiresHrs}
                        onInput={(e: any) =>
                          setCreateExpiresHrs(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div class={s.formGroup}>
                    <label for="new-token-websites">
                      Websites{" "}
                      <span style={{ color: "var(--text-subtle)" }}>
                        (comma or space separated)
                      </span>
                    </label>
                    <input
                      type="text"
                      id="new-token-websites"
                      class={s.formInput}
                      placeholder="https://myapp.example.com, https://other.example.com"
                      value={createWebsites}
                      onInput={(e: any) => setCreateWebsites(e.target.value)}
                    />
                  </div>

                  <div class={s.formGroup}>
                    <label for="new-token-description">Description</label>
                    <textarea
                      id="new-token-description"
                      class={s.formInput}
                      placeholder="What is this token for?"
                      value={createDescription}
                      onInput={(e: any) => setCreateDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Permission picker */}
                  <div class={s.permPicker}>
                    <div class={s.permPickerHeader}>
                      <h5 class={s.permPickerTitle}>Permissions</h5>
                      <div class={s.permPickerActions}>
                        {schema?.groups && schema.groups.length > 0 && (
                          <select
                            class={s.formInput}
                            style={{
                              width: "auto",
                              padding: "0.3rem 0.5rem",
                              fontSize: "0.75rem",
                            }}
                            onChange={(e: any) => {
                              const g = schema.groups.find(
                                (x) => x.name === e.target.value,
                              );
                              if (g)
                                setCreatePerms(
                                  applyGroup(createPerms, g.permissions),
                                );
                              e.target.value = "";
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Apply group…
                            </option>
                            {schema.groups.map((g) => (
                              <option key={g.name} value={g.name}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          class={s.permApplyBtn}
                          onClick={() => setCreatePerms(new Set())}
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      class={s.formInput}
                      placeholder="Search permissions…"
                      value={createPermSearch}
                      onInput={(e: any) => setCreatePermSearch(e.target.value)}
                      style={{ marginBottom: "0.75rem" }}
                    />
                    {Object.entries(groupedPerms).map(([cat, perms]) => {
                      const visible = filteredCreatePerms.filter((p) =>
                        perms.includes(p),
                      );
                      if (visible.length === 0) return null;
                      return (
                        <div key={cat} class={s.permGroup}>
                          <div class={s.permGroupHeader}>
                            <span>{cat}</span>
                            <div class={s.permGroupActions}>
                              <button
                                class={s.permApplyBtn}
                                onClick={() =>
                                  setCreatePerms(
                                    applyGroup(createPerms, visible),
                                  )
                                }
                              >
                                All
                              </button>
                              <button
                                class={s.permApplyBtn}
                                onClick={() =>
                                  setCreatePerms(
                                    clearGroup(createPerms, visible),
                                  )
                                }
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <div class={s.permList}>
                            {visible.map((p) => {
                              const forbidden = FORBIDDEN_PERMISSIONS.has(p);
                              const checked = createPerms.has(p);
                              return (
                                <label
                                  key={p}
                                  class={`${s.permItem} ${checked ? s.permItemChecked : ""} ${forbidden ? s.permForbidden : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={forbidden}
                                    onChange={() =>
                                      setCreatePerms(togglePerm(createPerms, p))
                                    }
                                  />
                                  <span class={s.permItemLabel}>{p}</span>
                                  {forbidden && (
                                    <span class={s.permBadge}>forbidden</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div class={s.permPickerFooter}>
                      <span>
                        <span class={s.permPickerCount}>
                          {createPerms.size}
                        </span>{" "}
                        permission{createPerms.size !== 1 ? "s" : ""} selected
                        {createPerms.size === 0 && (
                          <span
                            style={{
                              color: "#fbbf24",
                              marginLeft: "0.5rem",
                            }}
                          >
                            - pick at least one
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-subtle)",
                        }}
                      >
                        <code>tokens:manage</code> and{" "}
                        <code>account:delete</code> cannot be granted
                      </span>
                    </div>
                  </div>

                  <div class={s.formGroup}>
                    <button
                      class={s.btnPrimary}
                      style={{ width: "100%" }}
                      onClick={createNewToken}
                      disabled={createSubmitting}
                    >
                      <PlusCircle size={14} />{" "}
                      {createSubmitting ? "Creating…" : "Create Sub-Token"}
                    </button>
                  </div>
                  {createMessage && (
                    <div
                      class={
                        createMessageType === "success" ? s.success : s.error
                      }
                    >
                      {createMessage}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <a
            href="https://docs.rotur.dev/assorted-apis/tokens"
            target="_blank"
            rel="noopener noreferrer"
            class={s.docsLink}
          >
            <ExternalLink size={14} /> Tokens API docs
          </a>
        </div>
      </div>

      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          allPerms={allPerms}
          schema={schema}
          message={tokenMessages[selectedToken.id]}
          editing={editingPerms[selectedToken.id]}
          editSearch={editSearch[selectedToken.id] || ""}
          onClose={() => {
            setSelectedToken(null);
            cancelEditPerms(selectedToken.id);
          }}
          onCopy={copyToClipboard}
          onRename={renameToken}
          onUpdateDescription={updateDescription}
          onSavePerms={(perms) => saveEditedPerms(selectedToken.id, perms)}
          onStartEditPerms={() => startEditPerms(selectedToken)}
          onCancelEditPerms={() => cancelEditPerms(selectedToken.id)}
          onSetEditingPerms={(perms) =>
            setEditingPerms((prev) => ({
              ...prev,
              [selectedToken.id]: perms,
            }))
          }
          onSetEditSearch={(q) =>
            setEditSearch((prev) => ({ ...prev, [selectedToken.id]: q }))
          }
          onRevoke={() => revokeToken(selectedToken.id)}
          onDelete={() => deleteToken(selectedToken.id)}
          nameInputRefs={nameInputRefs}
          descInputRefs={descInputRefs}
        />
      )}

      <Footer />
    </div>
  );
}

// ── Token detail modal ──

function TokenDetailModal({
  token,
  allPerms,
  schema,
  message,
  editing,
  editSearch,
  onClose,
  onCopy,
  onRename,
  onUpdateDescription,
  onSavePerms,
  onStartEditPerms,
  onCancelEditPerms,
  onSetEditingPerms,
  onSetEditSearch,
  onRevoke,
  onDelete,
  nameInputRefs,
  descInputRefs,
}: {
  token: SubToken;
  allPerms: string[];
  schema: PermissionSchema | null;
  message: { text: string; type: "success" | "error" } | undefined;
  editing: Set<string> | null | undefined;
  editSearch: string;
  onClose: () => void;
  onCopy: (text: string, key: string) => void;
  onRename: (tokenId: string) => void;
  onUpdateDescription: (tokenId: string) => void;
  onSavePerms: (perms: Set<string>) => void;
  onStartEditPerms: () => void;
  onCancelEditPerms: () => void;
  onSetEditingPerms: (perms: Set<string>) => void;
  onSetEditSearch: (q: string) => void;
  onRevoke: () => void;
  onDelete: () => void;
  nameInputRefs: { current: Record<string, HTMLInputElement | null> };
  descInputRefs: { current: Record<string, HTMLInputElement | null> };
}) {
  const tokenId = token.id;
  const st = statusOf(token);
  const editSet = editing ?? new Set(token.permissions);
  const editQuery = editSearch.toLowerCase();
  const editFiltered = editQuery
    ? allPerms.filter((p) => p.toLowerCase().includes(editQuery))
    : allPerms;
  const editGroups = categorizePermissions(editFiltered);
  const createdPerms = categorizePermissions(token.permissions);

  return (
    <div class={s.modal} onClick={onClose}>
      <div class={s.modalOverlay} />
      <div class={s.modalContainer} onClick={(e) => e.stopPropagation()}>
        <button class={s.modalClose} onClick={onClose}>
          <X size={20} />
        </button>
        <div class={s.modalContent}>
          <div class={s.modalHeader}>
            <span class={s.modalType}>{st.label} Sub-Token</span>
            <h2 class={s.modalName}>{escapeHtml(token.name)}</h2>
          </div>

          {message && (
            <div class={message.type === "success" ? s.success : s.error}>
              {message.text}
            </div>
          )}

          <div class={s.modalStats}>
            <div class={s.modalStatItem}>
              <Key size={16} />
              <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                {tokenId.substring(0, 12)}…
              </span>
              <button
                class={s.copyBtn}
                onClick={() => onCopy(tokenId, tokenId)}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
            <div class={s.modalStatItem}>
              <Shield size={16} />
              <span>{token.permissions.length} permissions</span>
            </div>
            <div class={s.modalStatItem}>
              <Clock size={16} />
              <span>Created {formatDate(token.created_at)}</span>
            </div>
            {token.last_used_at && (
              <div class={s.modalStatItem}>
                <Clock size={16} />
                <span>Last used {formatDate(token.last_used_at)}</span>
              </div>
            )}
            {token.expires_at && (
              <div class={s.modalStatItem}>
                <Clock size={16} />
                <span>
                  {token.expires_at < Date.now()
                    ? `Expired ${formatDate(token.expires_at)}`
                    : `Expires ${formatDate(token.expires_at)}`}
                </span>
              </div>
            )}
            {token.origin && (
              <div class={s.modalStatItem}>
                <Globe size={16} />
                <span>{escapeHtml(token.origin)}</span>
              </div>
            )}
            {token.websites && token.websites.length > 0 && (
              <div class={s.modalStatItem}>
                <Globe size={16} />
                <span>
                  {token.websites.map((w) => escapeHtml(w)).join(", ")}
                </span>
              </div>
            )}
            {token.description && (
              <div class={s.modalStatItem}>
                <FileText size={16} />
                <span>{escapeHtml(token.description)}</span>
              </div>
            )}
          </div>

          {/* Current Permissions */}
          <div class={s.modalSection}>
            <h4>Current Permissions</h4>
            {token.permissions.length === 0 ? (
              <div
                style={{
                  color: "var(--text-subtle)",
                  fontSize: "0.8rem",
                }}
              >
                No permissions.
              </div>
            ) : (
              <div>
                {Object.entries(createdPerms).map(([cat, perms]) => (
                  <div key={cat} style={{ marginBottom: "0.5rem" }}>
                    <div class={s.permGroupLabel}>{cat}</div>
                    <div class={s.permChips}>
                      {perms.map((p) => (
                        <span key={p} class={s.permChip}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit Permissions */}
          {!token.revoked && (
            <div class={s.modalSection}>
              <h4>Edit Permissions</h4>
              {editing === null || editing === undefined ? (
                <button class={s.btnSecondary} onClick={onStartEditPerms}>
                  <Shield size={14} /> Modify Permissions
                </button>
              ) : (
                <div class={s.permPicker}>
                  <div class={s.permPickerHeader}>
                    <h5 class={s.permPickerTitle}>
                      Pick the permissions for this token
                    </h5>
                    <div class={s.permPickerActions}>
                      {schema?.groups && schema.groups.length > 0 && (
                        <select
                          class={s.formInput}
                          style={{
                            width: "auto",
                            padding: "0.3rem 0.5rem",
                            fontSize: "0.75rem",
                          }}
                          onChange={(e: any) => {
                            const g = schema.groups.find(
                              (x) => x.name === e.target.value,
                            );
                            if (g) {
                              onSetEditingPerms(
                                applyGroup(editSet, g.permissions),
                              );
                            }
                            e.target.value = "";
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Apply group…
                          </option>
                          {schema.groups.map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        class={s.permApplyBtn}
                        onClick={() => onSetEditingPerms(new Set())}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    class={s.formInput}
                    placeholder="Search permissions…"
                    value={editSearch}
                    onInput={(e: any) => onSetEditSearch(e.target.value)}
                    style={{ marginBottom: "0.75rem" }}
                  />
                  {Object.entries(editGroups).map(([cat, perms]) => (
                    <div key={cat} class={s.permGroup}>
                      <div class={s.permGroupHeader}>
                        <span>{cat}</span>
                        <div class={s.permGroupActions}>
                          <button
                            class={s.permApplyBtn}
                            onClick={() =>
                              onSetEditingPerms(applyGroup(editSet, perms))
                            }
                          >
                            All
                          </button>
                          <button
                            class={s.permApplyBtn}
                            onClick={() =>
                              onSetEditingPerms(clearGroup(editSet, perms))
                            }
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div class={s.permList}>
                        {perms.map((p) => {
                          const forbidden = FORBIDDEN_PERMISSIONS.has(p);
                          const checked = editSet.has(p);
                          return (
                            <label
                              key={p}
                              class={`${s.permItem} ${checked ? s.permItemChecked : ""} ${forbidden ? s.permForbidden : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={forbidden}
                                onChange={() => {
                                  if (forbidden) return;
                                  onSetEditingPerms(togglePerm(editSet, p));
                                }}
                              />
                              <span class={s.permItemLabel}>{p}</span>
                              {forbidden && (
                                <span class={s.permBadge}>forbidden</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div class={s.permPickerFooter}>
                    <span>
                      <span class={s.permPickerCount}>{editSet.size}</span>{" "}
                      permission{editSet.size !== 1 ? "s" : ""} selected
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        class={s.btnSecondary}
                        onClick={onCancelEditPerms}
                      >
                        Cancel
                      </button>
                      <button
                        class={s.btnPrimary}
                        onClick={() => onSavePerms(editSet)}
                      >
                        Save Permissions
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Name / Description */}
          <div class={s.modalSection}>
            <h4>Token Settings</h4>
            <div class={s.modalEditGrid}>
              <div class={s.detailItem}>
                <h4>Name</h4>
                <input
                  ref={(el) => {
                    nameInputRefs.current[tokenId] = el;
                  }}
                  type="text"
                  class={s.formInput}
                  placeholder="Set token name"
                  defaultValue={token.name}
                  maxLength={50}
                />
                <button
                  class={s.btnSecondary}
                  onClick={() => onRename(tokenId)}
                  style={{ marginTop: "0.5rem" }}
                >
                  Update
                </button>
              </div>

              <div class={s.detailItem}>
                <h4>Description</h4>
                <textarea
                  ref={(el) => {
                    descInputRefs.current[tokenId] = el as any;
                  }}
                  class={s.formInput}
                  placeholder="What is this token for?"
                  defaultValue={token.description || ""}
                  rows={2}
                />
                <button
                  class={s.btnSecondary}
                  onClick={() => onUpdateDescription(tokenId)}
                  style={{ marginTop: "0.5rem" }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div class={s.modalFooter}>
            {!token.revoked && (
              <button class={s.btnSecondary} onClick={onRevoke}>
                <RotateCcw size={14} /> Revoke
              </button>
            )}
            <button class={s.btnDanger} onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
