import { useState, useEffect, useMemo, useCallback } from "preact/hooks";
import {
  Users,
  CreditCard,
  Receipt,
  UserPlus,
  Check,
  X,
  UserMinus,
  LogIn,
  LogOut,
  Key,
  ArrowUpRight,
  Sparkles,
  Bell,
  Shield,
  LayoutGrid,
  StickyNote,
  Trash2,
  Heart,
  Ban,
  ShieldOff,
  Info,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-preact";
import {
  AccountPage,
  AccountSection,
  AccountTabPanel,
  AccountTabs,
  AuthRequired,
  EmptyState,
} from "../../components/AccountPage";
import { ProfileCard } from "../../components/ProfileCard";
import { UserAvatar } from "../../components/UserAvatar";
import {
  useAuth,
  useBenefits,
  type Benefits,
  type Transaction,
  captureTokenFromUrl,
} from "../../lib/auth";
import {
  computeTransactionStats,
  describeTransaction,
  isTransactionIncome,
} from "../../lib/transactions";
import s from "./Me.module.css";

const API = "https://api.rotur.dev";

interface KeyRecord {
  key: string;
  name?: string;
  creator: string;
  price: number;
  type: string;
  total_income?: number;
  users?: string[] | Record<string, any>;
  subscription?: { next_billing: number; frequency: number; period: string };
}

function keyUserData(key: KeyRecord, username?: string): any {
  if (!username || !key.users || Array.isArray(key.users)) return null;
  return key.users[username] || key.users[username.toLowerCase()] || null;
}

function formatBillingDate(value: unknown): string {
  if (typeof value !== "number") return "";
  const ms = value < 10_000_000_000 ? value * 1000 : value;
  return new Date(ms).toLocaleDateString();
}

interface GroupProductSubscription {
  id: string;
  group_tag: string;
  product_id: string;
  product_name: string;
  username: string;
  role_id: string;
  role_name: string;
  started_at: number;
  next_billing: number;
  cancel_at?: number;
  active: boolean;
}

type MainTab = "profile" | "social" | "billing" | "security";

const MAIN_TABS: { id: MainTab; label: string; icon: typeof Users }[] = [
  { id: "profile", label: "Profile", icon: LayoutGrid },
  { id: "social", label: "Social", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

export function Me() {
  const { user, isLoggedIn, token, reload, logout } = useAuth();
  const { benefits } = useBenefits();
  const [activeTab, setActiveTab] = useState<MainTab>("profile");
  const [friendsTab, setFriendsTab] = useState<"all" | "requests">("all");
  const [friendInput, setFriendInput] = useState("");
  const [keys, setKeys] = useState<KeyRecord[] | null>(null);
  const [groupSubs, setGroupSubs] = useState<GroupProductSubscription[]>([]);

  useEffect(() => {
    captureTokenFromUrl();
    const hash = window.location.hash.replace(/^#/, "");
    if (
      hash === "profile" ||
      hash === "social" ||
      hash === "billing" ||
      hash === "security"
    ) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash.replace(/^#/, "") !== activeTab) {
      history.replaceState(null, "", `#${activeTab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/keys/mine?auth=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setKeys(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.username, token]);

  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/groups/products/subscriptions/mine?auth=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data)) setGroupSubs(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.username, token]);

  const friends = useMemo(
    () => (user?.["sys.friends"] ?? []) as string[],
    [user],
  );
  const requests = useMemo(
    () => (user?.["sys.requests"] ?? []) as string[],
    [user],
  );
  const blocked = useMemo(
    () => (user?.["sys.blocked"] ?? []) as string[],
    [user],
  );
  const transactions = useMemo(
    () => (user?.["sys.transactions"] ?? []) as Transaction[],
    [user],
  );

  const txStats = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 2592000000;
    const recent = transactions.filter((t) => t.time >= thirtyDaysAgo);
    return computeTransactionStats(recent);
  }, [transactions]);

  const recentTx = useMemo(
    () =>
      transactions
        .filter((t) => t.type !== "key_sale")
        .sort((a, b) => b.time - a.time)
        .slice(0, 5),
    [transactions],
  );

  const subscriptions = useMemo(() => {
    if (!keys || !user?.username)
      return { paying: [] as KeyRecord[], created: [] as KeyRecord[] };
    const me = user.username.toLowerCase();
    return {
      paying: keys.filter(
        (k) => k.creator?.toLowerCase() !== me && k.subscription,
      ),
      created: keys.filter(
        (k) => k.creator?.toLowerCase() === me && k.type === "subscription",
      ),
    };
  }, [keys, user]);

  const sendFriendRequest = useCallback(async () => {
    const username = friendInput.trim();
    if (!username || !token) return;
    setFriendInput("");
    try {
      await fetch(
        `${API}/friends/request/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
    } catch {
      /* ignore */
    }
  }, [friendInput, token]);

  const friendAction = useCallback(
    async (action: "accept" | "reject" | "remove", username: string) => {
      if (!token) return;
      try {
        await fetch(
          `${API}/friends/${action}/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        await reload();
      } catch {
        /* ignore */
      }
    },
    [token, reload],
  );

  const cancelSubscription = useCallback(
    async (keyId: string) => {
      if (!token) return;
      if (!confirm("Cancel this subscription?")) return;
      try {
        await fetch(
          `${API}/keys/cancel/${encodeURIComponent(keyId)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        await reload();
      } catch {
        /* ignore */
      }
    },
    [token, reload],
  );

  const cancelGroupSubscription = useCallback(
    async (groupTag: string, productId: string) => {
      if (!token) return;
      if (!confirm("Cancel this group subscription?")) return;
      try {
        const res = await fetch(
          `${API}/groups/${encodeURIComponent(groupTag)}/products/${encodeURIComponent(productId)}/cancel?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        if (res.ok) {
          const refreshed = await fetch(
            `${API}/groups/products/subscriptions/mine?auth=${encodeURIComponent(token)}`,
          );
          const data = await refreshed.json();
          if (refreshed.ok && Array.isArray(data)) setGroupSubs(data);
        }
        await reload();
      } catch {
        /* ignore */
      }
    },
    [token, reload],
  );

  const unblockUser = useCallback(
    async (username: string) => {
      if (!token) return;
      try {
        const res = await fetch(
          `${API}/me/unblock/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        if (res.ok) await reload();
      } catch {
        /* ignore */
      }
    },
    [token, reload],
  );

  if (!isLoggedIn) {
    return (
      <AuthRequired
        icon={<LogIn size={28} />}
        title="Sign in to view your account"
        text="You need to be signed in to view your Rotur account dashboard."
        href={`/auth?return_to=${encodeURIComponent(`${window.location.origin}/me`)}`}
      />
    );
  }

  if (!user) return null;

  return (
    <AccountPage>
      <ProfileCard
        user={user}
        editable
        showActions={false}
        isSelf
        benefits={benefits?.benefits ?? null}
        onEdit={async () => {
          await reload();
        }}
      />

      <AccountTabs
        tabs={MAIN_TABS}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Account sections"
        actions={
          <button class={s.logoutBtn} onClick={logout} title="Sign out">
            <LogOut size={14} /> Logout
          </button>
        }
      />

      <AccountTabPanel>
        {activeTab === "profile" && (
          <CosmeticsSection
            activeOverlay={user["sys.overlay"] || ""}
            benefits={benefits?.benefits ?? null}
          />
        )}

        {activeTab === "social" && (
          <>
            <FriendsSection
              friends={friends}
              requests={requests}
              tab={friendsTab}
              setTab={setFriendsTab}
              input={friendInput}
              setInput={setFriendInput}
              onSend={sendFriendRequest}
              onAction={friendAction}
            />
            <BlockedSection blocked={blocked} onUnblock={unblockUser} />
            <StandingSection
              standing={user?.["sys.standing"] || "good"}
              recoverAt={user?.["sys.standing_recover_at"] || 0}
              history={user?.["sys.standing_history"] || []}
            />
            <NotesSection
              notes={user?.["sys.notes"] || {}}
              hasNotes={!!benefits?.benefits?.profile_notes}
              onNoteUpdate={async (username, note) => {
                if (!token) return;
                try {
                  if (note) {
                    await fetch(
                      `${API}/me/note/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}&note=${encodeURIComponent(note)}`,
                      { method: "POST" },
                    );
                  } else {
                    await fetch(
                      `${API}/me/note/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
                      { method: "DELETE" },
                    );
                  }
                  await reload();
                } catch {
                  /* ignore */
                }
              }}
            />
          </>
        )}

        {activeTab === "billing" && (
          <>
            <TransactionsSection
              credits={user["sys.currency"] ?? 0}
              stats={txStats}
              recent={recentTx}
            />
            <SubscriptionsSection
              paying={subscriptions.paying}
              created={subscriptions.created}
              groupSubs={groupSubs}
              username={user.username}
              onCancel={cancelSubscription}
              onCancelGroup={cancelGroupSubscription}
            />
          </>
        )}

        {activeTab === "security" && (
          <>
            <ChangePasswordSection />
            <SubTokensSection />
            <NotificationsSection />
          </>
        )}
      </AccountTabPanel>
    </AccountPage>
  );
}

interface FriendsSectionProps {
  friends: string[];
  requests: string[];
  tab: "all" | "requests";
  setTab: (t: "all" | "requests") => void;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onAction: (action: "accept" | "reject" | "remove", username: string) => void;
}

function FriendsSection({
  friends,
  requests,
  tab,
  setTab,
  input,
  setInput,
  onSend,
  onAction,
}: FriendsSectionProps) {
  const list = tab === "all" ? friends : requests;
  return (
    <AccountSection
      icon={<Users size={18} />}
      title="Friends"
      subtitle={`${friends.length} connected • ${requests.length} pending`}
    >
      <div class={s.addFriendForm}>
        <input
          type="text"
          class={s.addFriendInput}
          placeholder="Add a friend by username..."
          value={input}
          onInput={(e: any) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <button class={s.btnPrimary} onClick={onSend} disabled={!input.trim()}>
          <UserPlus size={14} /> Add
        </button>
      </div>

      <div class={s.friendsTabs}>
        <button
          class={`${s.friendsTab} ${tab === "all" ? s.active : ""}`}
          onClick={() => setTab("all")}
        >
          All <span class={s.friendsTabCount}>{friends.length}</span>
        </button>
        <button
          class={`${s.friendsTab} ${tab === "requests" ? s.active : ""}`}
          onClick={() => setTab("requests")}
        >
          Requests <span class={s.friendsTabCount}>{requests.length}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "all" ? <Users size={24} /> : <UserPlus size={24} />}
          title={tab === "all" ? "No friends yet" : "No pending requests"}
          text={
            tab === "all"
              ? "Add a friend by their username to get started."
              : "Friend requests will appear here."
          }
        />
      ) : (
        <div class={s.friendGrid}>
          {list.map((username) => (
            <div key={username} class={s.friendCard}>
              <a href={`/profile/${username}`} style={{ display: "contents" }}>
                <UserAvatar username={username} className={s.friendAvatar} />
                <div class={s.friendInfo}>
                  <div class={s.friendName}>@{username}</div>
                  <div class={s.friendHandle}>
                    {tab === "all" ? "Connected" : "Wants to connect"}
                  </div>
                </div>
              </a>
              <div class={s.friendActions}>
                {tab === "all" ? (
                  <button
                    class={`${s.iconBtn} ${s.iconBtnDanger}`}
                    onClick={() => onAction("remove", username)}
                    title="Remove friend"
                    aria-label="Remove friend"
                  >
                    <UserMinus size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      class={`${s.iconBtn} ${s.iconBtnSuccess}`}
                      onClick={() => onAction("accept", username)}
                      title="Accept"
                      aria-label="Accept request"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      class={`${s.iconBtn} ${s.iconBtnDanger}`}
                      onClick={() => onAction("reject", username)}
                      title="Reject"
                      aria-label="Reject request"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountSection>
  );
}

interface SubscriptionsSectionProps {
  paying: KeyRecord[];
  created: KeyRecord[];
  groupSubs: GroupProductSubscription[];
  username: string;
  onCancel: (keyId: string) => void;
  onCancelGroup: (groupTag: string, productId: string) => void;
}

function SubscriptionsSection({
  paying,
  created,
  groupSubs,
  username,
  onCancel,
  onCancelGroup,
}: SubscriptionsSectionProps) {
  return (
    <AccountSection
      icon={<CreditCard size={18} />}
      title="Subscriptions"
      subtitle={`${paying.length + groupSubs.length} active • ${
        created.length
      } created`}
      actions={
        <a href="/key-manager" class={s.linkBtn}>
          <Key size={14} /> Manage Keys
        </a>
      }
    >
      {paying.length > 0 && (
        <>
          <div class={s.sectionDivider}>Key Subscriptions</div>
          {paying.map((sub) => {
            const mine = keyUserData(sub, username);
            return (
              <div key={sub.key} class={s.subCard}>
                <a
                  href={`/profile/${sub.creator}`}
                  style={{ display: "contents" }}
                >
                  <UserAvatar username={sub.creator} className={s.subAvatar} />
                  <div class={s.subInfo}>
                    <div class={s.subName}>{sub.name}</div>
                    <div class={s.subMeta}>
                      by @{sub.creator} • {sub.price} credits
                      {mine?.cancel_at
                        ? ` • Active until ${formatBillingDate(mine.cancel_at)}`
                        : mine?.next_billing
                          ? ` • Next ${formatBillingDate(mine.next_billing)}`
                          : ""}
                    </div>
                  </div>
                </a>
                {mine?.cancel_at ? (
                  <span class={s.statusPill}>
                    Cancels {formatBillingDate(mine.cancel_at)}
                  </span>
                ) : (
                  <button
                    class={`${s.subBtn} ${s.subBtnDanger}`}
                    onClick={() => onCancel(sub.key)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {groupSubs.length > 0 && (
        <>
          <div class={s.sectionDivider}>Group Role Subscriptions</div>
          {groupSubs.map((sub) => {
            const paidThrough = sub.cancel_at || sub.next_billing;
            return (
              <div key={sub.id} class={s.subCard}>
                <div class={s.subInfo}>
                  <div class={s.subName}>{sub.product_name}</div>
                  <div class={s.subMeta}>
                    @{sub.group_tag} • {sub.role_name || "Role"}
                    {sub.cancel_at
                      ? ` • Cancels ${formatBillingDate(paidThrough)}`
                      : ` • Next ${formatBillingDate(sub.next_billing)}`}
                  </div>
                </div>
                {sub.cancel_at ? (
                  <span class={s.statusPill}>
                    Active until {formatBillingDate(paidThrough)}
                  </span>
                ) : (
                  <button
                    class={`${s.subBtn} ${s.subBtnDanger}`}
                    onClick={() => onCancelGroup(sub.group_tag, sub.product_id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {created.length > 0 && (
        <>
          <div class={s.sectionDivider}>Your Services</div>
          {created.map((sub) => {
            const subCount = Array.isArray(sub.users)
              ? sub.users.length
              : Object.keys(sub.users || {}).length;
            return (
              <div key={sub.key} class={s.subCard}>
                <UserAvatar username={sub.creator} className={s.subAvatar} />
                <div class={s.subInfo}>
                  <div class={s.subName}>{sub.name}</div>
                  <div class={s.subMeta}>
                    {sub.price} credits/mo • {subCount} subscribers
                    {sub.total_income ? ` • ${sub.total_income} earned` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {paying.length === 0 &&
        created.length === 0 &&
        groupSubs.length === 0 && (
          <EmptyState
            icon={<CreditCard size={24} />}
            title="No subscriptions"
            text="Create or subscribe to services to see them here."
          />
        )}
    </AccountSection>
  );
}

interface TransactionsSectionProps {
  credits: number;
  stats: { totalIncome: number; totalExpense: number; net: number };
  recent: Transaction[];
}

function TransactionsSection({
  credits,
  stats,
  recent,
}: TransactionsSectionProps) {
  return (
    <AccountSection
      icon={<Receipt size={18} />}
      title="Transactions"
      subtitle="Last 30 days"
      actions={
        <a href="/me/transactions" class={s.linkBtn}>
          <ArrowUpRight size={14} /> View all
        </a>
      }
    >
      <div class={s.txSummary}>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Balance</div>
          <div class={s.summaryValue}>{credits.toLocaleString()}</div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Income</div>
          <div class={`${s.summaryValue} ${s.income}`}>
            +
            {stats.totalIncome.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Spent</div>
          <div class={`${s.summaryValue} ${s.expense}`}>
            -
            {stats.totalExpense.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>Net</div>
          <div
            class={`${s.summaryValue} ${stats.net >= 0 ? s.income : s.expense}`}
          >
            {stats.net >= 0 ? "+" : ""}
            {stats.net.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {recent.length > 0 ? (
        <div class={s.txList}>
          {recent.map((tx, i) => {
            const isPos = isTransactionIncome(tx);
            const title = describeTransaction(tx);
            return (
              <div key={i} class={s.txItem}>
                <div class={`${s.txIcon} ${isPos ? s.income : s.expense}`}>
                  {isPos ? "+" : "-"}
                </div>
                <div class={s.txInfo}>
                  <div class={s.txTitle}>{title}</div>
                  <div class={s.txMeta}>
                    {new Date(tx.time).toLocaleDateString()}
                  </div>
                </div>
                <div class={`${s.txAmount} ${isPos ? s.income : s.expense}`}>
                  {isPos ? "+" : "-"}
                  {Math.abs(tx.amount).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt size={24} />}
          title="No transactions yet"
          text="Your transaction history will appear here."
        />
      )}
    </AccountSection>
  );
}

function NotificationsSection() {
  return (
    <AccountSection
      icon={<Bell size={18} />}
      title="Notifications"
      subtitle="Manage devices, allowed senders, and delivery log"
      actions={
        <a href="/notifications" class={s.linkBtn}>
          <ArrowUpRight size={14} /> Open
        </a>
      }
    >
      <EmptyState
        icon={<Bell size={24} />}
        title="Notification settings"
        text="Register devices, choose which sources can notify you, and review your recent delivery history."
      >
        <a
          href="/notifications"
          class={s.btnPrimary}
          style={{ marginTop: "0.75rem" }}
        >
          <Bell size={14} /> View notifications
        </a>
      </EmptyState>
    </AccountSection>
  );
}

function ChangePasswordSection() {
  const { token, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const onSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      setMsg(null);
      if (next.length < 8) {
        setMsg({
          kind: "err",
          text: "New password must be at least 8 characters",
        });
        return;
      }
      if (next !== confirm) {
        setMsg({ kind: "err", text: "New passwords do not match" });
        return;
      }
      if (current === next) {
        setMsg({
          kind: "err",
          text: "New password must be different from the current one",
        });
        return;
      }
      if (!token) {
        setMsg({
          kind: "err",
          text: "Please sign in again to change your password",
        });
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(
          `${API}/me/change_password?auth=${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              current_password: current,
              new_password: next,
            }),
          },
        );
        const data = await res.json().catch(() => ({}) as any);
        if (!res.ok) {
          setMsg({
            kind: "err",
            text: data.error || "Failed to change password",
          });
          setBusy(false);
          return;
        }
        setMsg({
          kind: "ok",
          text: "Password updated. Please sign in again.",
        });
        setCurrent("");
        setNext("");
        setConfirm("");
        setTimeout(() => {
          logout();
        }, 1500);
      } catch {
        setMsg({ kind: "err", text: "Network error" });
      } finally {
        setBusy(false);
      }
    },
    [current, next, confirm, token, logout],
  );

  return (
    <AccountSection
      icon={<Key size={18} />}
      title="Change Password"
      subtitle="Update the password used to sign in to your account"
    >
      <form onSubmit={onSubmit} class={s.changePwForm}>
        <div class={s.changePwField}>
          <label class={s.changePwLabel} for="cp-current">
            Current password
          </label>
          <input
            id="cp-current"
            type="password"
            class={s.changePwInput}
            value={current}
            onInput={(e: any) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            disabled={busy}
          />
        </div>
        <div class={s.changePwField}>
          <label class={s.changePwLabel} for="cp-new">
            New password
          </label>
          <input
            id="cp-new"
            type="password"
            class={s.changePwInput}
            value={next}
            onInput={(e: any) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={busy}
          />
        </div>
        <div class={s.changePwField}>
          <label class={s.changePwLabel} for="cp-confirm">
            Confirm new password
          </label>
          <input
            id="cp-confirm"
            type="password"
            class={s.changePwInput}
            value={confirm}
            onInput={(e: any) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={busy}
          />
        </div>
        {msg && (
          <div
            class={`${s.changePwMsg} ${msg.kind === "ok" ? s.changePwMsgOk : s.changePwMsgErr}`}
          >
            <i
              class={`fas ${msg.kind === "ok" ? "fa-check-circle" : "fa-circle-exclamation"}`}
            />
            <span>{msg.text}</span>
          </div>
        )}
        <div class={s.changePwActions}>
          <button
            type="submit"
            class={s.btnPrimary}
            disabled={busy || !current || !next || !confirm}
          >
            <Key size={14} /> {busy ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </AccountSection>
  );
}

function SubTokensSection() {
  return (
    <AccountSection
      icon={<Shield size={18} />}
      title="Sub-Tokens"
      subtitle="Permission-scoped tokens for the apps you use"
      actions={
        <a href="/token-manager" class={s.linkBtn}>
          <ArrowUpRight size={14} /> Manage
        </a>
      }
    >
      <EmptyState
        icon={<Shield size={24} />}
        title="Manage app permissions"
        text="Sub-tokens let you give apps limited, scoped access to your account instead of sharing your main token."
      >
        <a
          href="/token-manager"
          class={s.btnPrimary}
          style={{ marginTop: "0.75rem" }}
        >
          <Shield size={14} /> Open Token Manager
        </a>
      </EmptyState>
    </AccountSection>
  );
}

function CosmeticsSection({
  activeOverlay,
  benefits,
}: {
  activeOverlay: string;
  benefits: Benefits | null;
}) {
  const hasAnimatedPfp = benefits?.animated_pfp;
  const hasAnimatedBanner = benefits?.animated_banner;
  const hasFreeBanners = benefits?.free_banner_uploads;
  const isSubscribed = hasAnimatedPfp || hasAnimatedBanner || hasFreeBanners;

  return (
    <AccountSection
      icon={<Sparkles size={18} />}
      title="Cosmetics"
      subtitle={
        activeOverlay ? `Wearing ${activeOverlay}` : "No overlay equipped"
      }
      actions={
        <a href="/shop" class={s.linkBtn}>
          <Sparkles size={14} /> Open Shop
        </a>
      }
    >
      {!isSubscribed && (
        <div class={s.upsellBanner}>
          <div class={s.upsellIcon}>
            <Heart size={16} />
          </div>
          <div class={s.upsellContent}>
            <div class={s.upsellTitle}>Unlock animated uploads & more</div>
            <div class={s.upsellText}>
              Get animated profile pictures, animated banners, free banner
              uploads, profile notes, and more daily credits.
            </div>
          </div>
          <a
            href="https://ko-fi.com/mistium"
            target="_blank"
            rel="noopener noreferrer"
            class={s.upsellBtn}
          >
            <Heart size={14} /> Subscribe
          </a>
        </div>
      )}

      {activeOverlay ? (
        <div class={s.subCard}>
          <div class={s.subAvatar}>
            <img
              src={`https://api.rotur.dev/cosmetics/overlays/${encodeURIComponent(activeOverlay)}.gif`}
              alt={activeOverlay}
              class={s.subAvatarImg}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div class={s.subInfo}>
            <div class={s.subName}>{activeOverlay.replace(/_/g, " ")}</div>
            <div class={s.subMeta}>Active overlay on your avatar</div>
          </div>
          <a href="/shop" class={s.subBtn}>
            Change
          </a>
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles size={24} />}
          title="No overlay equipped"
          text="Browse the shop to find overlays, badges, and more to customise your avatar."
        >
          <a href="/shop" class={s.btnPrimary} style={{ marginTop: "0.75rem" }}>
            <Sparkles size={14} /> Visit the Shop
          </a>
        </EmptyState>
      )}
    </AccountSection>
  );
}

interface NotesSectionProps {
  notes: Record<string, string>;
  hasNotes: boolean;
  onNoteUpdate: (username: string, note: string) => void;
}

function NotesSection({ notes, hasNotes, onNoteUpdate }: NotesSectionProps) {
  const [editUser, setEditUser] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [addInput, setAddInput] = useState("");

  const noteEntries = Object.entries(notes);

  const startEdit = (username: string) => {
    setEditUser(username);
    setEditDraft(notes[username] || "");
  };

  const saveNote = () => {
    if (!editUser) return;
    onNoteUpdate(editUser, editDraft.trim());
    setEditUser(null);
    setEditDraft("");
  };

  const addNote = () => {
    const username = addInput.trim();
    if (!username) return;
    setAddInput("");
    setEditUser(username);
    setEditDraft(notes[username] || "");
  };

  if (!hasNotes) {
    return (
      <AccountSection
        icon={<StickyNote size={18} />}
        title="Profile Notes"
        subtitle="Privately remember things about other users"
      >
        <EmptyState
          icon={<Heart size={24} />}
          title="Premium Feature"
          text="Profile Notes let you privately store reminders and context about other users. Only you can see them."
        >
          <a
            href="https://ko-fi.com/mistium"
            target="_blank"
            rel="noopener noreferrer"
            class={s.btnPrimary}
            style={{ marginTop: "0.75rem" }}
          >
            <Heart size={14} /> Subscribe to unlock
          </a>
        </EmptyState>
      </AccountSection>
    );
  }

  return (
    <AccountSection
      icon={<StickyNote size={18} />}
      title="Profile Notes"
      subtitle={`${noteEntries.length} note${
        noteEntries.length !== 1 ? "s" : ""
      } • Private`}
    >
      <div class={s.addFriendForm}>
        <input
          type="text"
          class={s.addFriendInput}
          placeholder="Add a note for a username..."
          value={addInput}
          onInput={(e: any) => setAddInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
        />
        <button
          class={s.btnPrimary}
          onClick={addNote}
          disabled={!addInput.trim()}
        >
          <StickyNote size={14} /> Add
        </button>
      </div>

      {editUser && (
        <div class={s.noteEditPanel}>
          <div class={s.noteEditHeader}>Note for @{editUser}</div>
          <textarea
            class={s.noteTextarea}
            value={editDraft}
            onInput={(e: any) => setEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditUser(null);
                setEditDraft("");
              }
            }}
            placeholder={`Add a note about @${editUser}...`}
            maxLength={300}
          />
          <div class={s.noteEditActions}>
            <button
              class={`${s.iconBtn} ${s.iconBtnSuccess}`}
              onClick={saveNote}
              title="Save"
              aria-label="Save note"
            >
              <Check size={14} />
            </button>
            <button
              class={s.iconBtn}
              onClick={() => {
                setEditUser(null);
                setEditDraft("");
              }}
              title="Cancel"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {noteEntries.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={24} />}
          title="No notes yet"
          text="Add a note about any user to privately remember things about them."
        />
      ) : (
        <div class={s.noteList}>
          {noteEntries.map(([username, note]) => (
            <div key={username} class={s.noteCard}>
              <a href={`/profile/${username}`} style={{ display: "contents" }}>
                <UserAvatar username={username} className={s.friendAvatar} />
                <div class={s.noteInfo}>
                  <div class={s.noteCardName}>@{username}</div>
                  <div class={s.noteCardText}>{note}</div>
                </div>
              </a>
              <div class={s.friendActions}>
                <button
                  class={s.iconBtn}
                  onClick={() => startEdit(username)}
                  title="Edit note"
                  aria-label="Edit note"
                >
                  <StickyNote size={14} />
                </button>
                <button
                  class={`${s.iconBtn} ${s.iconBtnDanger}`}
                  onClick={() => onNoteUpdate(username, "")}
                  title="Delete note"
                  aria-label="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountSection>
  );
}

interface BlockedSectionProps {
  blocked: string[];
  onUnblock: (username: string) => void;
}

function BlockedSection({ blocked, onUnblock }: BlockedSectionProps) {
  return (
    <AccountSection
      icon={<Ban size={18} />}
      title="Blocked Users"
      subtitle={
        blocked.length === 0
          ? "You haven't blocked anyone"
          : `${blocked.length} blocked`
      }
    >
      {blocked.length === 0 ? (
        <EmptyState
          icon={<Ban size={24} />}
          title="No blocked users"
          text="Users you block won't be able to follow you, send you friend requests, or interact with your content."
        />
      ) : (
        <div class={s.friendGrid}>
          {blocked.map((username) => (
            <div key={username} class={s.friendCard}>
              <a href={`/profile/${username}`} style={{ display: "contents" }}>
                <UserAvatar username={username} className={s.friendAvatar} />
                <div class={s.friendInfo}>
                  <div class={s.friendName}>@{username}</div>
                  <div class={s.friendHandle}>Blocked</div>
                </div>
              </a>
              <div class={s.friendActions}>
                <button
                  class={`${s.iconBtn} ${s.iconBtnSuccess}`}
                  onClick={() => onUnblock(username)}
                  title="Unblock user"
                  aria-label="Unblock user"
                >
                  <ShieldOff size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountSection>
  );
}

type StandingLevel = "good" | "warning" | "suspended" | "banned";

interface StandingHistoryEntry {
  level: StandingLevel;
  previous: StandingLevel;
  reason: string;
  admin_id: string;
  timestamp: number;
}

const STANDING_INFO: Record<
  StandingLevel,
  {
    label: string;
    description: string;
    allowed: string;
    restricted: string;
    color: string;
  }
> = {
  good: {
    label: "Good Standing",
    description:
      "Your account is in good standing. You have full access to all features.",
    allowed: "All features",
    restricted: "None",
    color: "#4ade80",
  },
  warning: {
    label: "Warning",
    description:
      "Your account has been flagged. You can still browse, follow, and buy, but actions that affect other users are limited until your standing recovers automatically.",
    allowed:
      "Browsing, following, buying items, claiming daily credits, buying cosmetics, claiming gifts",
    restricted:
      "Posting, replying, reposting, selling or transferring items, creating groups, sending friend requests, creating gifts",
    color: "#fbbf24",
  },
  suspended: {
    label: "Suspended",
    description:
      "Your account is suspended. Most actions are unavailable. Standing will automatically improve to warning after 30 days.",
    allowed: "Browsing, viewing your own profile",
    restricted:
      "Posting, replying, following, buying or selling items, friend activity, gifting, cosmetics, groups, daily credits",
    color: "#f87171",
  },
  banned: {
    label: "Banned",
    description:
      "Your account has been permanently banned. You cannot sign in or use Rotur services.",
    allowed: "Nothing",
    restricted: "All features",
    color: "#ef4444",
  },
};

interface StandingSectionProps {
  standing: StandingLevel;
  recoverAt: number;
  history: StandingHistoryEntry[];
}

function StandingSection({
  standing,
  recoverAt,
  history,
}: StandingSectionProps) {
  const info = STANDING_INFO[standing] || STANDING_INFO.good;
  const recoversMs = recoverAt > 0 ? recoverAt * 1000 : 0;
  const willRecover =
    recoversMs > 0 &&
    (standing === "warning" || standing === "suspended") &&
    recoversMs > Date.now();
  const reverseHistory = [...history].reverse();

  return (
    <AccountSection
      icon={<Shield size={18} />}
      iconStyle={{
        backgroundColor: `${info.color}22`,
        color: info.color,
      }}
      title="Account Standing"
      subtitle={
        willRecover
          ? `Recovers ${new Date(recoversMs).toLocaleString()}`
          : "Current account status"
      }
      actions={
        <span
          class={s.standingPill}
          style={{
            backgroundColor: `${info.color}22`,
            color: info.color,
            borderColor: `${info.color}55`,
          }}
        >
          {standing === "good" ? (
            <CheckCircle2 size={13} />
          ) : (
            <AlertTriangle size={13} />
          )}
          {info.label}
        </span>
      }
    >
      <div class={s.standingDescription}>
        <Info size={16} />
        <span>{info.description}</span>
      </div>

      <div class={s.standingLevels}>
        {(["good", "warning", "suspended", "banned"] as StandingLevel[]).map(
          (lvl) => {
            const li = STANDING_INFO[lvl];
            const active = lvl === standing;
            return (
              <div
                key={lvl}
                class={`${s.standingLevel} ${active ? s.standingLevelActive : ""}`}
                style={
                  active
                    ? {
                        borderColor: li.color,
                        backgroundColor: `${li.color}11`,
                      }
                    : undefined
                }
              >
                <div
                  class={s.standingLevelDot}
                  style={{ backgroundColor: li.color }}
                />
                <div class={s.standingLevelBody}>
                  <div class={s.standingLevelLabel}>{li.label}</div>
                  <div class={s.standingLevelAllowed}>
                    <span class={s.standingLevelAllowedLabel}>Allowed:</span>{" "}
                    {li.allowed}
                  </div>
                  {li.restricted !== "None" && (
                    <div class={s.standingLevelRestricted}>
                      <span class={s.standingLevelAllowedLabel}>
                        Restricted:
                      </span>{" "}
                      {li.restricted}
                    </div>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>

      {reverseHistory.length > 0 && (
        <div class={s.standingHistoryWrap}>
          <div class={s.standingHistoryTitle}>
            <Clock size={14} /> Recent standing changes
          </div>
          <div class={s.standingHistory}>
            {reverseHistory.slice(0, 5).map((entry, i) => {
              const li = STANDING_INFO[entry.level] || STANDING_INFO.good;
              return (
                <div key={i} class={s.standingHistoryItem}>
                  <div
                    class={s.standingHistoryDot}
                    style={{ backgroundColor: li.color }}
                  />
                  <div class={s.standingHistoryBody}>
                    <div class={s.standingHistoryHeader}>
                      <span style={{ color: li.color, fontWeight: 600 }}>
                        {li.label}
                      </span>
                      <span class={s.standingHistoryTime}>
                        {new Date(entry.timestamp * 1000).toLocaleString()}
                      </span>
                    </div>
                    {entry.reason && (
                      <div class={s.standingHistoryReason}>{entry.reason}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AccountSection>
  );
}
