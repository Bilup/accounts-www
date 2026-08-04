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
import {
  AccountPage,
  AccountSection,
  AccountTabPanel,
  AccountTabs,
  AuthRequired,
  EmptyState,
} from "../components/AccountPage";
import { useAuth, getToken } from "../lib/auth";
import { clickable } from "../lib/clickable";
import { useConfirm } from "../components/ConfirmDialog";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useI18n } from "../i18n/i18n";
import s from "./TokenManager.module.css";

const API_BASE_URL = "https://api.accounts.bilup.org";

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
  { label: "tokens.catAccount", match: (p) => p.startsWith("account:") },
  { label: "tokens.catCredits", match: (p) => p.startsWith("credits:") },
  { label: "tokens.catFriends", match: (p) => p.startsWith("friends:") },
  { label: "tokens.catPosts", match: (p) => p.startsWith("posts:") },
  { label: "tokens.catFollowing", match: (p) => p.startsWith("following:") },
  { label: "tokens.catFiles", match: (p) => p.startsWith("files:") },
  { label: "tokens.catKeys", match: (p) => p.startsWith("keys:") },
  { label: "tokens.catGroups", match: (p) => p.startsWith("groups:") },
  { label: "tokens.catNotifications", match: (p) => p.startsWith("notifications:") },
  { label: "tokens.catGifts", match: (p) => p.startsWith("gifts:") },
  { label: "tokens.catItems", match: (p) => p.startsWith("items:") },
  { label: "tokens.catOther", match: matchesOther },
];

