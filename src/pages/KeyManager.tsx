import { useState, useEffect, useRef } from "preact/hooks";
import {
  Key,
  CreditCard,
  PlusCircle,
  Copy,
  UserPlus,
  UserMinus,
  Trash2,
  RotateCcw,
  X,
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
import { plural } from "../lib/format";
import { clickable } from "../lib/clickable";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useConfirm } from "../components/ConfirmDialog";
import s from "./KeyManager.module.css";

const API_BASE_URL = "https://api.rotur.dev";

interface KeyData {
  key: string;
  name?: string;
  creator: string;
  price: number;
  type: string;
  total_income?: number;
  webhook?: string;
  users?: string[] | Record<string, any>;
  subscription?: {
    frequency: number;
    period: string;
    active?: boolean;
  };
}

type TabName = "your-keys" | "create-key";

const TABS: { id: TabName; label: string; icon: typeof Key }[] = [
  { id: "your-keys", label: "Your Keys", icon: Key },
  { id: "create-key", label: "Create Key", icon: PlusCircle },
];

function normalizeUsers(
  raw: string[] | Record<string, any> | null | undefined,
): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return Object.keys(raw);
  return [];
}

function normalizeUserEntries(
  raw: string[] | Record<string, any> | null | undefined,
): Array<{ username: string; data: any }> {
  if (raw == null) return [];
  if (Array.isArray(raw))
    return raw.map((username) => ({ username, data: {} }));
  if (typeof raw === "object") {
    return Object.entries(raw).map(([username, data]) => ({ username, data }));
  }
  return [];
}

function formatMsDate(value: unknown): string {
  if (typeof value !== "number") return "";
  const ms = value < 10_000_000_000 ? value * 1000 : value;
  return new Date(ms).toLocaleDateString();
}

function keyUserSubscriptionText(data: any): string {
  if (data?.cancel_at) {
    return `Cancelled - access until ${formatMsDate(data.cancel_at)}`;
  }
  if (data?.next_billing) {
    return `Next billing ${formatMsDate(data.next_billing)}`;
  }
  return "";
}

