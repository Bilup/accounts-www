import {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "preact/hooks";
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

export function TokenManager() {
  const { user } = useAuth();
  const currentUser = user?.username || "";

  const [tokens, setTokens] = useState<SubToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [schema, setSchema] = useState<PermissionSchema | null>(null);

  const [expandedTokens, setExpandedTokens] = useState<Record<string, boolean>>(
    {},
  );
  const [tokenMessages, setTokenMessages] = useState<
    Record<string, { text: string; type: "success" | "error" }>
  >({});

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

  async function saveEditedPerms(tokenId: string) {
    const perms = editingPerms[tokenId];
    if (!perms) return;
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

  function toggleTokenExpand(tokenId: string) {
    setExpandedTokens((prev) => ({ ...prev, [tokenId]: !prev[tokenId] }));
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

  return (
    <div class={s.page}>
      <Header />
      <div class={s.wrapper}>
        <h1 class={s.title}>Token Manager</h1>
        <p class={s.subtitle}>
          Create and manage permission-scoped sub-tokens for the apps you use.
        </p>
        <div class={s.rule} />

          <div class={s.userInfo}>
            <div>
              <div class={s.welcomeText}>
                Welcome, <strong>{escapeHtml(currentUser)}</strong>!
              </div>
              <p class={s.welcomeSub}>
                Sub-tokens start with <code>rotur_st_</code> and can only
                perform actions you've explicitly allowed.
              </p>
            </div>

            {/* Newly created token reveal */}
            {createdToken && (
              <div class={s.tokenReveal}>
                <h3 class={s.tokenRevealTitle}>
                  <i class="fas fa-check-circle" /> Token created:{" "}
                  {escapeHtml(createdToken.name)}
                </h3>
                <p class={s.tokenRevealText}>
                  Copy this token now.{" "}
                  <strong>It will never be shown again.</strong> Store it
                  somewhere safe, you'll need to provide it to the app that
                  requested it.
                </p>
                <div class={s.tokenRevealValue}>
                  <code>{createdToken.token}</code>
                  <button
                    class={s.copyButton}
                    onClick={() =>
                      copyToClipboard(createdToken.token, "__new__")
                    }
                  >
                    Copy
                  </button>
                </div>
                <button
                  class={`${s.invBtn} ${s.invBtnSecondary}`}
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => setCreatedToken(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Tokens list */}
            <div style={{ width: "100%" }}>
              <h2 class={s.sectionHeading}>
                Your Sub-Tokens ({tokens.length}/25)
              </h2>
              {tokensLoading && (
                <div class={s.loading}>Loading your tokens…</div>
              )}
              {!tokensLoading && tokens.length === 0 && (
                <div class={s.noTokens}>
                  You haven't created any sub-tokens yet. Create one below or
                  grant scoped access from the /auth page.
                </div>
              )}
              {tokens.map((token) => {
                const tokenId = token.id;
                const isOpen = !!expandedTokens[tokenId];
                const msg = tokenMessages[tokenId];
                const st = statusOf(token);
                const editing = editingPerms[tokenId];
                const editSet = editing ?? new Set(token.permissions);
                const editQuery = (editSearch[tokenId] || "").toLowerCase();
                const editFiltered = editQuery
                  ? allPerms.filter((p) => p.toLowerCase().includes(editQuery))
                  : allPerms;
                const editGroups = categorizePermissions(editFiltered);
                const createdPerms = categorizePermissions(token.permissions);

                return (
                  <div
                    key={tokenId}
                    class={`${s.tokenItem} ${token.revoked ? s.tokenItemRevoked : ""} ${token.expires_at && token.expires_at < Date.now() ? s.tokenItemExpired : ""}`}
                  >
                    <div
                      class={s.tokenSummary}
                      onClick={() => toggleTokenExpand(tokenId)}
                    >
                      <div class={s.tokenSummaryLeft}>
                        <h3 class={s.tokenNameTitle}>
                          {escapeHtml(token.name)}
                        </h3>
                        <div class={s.tokenSummaryInfo}>
                          <span>
                            {token.permissions.length} permission
                            {token.permissions.length !== 1 ? "s" : ""}
                          </span>
                          {token.origin && (
                            <span>for {escapeHtml(token.origin)}</span>
                          )}
                          <span>Created {formatDate(token.created_at)}</span>
                        </div>
                      </div>
                      <div class={s.tokenSummaryRight}>
                        <span class={`${s.tokenTag} ${s[st.cls]}`}>
                          {st.label}
                        </span>
                        <span
                          class={`${s.expandIcon} ${isOpen ? s.expandIconOpen : ""}`}
                        >
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Collapsible details */}
                    <div
                      class={`${s.tokenDetails} ${isOpen ? s.tokenDetailsOpen : ""}`}
                    >
                      <div class={s.tokenGrid}>
                        <div class={s.infoSection}>
                          <h4>Token Information</h4>
                          <div class={s.infoRow}>
                            <div class={s.infoLabel}>ID:</div>
                            <div class={s.infoValue}>
                              <span class={s.tokenIdValue}>{tokenId}</span>
                              <button
                                class={s.copyButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(tokenId, tokenId);
                                }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                          <div class={s.infoRow}>
                            <div class={s.infoLabel}>Name:</div>
                            <div
                              class={s.infoValue}
                              style={{
                                fontWeight: "bold",
                                color: "var(--text)",
                              }}
                            >
                              {escapeHtml(token.name)}
                            </div>
                          </div>
                          <div class={s.infoRow}>
                            <div class={s.infoLabel}>Status:</div>
                            <div class={s.infoValue}>
                              <span class={`${s.tokenTag} ${s[st.cls]}`}>
                                {st.label}
                              </span>
                            </div>
                          </div>
                          <div class={s.infoRow}>
                            <div class={s.infoLabel}>Created:</div>
                            <div class={s.infoValue}>
                              {formatDate(token.created_at)}
                            </div>
                          </div>
                          <div class={s.infoRow}>
                            <div class={s.infoLabel}>Last used:</div>
                            <div class={s.infoValue}>
                              {formatDate(token.last_used_at)}
                            </div>
                          </div>
                          <div class={s.infoRow}>
                            <div class={s.infoLabel}>Expires:</div>
                            <div class={s.infoValue}>
                              {token.expires_at
                                ? formatDate(token.expires_at)
                                : "Never"}
                            </div>
                          </div>
                          {token.revoked && token.revoked_at && (
                            <div class={s.infoRow}>
                              <div class={s.infoLabel}>Revoked at:</div>
                              <div class={s.infoValue}>
                                {formatDate(token.revoked_at)}
                              </div>
                            </div>
                          )}
                          {token.origin && (
                            <div class={s.infoRow}>
                              <div class={s.infoLabel}>Origin:</div>
                              <div class={s.infoValue}>
                                {escapeHtml(token.origin)}
                              </div>
                            </div>
                          )}
                          {token.websites && token.websites.length > 0 && (
                            <div class={s.infoRow}>
                              <div class={s.infoLabel}>Websites:</div>
                              <div class={s.infoValue}>
                                {token.websites
                                  .map((w) => escapeHtml(w))
                                  .join(", ")}
                              </div>
                            </div>
                          )}
                          {token.description && (
                            <div class={s.infoRow}>
                              <div class={s.infoLabel}>Description:</div>
                              <div class={s.infoValue}>
                                {escapeHtml(token.description)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div class={s.infoSection}>
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
                              {Object.entries(createdPerms).map(
                                ([cat, perms]) => (
                                  <div
                                    key={cat}
                                    style={{ marginBottom: "0.5rem" }}
                                  >
                                    <div class={s.permGroupLabel}>{cat}</div>
                                    <div class={s.permChips}>
                                      {perms.map((p) => (
                                        <span key={p} class={s.permChip}>
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit permissions */}
                      {!token.revoked && (
                        <div class={s.adminSection}>
                          <h4
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              fontSize: "0.9rem",
                              color: "var(--text)",
                              margin: "0 0 0.75rem",
                            }}
                          >
                            Edit Permissions
                          </h4>
                          {editing === null ? (
                            <button
                              class={`${s.invBtn} ${s.invBtnPrimary}`}
                              onClick={() => startEditPerms(token)}
                            >
                              Modify Permissions
                            </button>
                          ) : (
                            <div class={s.permPicker}>
                              <div class={s.permPickerHeader}>
                                <h5 class={s.permPickerTitle}>
                                  Pick the permissions for this token
                                </h5>
                                <div class={s.permPickerActions}>
                                  {schema?.groups &&
                                    schema.groups.length > 0 && (
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
                                            setEditingPerms((prev) => ({
                                              ...prev,
                                              [tokenId]: applyGroup(
                                                editSet,
                                                g.permissions,
                                              ),
                                            }));
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
                                    onClick={() =>
                                      setEditingPerms((prev) => ({
                                        ...prev,
                                        [tokenId]: new Set(),
                                      }))
                                    }
                                  >
                                    Clear all
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                class={`${s.formInput} ${s.permPickerSearch}`}
                                placeholder="Search permissions…"
                                value={editSearch[tokenId] || ""}
                                onInput={(e: any) =>
                                  setEditSearch((prev) => ({
                                    ...prev,
                                    [tokenId]: e.target.value,
                                  }))
                                }
                              />
                              {Object.entries(editGroups).map(
                                ([cat, perms]) => (
                                  <div key={cat} class={s.permGroup}>
                                    <div class={s.permGroupHeader}>
                                      <span>{cat}</span>
                                      <div class={s.permGroupActions}>
                                        <button
                                          class={s.permApplyBtn}
                                          onClick={() =>
                                            setEditingPerms((prev) => ({
                                              ...prev,
                                              [tokenId]: applyGroup(
                                                editSet,
                                                perms,
                                              ),
                                            }))
                                          }
                                        >
                                          All
                                        </button>
                                        <button
                                          class={s.permApplyBtn}
                                          onClick={() =>
                                            setEditingPerms((prev) => ({
                                              ...prev,
                                              [tokenId]: clearGroup(
                                                editSet,
                                                perms,
                                              ),
                                            }))
                                          }
                                        >
                                          None
                                        </button>
                                      </div>
                                    </div>
                                    <div class={s.permList}>
                                      {perms.map((p) => {
                                        const forbidden =
                                          FORBIDDEN_PERMISSIONS.has(p);
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
                                                setEditingPerms((prev) => ({
                                                  ...prev,
                                                  [tokenId]: togglePerm(
                                                    editSet,
                                                    p,
                                                  ),
                                                }));
                                              }}
                                            />
                                            <span class={s.permItemLabel}>
                                              {p}
                                            </span>
                                            {forbidden && (
                                              <span class={s.permBadge}>
                                                forbidden
                                              </span>
                                            )}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ),
                              )}
                              <div class={s.permPickerFooter}>
                                <span>
                                  <span class={s.permPickerCount}>
                                    {editSet.size}
                                  </span>{" "}
                                  permission{editSet.size !== 1 ? "s" : ""}{" "}
                                  selected
                                </span>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                  <button
                                    class={`${s.invBtn} ${s.invBtnSecondary}`}
                                    onClick={() => cancelEditPerms(tokenId)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    class={`${s.invBtn} ${s.invBtnPrimary}`}
                                    onClick={() => saveEditedPerms(tokenId)}
                                  >
                                    Save Permissions
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin controls */}
                      <div class={s.adminSection}>
                        <div class={s.adminGrid}>
                          <div class={s.adminGroup}>
                            <h4>Set Token Name</h4>
                            <div class={s.formGroup}>
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
                            </div>
                            <button
                              class={`${s.invBtn} ${s.invBtnPrimary}`}
                              onClick={() => renameToken(tokenId)}
                            >
                              Update Name
                            </button>
                          </div>

                          <div class={s.adminGroup}>
                            <h4>Set Description</h4>
                            <div class={s.formGroup}>
                              <textarea
                                ref={(el) => {
                                  descInputRefs.current[tokenId] = el as any;
                                }}
                                class={s.formInput}
                                placeholder="What is this token for?"
                                defaultValue={token.description || ""}
                                rows={2}
                              />
                            </div>
                            <button
                              class={`${s.invBtn} ${s.invBtnPrimary}`}
                              onClick={() => updateDescription(tokenId)}
                            >
                              Update Description
                            </button>
                          </div>

                          <div class={s.adminGroup}>
                            <h4>Token Management</h4>
                            <div class={s.adminButtons}>
                              {!token.revoked && (
                                <button
                                  class={`${s.invBtn} ${s.invBtnSecondary}`}
                                  onClick={() => revokeToken(tokenId)}
                                >
                                  Revoke
                                </button>
                              )}
                              <button
                                class={`${s.invBtn} ${s.invBtnDanger}`}
                                onClick={() => deleteToken(tokenId)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {msg && (
                        <div
                          class={msg.type === "success" ? s.success : s.error}
                          style={{ marginTop: "0.75rem" }}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Create new token */}
              <h2 class={s.sectionHeading}>Create New Sub-Token</h2>
              <div class={s.createTokenSection}>
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
                      onInput={(e: any) => setCreateExpiresHrs(e.target.value)}
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
                    class={`${s.formInput} ${s.permPickerSearch}`}
                    placeholder="Search permissions…"
                    value={createPermSearch}
                    onInput={(e: any) => setCreatePermSearch(e.target.value)}
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
                                setCreatePerms(applyGroup(createPerms, visible))
                              }
                            >
                              All
                            </button>
                            <button
                              class={s.permApplyBtn}
                              onClick={() =>
                                setCreatePerms(clearGroup(createPerms, visible))
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
                      <span class={s.permPickerCount}>{createPerms.size}</span>{" "}
                      permission{createPerms.size !== 1 ? "s" : ""} selected
                      {createPerms.size === 0 && (
                        <span
                          style={{ color: "#fbbf24", marginLeft: "0.5rem" }}
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
                      <code>tokens:manage</code> and <code>account:delete</code>{" "}
                      cannot be granted
                    </span>
                  </div>
                </div>

                <div class={s.formGroup}>
                  <button
                    class={`${s.invBtn} ${s.invBtnPrimary}`}
                    style={{
                      width: "100%",
                      padding: "0.65rem 1.25rem",
                      fontSize: "0.85rem",
                    }}
                    onClick={createNewToken}
                    disabled={createSubmitting}
                  >
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

              <p
                style={{
                  color: "var(--text-subtle)",
                  fontSize: "0.8rem",
                  textAlign: "center",
                  margin: "1.5rem 0 0",
                }}
              >
                <i class="fas fa-info-circle" /> Read the{" "}
                <a
                  href="https://docs.rotur.dev/assorted-apis/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Tokens API docs
                </a>{" "}
                for full details.
              </p>
            </div>
          </div>
      </div>
      <Footer />
    </div>
  );
}