function categorizePermissions(perms: string[]) {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const cat = PERM_CATEGORIES.find((c) => c.match(p))?.label || "tokens.catOther";
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

function formatDate(ts?: number | null, neverLabel = "Never"): string {
  if (!ts) return neverLabel;
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOf(
  token: SubToken,
  t: (key: string) => string,
): { label: string; cls: string } {
  if (token.revoked) return { label: t("tokens.statusRevoked"), cls: "tagRevoked" };
  if (token.expires_at && token.expires_at < Date.now())
    return { label: t("tokens.statusExpired"), cls: "tagExpired" };
  return { label: t("tokens.statusActive"), cls: "tagActive" };
}

type TabName = "your-tokens" | "create-token";

const TABS: { id: TabName; labelKey: string; icon: typeof Key }[] = [
  { id: "your-tokens", labelKey: "tokens.yourTokens", icon: Key },
  { id: "create-token", labelKey: "tokens.createToken", icon: PlusCircle },
];

export function TokenManager() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currentUser = user?.username || "";

  const [confirm, confirmDialog] = useConfirm();
  const [tokens, setTokens] = useState<SubToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
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
    setTokensError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.tokens)) {
        setTokens(data.tokens);
      } else if (res.ok && Array.isArray(data)) {
        setTokens(data);
      } else {
        // Never let a failed load masquerade as "you have no tokens".
        setTokensError(data?.error || t("tokens.loadError"));
      }
    } catch {
      setTokensError(t("tokens.networkError"));
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
      setCreateMessage(t("tokens.nameRequired"));
      setCreateMessageType("error");
      return;
    }
    if (name.length > 50) {
      setCreateMessage(t("tokens.nameTooLong"));
      setCreateMessageType("error");
      return;
    }
    if (createPerms.size === 0) {
      setCreateMessage(t("tokens.permRequired"));
      setCreateMessageType("error");
      return;
    }
    const expiresHrs = createExpiresHrs
      ? Math.floor(parseInt(createExpiresHrs))
      : 0;
    if (createExpiresHrs && (isNaN(expiresHrs) || expiresHrs < 0)) {
      setCreateMessage(t("tokens.expiryNonNegative"));
      setCreateMessageType("error");
      return;
    }
    if (expiresHrs > 8760) {
      setCreateMessage(t("tokens.expiryMax"));
      setCreateMessageType("error");
      return;
    }

    setCreateSubmitting(true);
    setCreateMessage(t("tokens.creating"));
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
        setCreateMessage(data.error || t("tokens.createFailed"));
        setCreateMessageType("error");
      }
    } catch {
      setCreateMessage(t("tokens.networkError"));
      setCreateMessageType("error");
    }
    setCreateSubmitting(false);
  }

  // ── Token actions ──

  async function renameToken(tokenId: string) {
    const input = nameInputRefs.current[tokenId];
    const name = (input?.value || "").trim();
    if (!name) {
      setTokenMsg(tokenId, t("tokens.nameEmpty"), "error");
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
        setTokenMsg(tokenId, t("tokens.nameUpdated"), "success");
        fetchUserTokens();
      } else {
        setTokenMsg(tokenId, data.error || t("tokens.renameFailed"), "error");
      }
    } catch {
      setTokenMsg(tokenId, t("tokens.networkErrorShort"), "error");
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
        setTokenMsg(tokenId, t("tokens.descUpdated"), "success");
        fetchUserTokens();
      } else {
        setTokenMsg(
          tokenId,
          data.error || t("tokens.descUpdateFailed"),
          "error",
        );
      }
    } catch {
      setTokenMsg(tokenId, t("tokens.networkErrorShort"), "error");
    }
  }

  async function saveEditedPerms(tokenId: string, perms: Set<string>) {
    if (perms.size === 0) {
      setTokenMsg(tokenId, t("tokens.permRequired"), "error");
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
        setTokenMsg(tokenId, t("tokens.permsUpdated"), "success");
        setEditingPerms((prev) => ({ ...prev, [tokenId]: null }));
        fetchUserTokens();
      } else {
        setTokenMsg(
          tokenId,
          data.error || t("tokens.permsUpdateFailed"),
          "error",
        );
      }
    } catch {
      setTokenMsg(tokenId, t("tokens.networkErrorShort"), "error");
    }
  }

  async function revokeToken(tokenId: string) {
    const ok = await confirm({
      title: t("tokens.revokeConfirm"),
      message: t("tokens.revokeMsg"),
      confirmLabel: t("tokens.revokeToken"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/tokens/${encodeURIComponent(tokenId)}/revoke?auth=${encodeURIComponent(getToken() || "")}`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTokenMsg(tokenId, t("tokens.revoked"), "success");
        fetchUserTokens();
      } else {
        setTokenMsg(tokenId, data.error || t("tokens.revokeFailed"), "error");
      }
    } catch {
      setTokenMsg(tokenId, t("tokens.networkErrorShort"), "error");
    }
  }

  async function deleteToken(tokenId: string) {
    const ok = await confirm({
      title: t("tokens.deleteConfirm"),
      message: t("tokens.deleteMsg"),
      confirmLabel: t("tokens.deleteToken"),
      danger: true,
    });
    if (!ok) return;
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
        setTokenMsg(tokenId, data.error || t("tokens.deleteFailed"), "error");
      }
    } catch {
      setTokenMsg(tokenId, t("tokens.networkErrorShort"), "error");
    }
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setTokenMsg(key, t("tokens.tokenCopied"), "success");
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
      setTokenMsg(key, t("tokens.copyFailed"), "error");
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
      <AuthRequired
        icon={<Key size={28} />}
        title={t("tokens.signInManageTitle")}
        text={t("tokens.signInManageText")}
        href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/tokens")}`}
      />
    );
  }

  return (
    <AccountPage
      title={t("tokens.title")}
      subtitle={t("tokens.subtitle")}
    >
      {confirmDialog}
      {/* Newly created token reveal */}
      {createdToken && (
        <div class={s.tokenReveal}>
          <div class={s.tokenRevealHeader}>
            <Shield size={16} /> {t("tokens.tokenCreated")} {createdToken.name}
          </div>
          <p class={s.tokenRevealText}>
            {t("tokens.copyTokenPart1")}{" "}
            <strong>{t("tokens.neverShownAgain")}</strong>{" "}
            {t("tokens.copyTokenPart2")}
          </p>
          <div class={s.tokenRevealValue}>
            <code>{createdToken.token}</code>
            <button
              class={s.copyBtn}
              onClick={() => copyToClipboard(createdToken.token, "__new__")}
            >
              <Copy size={12} /> {t("tokens.copy")}
            </button>
          </div>
          {tokenMessages["__new__"] && (
            <div
              class={
                tokenMessages["__new__"].type === "success" ? s.success : s.error
              }
              style={{ marginTop: "0.5rem" }}
            >
              {tokenMessages["__new__"].text}
            </div>
          )}
          <button
            class={s.btnSecondary}
            style={{ marginTop: "0.75rem" }}
            onClick={() => setCreatedToken(null)}
          >
            {t("tokens.dismiss")}
          </button>
        </div>
      )}

      <AccountTabs
        tabs={TABS.map((tab) => ({
          ...tab,
          label: t(tab.labelKey),
          badge:
            tab.id === "your-tokens" && tokens.length > 0
              ? tokens.length
              : undefined,
        }))}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel={t("tokens.sectionsAriaLabel")}
      />

      <AccountTabPanel>
        {activeTab === "your-tokens" && (
          <AccountSection
            icon={<Key size={18} />}
            title={t("tokens.yourTokensLabel")}
            subtitle={t("tokens.createdCount", { n: tokens.length })}
          >
            {tokensLoading && <div class={s.loading}>{t("tokens.loading")}</div>}
            {!tokensLoading && tokensError && (
              <EmptyState
                icon={<Key size={24} />}
                title={t("tokens.couldntLoad")}
                text={tokensError}
              >
                <button class={s.btnSecondary} onClick={fetchUserTokens}>
                  <RotateCcw size={14} /> {t("tokens.retry")}
                </button>
              </EmptyState>
            )}
            {!tokensLoading && !tokensError && tokens.length === 0 && (
              <EmptyState
                icon={<Key size={24} />}
                title={t("tokens.noTokens")}
                text={t("tokens.noTokensCreateHint")}
              />
            )}
            <div class={s.tokenGrid}>
              {tokens.map((token) => {
                const st = statusOf(token, t);
                return (
                  <div
                    key={token.id}
                    class={`${s.tokenCard} ${token.revoked ? s.tokenCardRevoked : ""}`}
                    {...clickable(() => setSelectedToken(token), token.name)}
                  >
                    <div class={s.tokenHeader}>
                      <h3 class={s.tokenName}>{token.name}</h3>
                      <span class={`${s.tokenTag} ${s[st.cls]}`}>
                        {st.label}
                      </span>
                    </div>
                    <div class={s.tokenInfo}>
                      <div class={s.tokenInfoRow}>
                        <span class={s.tokenInfoLabel}>{t("tokens.permissionsLabel")}</span>
                        <span class={s.tokenInfoValue}>
                          {token.permissions.length}
                        </span>
                      </div>
                      <div class={s.tokenInfoRow}>
                        <span class={s.tokenInfoLabel}>{t("tokens.createdLabel")}</span>
                        <span class={s.tokenInfoValue}>
                          {formatDate(token.created_at, t("tokens.never"))}
                        </span>
                      </div>
                      {token.origin && (
                        <div class={s.tokenInfoRow}>
                          <span class={s.tokenInfoLabel}>{t("tokens.origin")}:</span>
                          <span class={s.tokenInfoValue}>{token.origin}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccountSection>
        )}

        {activeTab === "create-token" && (
          <AccountSection
            icon={<PlusCircle size={18} />}
            title={t("tokens.createNewLabel")}
            subtitle={t("tokens.createSubLabel")}
          >
            <div class={s.formGroup}>
              <label for="new-token-name">
                {t("tokens.tokenName")}{" "}
                <span style={{ color: "var(--text-subtle)" }}>
                  {t("tokens.nameLengthHint")}
                </span>
              </label>
              <input
                type="text"
                id="new-token-name"
                class={s.formInput}
                placeholder={t("tokens.namePlaceholderExample")}
                value={createName}
                maxLength={50}
                onInput={(e: any) => setCreateName(e.target.value)}
              />
            </div>

            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label for="new-token-origin">{t("tokens.originApp")}</label>
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
                  {t("tokens.expiresInHours")}{" "}
                  <span style={{ color: "var(--text-subtle)" }}>
                    {t("tokens.expiresBlankNever")}
                  </span>
                </label>
                <input
                  type="number"
                  id="new-token-expires"
                  class={s.formInput}
                  placeholder={t("tokens.expiresPlaceholder")}
                  min={0}
                  max={8760}
                  value={createExpiresHrs}
                  onInput={(e: any) => setCreateExpiresHrs(e.target.value)}
                />
              </div>
            </div>

            <div class={s.formGroup}>
              <label for="new-token-websites">
                {t("tokens.websites")}{" "}
                <span style={{ color: "var(--text-subtle)" }}>
                  {t("tokens.websitesHint")}
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
              <label for="new-token-description">{t("tokens.description")}</label>
              <textarea
                id="new-token-description"
                class={s.formInput}
                placeholder={t("tokens.descriptionPlaceholder")}
                value={createDescription}
                onInput={(e: any) => setCreateDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Permission picker */}
            <div class={s.permPicker}>
              <div class={s.permPickerHeader}>
                <h5 class={s.permPickerTitle}>{t("tokens.permissions")}</h5>
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
                        {t("tokens.applyGroup")}
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
                    {t("tokens.clearAll")}
                  </button>
                </div>
              </div>
              <input
                type="text"
                class={s.formInput}
                placeholder={t("tokens.searchPermissions")}
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
                      <span>{t(cat)}</span>
                      <div class={s.permGroupActions}>
                        <button
                          class={s.permApplyBtn}
                          onClick={() =>
                            setCreatePerms(applyGroup(createPerms, visible))
                          }
                        >
                          {t("tokens.all")}
                        </button>
                        <button
                          class={s.permApplyBtn}
                          onClick={() =>
                            setCreatePerms(clearGroup(createPerms, visible))
                          }
                        >
                          {t("tokens.none")}
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
                              <span class={s.permBadge}>{t("tokens.forbidden")}</span>
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
                  {t("tokens.permsSelected", { count: createPerms.size })}
                  {createPerms.size === 0 && (
                    <span
                      style={{
                        color: "#fbbf24",
                        marginLeft: "0.5rem",
                      }}
                    >
                      {t("tokens.pickAtLeastOne")}
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
                  {t("tokens.cannotGranted")}
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
                {createSubmitting
                  ? t("tokens.creating")
                  : t("tokens.createSubToken")}
              </button>
            </div>
            {createMessage && (
              <div
                class={createMessageType === "success" ? s.success : s.error}
              >
                {createMessage}
              </div>
            )}
          </AccountSection>
        )}
      </AccountTabPanel>

      <a
        href="https://docs.rotur.dev/assorted-apis/tokens"
        target="_blank"
        rel="noopener noreferrer"
        class={s.docsLink}
      >
        <ExternalLink size={14} /> {t("tokens.apiDocs")}
      </a>

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
    </AccountPage>
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
  const { t } = useI18n();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const tokenId = token.id;
  const st = statusOf(token, t);
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
      <div
        ref={trapRef}
        tabIndex={-1}
        class={s.modalContainer}
        role="dialog"
        aria-modal="true"
        aria-label={t("tokens.tokenAriaLabel", { name: token.name })}
        onClick={(e) => e.stopPropagation()}
      >
        <button class={s.modalClose} onClick={onClose} aria-label={t("tokens.close")}>
          <X size={20} />
        </button>
        <div class={s.modalContent}>
          <div class={s.modalHeader}>
            <span class={s.modalType}>
              {t(st.label)} {t("tokens.subToken")}
            </span>
            <h2 class={s.modalName}>{token.name}</h2>
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
                <Copy size={12} /> {t("tokens.copy")}
              </button>
            </div>
            <div class={s.modalStatItem}>
              <Shield size={16} />
              <span>
                {t("tokens.permissionsCount", { count: token.permissions.length })}
              </span>
            </div>
            <div class={s.modalStatItem}>
              <Clock size={16} />
              <span>
                {t("tokens.createdAt")}{" "}
                {formatDate(token.created_at, t("tokens.never"))}
              </span>
            </div>
            {token.last_used_at && (
              <div class={s.modalStatItem}>
                <Clock size={16} />
                <span>
                  {t("tokens.lastUsed")}{" "}
                  {formatDate(token.last_used_at, t("tokens.never"))}
                </span>
              </div>
            )}
            {token.expires_at && (
              <div class={s.modalStatItem}>
                <Clock size={16} />
                <span>
                  {token.expires_at < Date.now()
                    ? `${t("tokens.expiredAt")} ${formatDate(token.expires_at, t("tokens.never"))}`
                    : `${t("tokens.expiresAt")} ${formatDate(token.expires_at, t("tokens.never"))}`}
                </span>
              </div>
            )}
            {token.origin && (
              <div class={s.modalStatItem}>
                <Globe size={16} />
                <span>{token.origin}</span>
              </div>
            )}
            {token.websites && token.websites.length > 0 && (
              <div class={s.modalStatItem}>
                <Globe size={16} />
                <span>{token.websites.map((w) => w).join(", ")}</span>
              </div>
            )}
            {token.description && (
              <div class={s.modalStatItem}>
                <FileText size={16} />
                <span>{token.description}</span>
              </div>
            )}
          </div>

          {/* Current Permissions */}
          <div class={s.modalSection}>
            <h4>{t("tokens.currentPermissions")}</h4>
            {token.permissions.length === 0 ? (
              <div
                style={{
                  color: "var(--text-subtle)",
                  fontSize: "0.8rem",
                }}
              >
                {t("tokens.noPerms")}
              </div>
            ) : (
              <div>
                {Object.entries(createdPerms).map(([cat, perms]) => (
                  <div key={cat} style={{ marginBottom: "0.5rem" }}>
                    <div class={s.permGroupLabel}>{t(cat)}</div>
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
              <h4>{t("tokens.editPermissions")}</h4>
              {editing === null || editing === undefined ? (
                <button class={s.btnSecondary} onClick={onStartEditPerms}>
                  <Shield size={14} /> {t("tokens.modifyPermissions")}
                </button>
              ) : (
                <div class={s.permPicker}>
                  <div class={s.permPickerHeader}>
                    <h5 class={s.permPickerTitle}>
                      {t("tokens.pickPermsForToken")}
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
                            {t("tokens.applyGroup")}
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
                        {t("tokens.clearAll")}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    class={s.formInput}
                    placeholder={t("tokens.searchPermissions")}
                    value={editSearch}
                    onInput={(e: any) => onSetEditSearch(e.target.value)}
                    style={{ marginBottom: "0.75rem" }}
                  />
                  {Object.entries(editGroups).map(([cat, perms]) => (
                    <div key={cat} class={s.permGroup}>
                      <div class={s.permGroupHeader}>
                        <span>{t(cat)}</span>
                        <div class={s.permGroupActions}>
                          <button
                            class={s.permApplyBtn}
                            onClick={() =>
                              onSetEditingPerms(applyGroup(editSet, perms))
                            }
                          >
                            {t("tokens.all")}
                          </button>
                          <button
                            class={s.permApplyBtn}
                            onClick={() =>
                              onSetEditingPerms(clearGroup(editSet, perms))
                            }
                          >
                            {t("tokens.none")}
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
                                <span class={s.permBadge}>{t("tokens.forbidden")}</span>
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
                      {t("tokens.permsSelected", { count: editSet.size })}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        class={s.btnSecondary}
                        onClick={onCancelEditPerms}
                      >
                        {t("tokens.cancel")}
                      </button>
                      <button
                        class={s.btnPrimary}
                        onClick={() => onSavePerms(editSet)}
                      >
                        {t("tokens.savePermsBtn")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Name / Description */}
          <div class={s.modalSection}>
            <h4>{t("tokens.settingsLabel")}</h4>
            <div class={s.modalEditGrid}>
              <div class={s.detailItem}>
                <h4>{t("tokens.name")}</h4>
                <input
                  ref={(el) => {
                    nameInputRefs.current[tokenId] = el;
                  }}
                  type="text"
                  class={s.formInput}
                  placeholder={t("tokens.setNamePlaceholder")}
                  defaultValue={token.name}
                  maxLength={50}
                />
                <button
                  class={s.btnSecondary}
                  onClick={() => onRename(tokenId)}
                  style={{ marginTop: "0.5rem" }}
                >
                  {t("tokens.update")}
                </button>
              </div>

              <div class={s.detailItem}>
                <h4>{t("tokens.description")}</h4>
                <textarea
                  ref={(el) => {
                    descInputRefs.current[tokenId] = el as any;
                  }}
                  class={s.formInput}
                  placeholder={t("tokens.descriptionPlaceholder")}
                  defaultValue={token.description || ""}
                  rows={2}
                />
                <button
                  class={s.btnSecondary}
                  onClick={() => onUpdateDescription(tokenId)}
                  style={{ marginTop: "0.5rem" }}
                >
                  {t("tokens.update")}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div class={s.modalFooter}>
            {!token.revoked && (
              <button class={s.btnSecondary} onClick={onRevoke}>
                <RotateCcw size={14} /> {t("tokens.revoke")}
              </button>
            )}
            <button class={s.btnDanger} onClick={onDelete}>
              <Trash2 size={14} /> {t("tokens.delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