export function KeyManager() {
  const { user } = useAuth();
  const currentUser = user?.username || "";
  const [confirm, confirmDialog] = useConfirm();
  const [keys, setKeys] = useState<KeyData[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeyData | null>(null);
  const [keyMessages, setKeyMessages] = useState<
    Record<string, { text: string; type: "success" | "error" }>
  >({});

  const [activeTab, setActiveTab] = useState<TabName>("your-keys");

  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"regular" | "subscription">(
    "regular",
  );
  const [createPrice, setCreatePrice] = useState("");
  const [billingFrequency, setBillingFrequency] = useState("1");
  const [billingPeriod, setBillingPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [createMessage, setCreateMessage] = useState("");
  const [createMessageType, setCreateMessageType] = useState<
    "success" | "error"
  >("success");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<{
    name: string;
    key: string;
  } | null>(null);

  const priceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const webhookInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const addUserInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (currentUser) fetchUserKeys();
  }, [currentUser]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedKey) setSelectedKey(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedKey]);

  function setKeyMsg(keyId: string, text: string, type: "success" | "error") {
    setKeyMessages((prev) => ({ ...prev, [keyId]: { text, type } }));
    setTimeout(() => {
      setKeyMessages((prev) => {
        const next = { ...prev };
        delete next[keyId];
        return next;
      });
    }, 4000);
  }

  async function fetchUserKeys() {
    setKeysLoading(true);
    setKeysError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/mine?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mine = data.filter(
          (k: KeyData) =>
            k.creator && k.creator.toLowerCase() === currentUser.toLowerCase(),
        );
        setKeys(mine);
      } else {
        // Never let a failed load masquerade as "you have no keys".
        setKeysError(data?.error || "Something went wrong loading your keys.");
      }
    } catch {
      setKeysError("Network error — check your connection and try again.");
    }
    setKeysLoading(false);
  }

  async function createNewKey() {
    if (createSubmitting) return;
    const name = createName.trim();
    if (!name) {
      setCreateMessage("Key name is required");
      setCreateMessageType("error");
      return;
    }
    const price = createPrice ? Math.floor(parseInt(createPrice)) : 0;
    if (isNaN(price) || price < 0) {
      setCreateMessage("Price must be a non-negative number");
      setCreateMessageType("error");
      return;
    }

    let url = `${API_BASE_URL}/keys/create?auth=${encodeURIComponent(getToken() || "")}&name=${encodeURIComponent(name)}${price ? `&price=${price}` : ""}`;
    if (createType === "subscription") {
      const freq = Math.floor(parseInt(billingFrequency)) || 1;
      if (freq <= 0) {
        setCreateMessage("Frequency must be positive");
        setCreateMessageType("error");
        return;
      }
      url += `&subscription=true&frequency=${freq}&period=${billingPeriod}`;
    }

    setCreateSubmitting(true);
    setCreateMessage("");
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        // The key is only ever returned once — surface it in a panel the user
        // dismisses, never a message that expires on its own.
        setCreatedKey({ name, key: data.key });
        setCreateName("");
        setCreatePrice("");
        setCreateType("regular");
        fetchUserKeys();
      } else {
        setCreateMessage(data.error || "Failed to create key");
        setCreateMessageType("error");
      }
    } catch {
      setCreateMessage("Network error occurred");
      setCreateMessageType("error");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function updateKeyPrice(keyId: string) {
    const input = priceInputRefs.current[keyId];
    const price = parseInt(input?.value || "0");
    if (isNaN(price) || price < 0) {
      setKeyMsg(keyId, "Invalid price", "error");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/update/${keyId}?auth=${encodeURIComponent(getToken() || "")}&key=price&data=${encodeURIComponent(price)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setKeyMsg(keyId, `Price updated to ${price}`, "success");
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to update price", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function updateKeyName(keyId: string) {
    const input = nameInputRefs.current[keyId];
    const name = (input?.value || "").trim();
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/name/${keyId}?auth=${encodeURIComponent(getToken() || "")}&name=${encodeURIComponent(name)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setKeyMsg(keyId, "Name updated", "success");
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to update name", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function updateKeyWebhook(keyId: string) {
    const input = webhookInputRefs.current[keyId];
    const webhook = (input?.value || "").trim();
    if (webhook && !webhook.match(/^https?:\/\/.+/)) {
      setKeyMsg(keyId, "URL must start with http:// or https://", "error");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/update/${keyId}?auth=${encodeURIComponent(getToken() || "")}&key=webhook&data=${encodeURIComponent(webhook)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setKeyMsg(
          keyId,
          webhook ? "Webhook updated" : "Webhook removed",
          "success",
        );
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to update webhook", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function revokeKey(keyId: string) {
    const ok = await confirm({
      title: "Revoke this key?",
      message: "All other users will be removed. This cannot be undone.",
      confirmLabel: "Revoke key",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/revoke/${keyId}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const data = await res.json();
      if (res.ok) {
        setKeyMsg(keyId, "Key revoked. Other users removed.", "success");
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to revoke key", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function deleteKey(keyId: string) {
    const ok = await confirm({
      title: "Delete this key permanently?",
      message: "This cannot be undone.",
      confirmLabel: "Delete key",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/delete/${keyId}?auth=${encodeURIComponent(getToken() || "")}`,
      );
      const data = await res.json();
      if (res.ok) {
        setSelectedKey(null);
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to delete key", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function addUserToKey(keyId: string) {
    const input = addUserInputRefs.current[keyId];
    const username = (input?.value || "").trim().toLowerCase();
    if (!username) {
      setKeyMsg(keyId, "Enter a username", "error");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/admin_add/${keyId}?auth=${encodeURIComponent(getToken() || "")}&username=${encodeURIComponent(username)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setKeyMsg(keyId, `Added ${username}`, "success");
        if (input) input.value = "";
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to add user", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function removeUserFromKey(keyId: string, username: string) {
    const ok = await confirm({
      title: `Remove ${username} from this key?`,
      confirmLabel: "Remove user",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/keys/admin_remove/${keyId}?auth=${encodeURIComponent(getToken() || "")}&username=${encodeURIComponent(username)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setKeyMsg(keyId, `Removed ${username}`, "success");
        fetchUserKeys();
      } else {
        setKeyMsg(keyId, data.error || "Failed to remove user", "error");
      }
    } catch {
      setKeyMsg(keyId, "Network error", "error");
    }
  }

  async function copyToClipboard(text: string, keyId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setKeyMsg(keyId, "Copied!", "success");
      setTimeout(
        () =>
          setKeyMessages((prev) => {
            const next = { ...prev };
            delete next[keyId];
            return next;
          }),
        2000,
      );
    } catch {
      setKeyMsg(keyId, "Failed to copy", "error");
    }
  }

  if (!currentUser) {
    return (
      <AuthRequired
        icon={<Key size={28} />}
        title="Sign in to manage keys"
        text="Sign in to create and manage API keys for authentication and monetization."
        href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/key-manager")}`}
      />
    );
  }

  return (
    <AccountPage
      title="Key Manager"
      subtitle="Create and manage API keys for authentication and monetization"
    >
      {confirmDialog}
      {/* Newly created key reveal */}
      {createdKey && (
        <div class={s.keyReveal}>
          <div class={s.keyRevealHeader}>
            <Key size={16} /> Key created: {createdKey.name}
          </div>
          <p class={s.keyRevealText}>
            Copy this key now. <strong>It will never be shown again.</strong>{" "}
            Store it somewhere safe.
          </p>
          <div class={s.keyRevealValue}>
            <code>{createdKey.key}</code>
            <button
              class={s.copyBtn}
              onClick={() => copyToClipboard(createdKey.key, "__new__")}
            >
              <Copy size={12} /> Copy
            </button>
          </div>
          {keyMessages["__new__"] && (
            <div
              class={
                keyMessages["__new__"].type === "success" ? s.success : s.error
              }
              style={{ marginTop: "0.5rem" }}
            >
              {keyMessages["__new__"].text}
            </div>
          )}
          <button
            class={s.btnSecondary}
            style={{ marginTop: "0.75rem" }}
            onClick={() => setCreatedKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <AccountTabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Key sections"
      />

      <AccountTabPanel>
        {activeTab === "your-keys" && (
          <AccountSection
            icon={<Key size={18} />}
            title="Your Keys"
            subtitle={`${keys.length} created`}
          >
            {keysLoading && <div class={s.loading}>Loading your keys…</div>}
            {!keysLoading && keysError && (
              <EmptyState
                icon={<Key size={24} />}
                title="Couldn't load your keys"
                text={keysError}
              >
                <button class={s.btnSecondary} onClick={fetchUserKeys}>
                  <RotateCcw size={14} /> Retry
                </button>
              </EmptyState>
            )}
            {!keysLoading && !keysError && keys.length === 0 && (
              <EmptyState
                icon={<Key size={24} />}
                title="No keys yet"
                text="Create your first key in the Create Key tab."
              />
            )}
            <div class={s.keyGrid}>
              {keys.map((key) => {
                const keyId = key.key;
                const isSubscription = key.type === "subscription";
                const users = normalizeUsers(key.users);

                return (
                  <div
                    key={keyId}
                    class={s.keyCard}
                    {...clickable(() => setSelectedKey(key), key.name || keyId)}
                  >
                    <div class={s.keyHeader}>
                      <h3 class={s.keyName}>
                        {key.name || `${keyId.substring(0, 8)}…`}
                      </h3>
                      <span
                        class={`${s.keyTag} ${isSubscription ? s.keyTagSubscription : s.keyTagRegular}`}
                      >
                        {isSubscription ? "Subscription" : "Regular"}
                      </span>
                    </div>
                    <div class={s.keyInfo}>
                      <div class={s.keyInfoRow}>
                        <span class={s.keyInfoLabel}>Price:</span>
                        <span class={s.keyInfoValue}>
                          {key.price || 0} credits
                        </span>
                      </div>
                      <div class={s.keyInfoRow}>
                        <span class={s.keyInfoLabel}>Users:</span>
                        <span class={s.keyInfoValue}>{users.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccountSection>
        )}

        {activeTab === "create-key" && (
          <AccountSection
            icon={<CreditCard size={18} />}
            title="Create New Key"
            subtitle="Set up a new API key"
          >
            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label for="new-key-name">Key Name</label>
                <input
                  type="text"
                  id="new-key-name"
                  class={s.formInput}
                  placeholder="Enter a descriptive name"
                  value={createName}
                  onInput={(e) =>
                    setCreateName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class={s.formGroup}>
                <label for="new-key-price">Price (credits)</label>
                <input
                  type="number"
                  id="new-key-price"
                  class={s.formInput}
                  placeholder="0"
                  min={0}
                  value={createPrice}
                  onInput={(e) =>
                    setCreatePrice((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>

            <div class={s.formGroup}>
              <label for="new-key-type">Key Type</label>
              <select
                id="new-key-type"
                class={s.formInput}
                value={createType}
                onChange={(e) =>
                  setCreateType((e.target as HTMLSelectElement).value as any)
                }
              >
                <option value="regular">Regular Key</option>
                <option value="subscription">Subscription Key</option>
              </select>
            </div>

            {createType === "subscription" && (
              <div class={s.formRow}>
                <div class={s.formGroup}>
                  <label for="billing-frequency">Bill every</label>
                  <input
                    type="number"
                    id="billing-frequency"
                    class={s.formInput}
                    value={billingFrequency}
                    min={1}
                    onInput={(e) =>
                      setBillingFrequency((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div class={s.formGroup}>
                  <label for="billing-period">Period</label>
                  <select
                    id="billing-period"
                    class={s.formInput}
                    value={billingPeriod}
                    onChange={(e) =>
                      setBillingPeriod(
                        (e.target as HTMLSelectElement).value as any,
                      )
                    }
                  >
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                  </select>
                </div>
              </div>
            )}

            <div class={s.formGroup}>
              <button
                class={s.btnPrimary}
                onClick={createNewKey}
                disabled={createSubmitting}
              >
                <PlusCircle size={14} />{" "}
                {createSubmitting ? "Creating…" : "Create Key"}
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

      {selectedKey && (
        <KeyDetailModal
          keyData={selectedKey}
          currentUser={currentUser}
          message={keyMessages[selectedKey.key]}
          onClose={() => setSelectedKey(null)}
          onCopy={copyToClipboard}
          onUpdateName={updateKeyName}
          onUpdatePrice={updateKeyPrice}
          onUpdateWebhook={updateKeyWebhook}
          onAddUser={addUserToKey}
          onRemoveUser={removeUserFromKey}
          onRevoke={revokeKey}
          onDelete={deleteKey}
          nameInputRefs={nameInputRefs}
          priceInputRefs={priceInputRefs}
          webhookInputRefs={webhookInputRefs}
          addUserInputRefs={addUserInputRefs}
        />
      )}
    </AccountPage>
  );
}

function KeyDetailModal({
  keyData,
  currentUser,
  message,
  onClose,
  onCopy,
  onUpdateName,
  onUpdatePrice,
  onUpdateWebhook,
  onAddUser,
  onRemoveUser,
  onRevoke,
  onDelete,
  nameInputRefs,
  priceInputRefs,
  webhookInputRefs,
  addUserInputRefs,
}: {
  keyData: KeyData;
  currentUser: string;
  message: { text: string; type: "success" | "error" } | undefined;
  onClose: () => void;
  onCopy: (text: string, keyId: string) => void;
  onUpdateName: (keyId: string) => void;
  onUpdatePrice: (keyId: string) => void;
  onUpdateWebhook: (keyId: string) => void;
  onAddUser: (keyId: string) => void;
  onRemoveUser: (keyId: string, username: string) => void;
  onRevoke: (keyId: string) => void;
  onDelete: (keyId: string) => void;
  nameInputRefs: { current: Record<string, HTMLInputElement | null> };
  priceInputRefs: { current: Record<string, HTMLInputElement | null> };
  webhookInputRefs: { current: Record<string, HTMLInputElement | null> };
  addUserInputRefs: { current: Record<string, HTMLInputElement | null> };
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const keyId = keyData.key;
  const isSubscription = keyData.type === "subscription";
  const sub = keyData.subscription;
  const users = normalizeUserEntries(keyData.users);

  return (
    <div class={s.modal} onClick={onClose}>
      <div class={s.modalOverlay} />
      <div
        ref={trapRef}
        tabIndex={-1}
        class={s.modalContainer}
        role="dialog"
        aria-modal="true"
        aria-label={`Key: ${keyData.name || keyId}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button class={s.modalClose} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <div class={s.modalContent}>
          <div class={s.modalHeader}>
            <span class={s.modalType}>
              {isSubscription ? "Subscription" : "Regular"}
            </span>
            <h2 class={s.modalName}>
              {keyData.name || `${keyId.substring(0, 8)}…`}
            </h2>
          </div>

          {message && (
            <div class={message.type === "success" ? s.success : s.error}>
              {message.text}
            </div>
          )}

          <div class={s.modalStats}>
            <div class={s.modalStatItem}>
              <Key size={16} />
              <span class={s.keyIdDisplay}>{keyId}</span>
              <button class={s.copyBtn} onClick={() => onCopy(keyId, keyId)}>
                <Copy size={12} /> Copy
              </button>
            </div>
            <div class={s.modalStatItem}>
              <CreditCard size={16} />
              <span>{keyData.price || 0} credits</span>
            </div>
            <div class={s.modalStatItem}>
              <UserPlus size={16} />
              <span>
                {users.length} authorized {plural(users.length, "user")}
              </span>
            </div>
            {isSubscription && sub && (
              <div class={s.modalStatItem}>
                <span
                  style={{
                    color: sub.active !== false ? "#6bff9f" : "#ff6b6b",
                    fontWeight: 600,
                  }}
                >
                  {sub.active !== false ? "Active" : "Inactive"}
                  {" · "}
                  Every {sub.frequency} {plural(sub.frequency, sub.period)}
                </span>
              </div>
            )}
          </div>

          <div class={s.modalEditGrid}>
            <div class={s.detailItem}>
              <h4>Name</h4>
              <input
                ref={(el) => {
                  nameInputRefs.current[keyId] = el;
                }}
                type="text"
                class={s.formInput}
                placeholder="Set key name"
                defaultValue={keyData.name || ""}
              />
              <button
                class={s.btnSecondary}
                onClick={() => onUpdateName(keyId)}
                style={{ marginTop: "0.5rem" }}
              >
                Update
              </button>
            </div>

            <div class={s.detailItem}>
              <h4>Price</h4>
              <input
                ref={(el) => {
                  priceInputRefs.current[keyId] = el;
                }}
                type="number"
                class={s.formInput}
                min={0}
                defaultValue={keyData.price || 0}
              />
              <button
                class={s.btnSecondary}
                onClick={() => onUpdatePrice(keyId)}
                style={{ marginTop: "0.5rem" }}
              >
                Update
              </button>
            </div>

            <div class={s.detailItem}>
              <h4>Webhook</h4>
              <input
                ref={(el) => {
                  webhookInputRefs.current[keyId] = el;
                }}
                type="url"
                class={s.formInput}
                placeholder="https://example.com/webhook"
                defaultValue={keyData.webhook || ""}
              />
              <button
                class={s.btnSecondary}
                onClick={() => onUpdateWebhook(keyId)}
                style={{ marginTop: "0.5rem" }}
              >
                Update
              </button>
            </div>
          </div>

          <div class={s.modalSection}>
            <h4>Authorized Users ({users.length})</h4>
            <div class={s.userList}>
              {users.length === 0 ? (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                  }}
                >
                  No users have access to this key.
                </div>
              ) : (
                users.map((u) => (
                  <div key={u.username} class={s.userItem}>
                    <span class={s.userName}>
                      {u.username}
                      {isSubscription && keyUserSubscriptionText(u.data) && (
                        <small class={s.userMeta}>
                          {keyUserSubscriptionText(u.data)}
                        </small>
                      )}
                    </span>
                    {u.username.toLowerCase() !== currentUser.toLowerCase() && (
                      <button
                        class={`${s.iconBtn} ${s.iconBtnDanger}`}
                        onClick={() =>
                          onRemoveUser(keyId, u.username.toLowerCase())
                        }
                        title="Remove user"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div class={s.addUserRow}>
              <input
                ref={(el) => {
                  addUserInputRefs.current[keyId] = el;
                }}
                type="text"
                class={s.formInput}
                placeholder="Add username"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAddUser(keyId);
                }}
              />
              <button class={s.btnPrimary} onClick={() => onAddUser(keyId)}>
                <UserPlus size={14} /> Add
              </button>
            </div>
          </div>

          <div class={s.modalFooter}>
            <button class={s.btnSecondary} onClick={() => onRevoke(keyId)}>
              <RotateCcw size={14} /> Revoke Key
            </button>
            <button class={s.btnDanger} onClick={() => onDelete(keyId)}>
              <Trash2 size={14} /> Delete Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
