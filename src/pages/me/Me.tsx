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
} from "lucide-preact";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { ProfileCard } from "../../components/ProfileCard";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth, type Transaction, captureTokenFromUrl } from "../../lib/auth";
import s from "./Me.module.css";

const API = "https://api.rotur.dev";

const INCOME_TYPES = ["tax", "in", "gift_claim", "key_sale"];
const EXPENSE_TYPES = ["out", "gift_create", "key_buy", "gift_claimed"];

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

type MainTab = "profile" | "social" | "billing" | "security";

const MAIN_TABS: { id: MainTab; label: string; icon: typeof Users }[] = [
  { id: "profile", label: "Profile", icon: LayoutGrid },
  { id: "social", label: "Social", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

export function Me() {
  const { user, isLoggedIn, token, reload, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>("profile");
  const [friendsTab, setFriendsTab] = useState<"all" | "requests">("all");
  const [friendInput, setFriendInput] = useState("");
  const [keys, setKeys] = useState<KeyRecord[] | null>(null);

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

  const friends = useMemo(
    () => (user?.["sys.friends"] ?? []) as string[],
    [user],
  );
  const requests = useMemo(
    () => (user?.["sys.requests"] ?? []) as string[],
    [user],
  );
  const transactions = useMemo(
    () => (user?.["sys.transactions"] ?? []) as Transaction[],
    [user],
  );

  const txStats = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 2592000000;
    const recent = transactions.filter((t) => t.time >= thirtyDaysAgo);
    let totalIncome = 0;
    let totalExpense = 0;
    recent.forEach((tx) => {
      const amt = Math.abs(tx.amount);
      if (INCOME_TYPES.includes(tx.type)) totalIncome += tx.amount;
      else if (EXPENSE_TYPES.includes(tx.type)) totalExpense += amt;
    });
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
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

  if (!isLoggedIn) {
    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
            <div class={s.authRequired}>
              <div class={s.authRequiredIcon}>
                <LogIn size={28} />
              </div>
              <div class={s.authRequiredTitle}>
                Sign in to view your account
              </div>
              <p class={s.authRequiredText}>
                You need to be signed in to view your Rotur account dashboard.
              </p>
              <a
                href={`/auth?return_to=${encodeURIComponent(`${window.location.origin}/me`)}`}
                class={s.btnPrimary}
              >
                <LogIn size={14} /> Sign in
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
          <ProfileCard
            user={user}
            editable
            showActions={false}
            isSelf
            onEdit={async () => {
              await reload();
            }}
          />

          <div class={s.tabsBar} role="tablist" aria-label="Account sections">
            <div class={s.tabs}>
              {MAIN_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  class={`${s.tab} ${activeTab === id ? s.tabActive : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <button class={s.logoutBtn} onClick={logout} title="Sign out">
              <LogOut size={14} /> Logout
            </button>
          </div>

          <div role="tabpanel" class={s.tabPanel}>
            {activeTab === "profile" && (
              <CosmeticsSection activeOverlay={user["sys.overlay"] || ""} />
            )}

            {activeTab === "social" && (
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
                  onCancel={cancelSubscription}
                />
              </>
            )}

            {activeTab === "security" && (
              <>
                <SubTokensSection />
                <NotificationsSection />
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
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
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          <div class={s.sectionIcon}>
            <Users size={18} />
          </div>
          <div>
            <div class={s.sectionTitle}>Friends</div>
            <div class={s.sectionSubtitle}>
              {friends.length} connected • {requests.length} pending
            </div>
          </div>
        </div>
      </div>
      <div class={s.sectionBody}>
        <div class={s.addFriendForm}>
          <input
            type="text"
            class={s.addFriendInput}
            placeholder="Add a friend by username..."
            value={input}
            onInput={(e: any) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />
          <button
            class={s.btnPrimary}
            onClick={onSend}
            disabled={!input.trim()}
          >
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
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              {tab === "all" ? <Users size={24} /> : <UserPlus size={24} />}
            </div>
            <div class={s.emptyTitle}>
              {tab === "all" ? "No friends yet" : "No pending requests"}
            </div>
            <div class={s.emptyText}>
              {tab === "all"
                ? "Add a friend by their username to get started."
                : "Friend requests will appear here."}
            </div>
          </div>
        ) : (
          <div class={s.friendGrid}>
            {list.map((username) => (
              <div key={username} class={s.friendCard}>
                <a
                  href={`/profile/${username}`}
                  style={{ display: "contents" }}
                >
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
      </div>
    </div>
  );
}

interface SubscriptionsSectionProps {
  paying: KeyRecord[];
  created: KeyRecord[];
  onCancel: (keyId: string) => void;
}

function SubscriptionsSection({
  paying,
  created,
  onCancel,
}: SubscriptionsSectionProps) {
  return (
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          <div class={s.sectionIcon}>
            <CreditCard size={18} />
          </div>
          <div>
            <div class={s.sectionTitle}>Subscriptions</div>
            <div class={s.sectionSubtitle}>
              {paying.length} active • {created.length} created
            </div>
          </div>
        </div>
        <div class={s.sectionActions}>
          <a href="/key-manager" class={s.linkBtn}>
            <Key size={14} /> Manage Keys
          </a>
        </div>
      </div>
      <div class={s.sectionBody}>
        {paying.length > 0 && (
          <>
            <div class={s.sectionDivider}>Active Subscriptions</div>
            {paying.map((sub) => (
              <div key={sub.key} class={s.subCard}>
                <a
                  href={`/profile/${sub.creator}`}
                  style={{ display: "contents" }}
                >
                  <UserAvatar username={sub.creator} className={s.subAvatar} />
                  <div class={s.subInfo}>
                    <div class={s.subName}>{sub.name}</div>
                    <div class={s.subMeta}>
                      by @{sub.creator} • {sub.price} credits/mo
                      {sub.subscription?.next_billing &&
                        ` • Next ${new Date(sub.subscription.next_billing * 1000).toLocaleDateString()}`}
                    </div>
                  </div>
                </a>
                <button
                  class={`${s.subBtn} ${s.subBtnDanger}`}
                  onClick={() => onCancel(sub.key)}
                >
                  Cancel
                </button>
              </div>
            ))}
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

        {paying.length === 0 && created.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <CreditCard size={24} />
            </div>
            <div class={s.emptyTitle}>No subscriptions</div>
            <div class={s.emptyText}>
              Create or subscribe to services to see them here.
            </div>
          </div>
        )}
      </div>
    </div>
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
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          <div class={s.sectionIcon}>
            <Receipt size={18} />
          </div>
          <div>
            <div class={s.sectionTitle}>Transactions</div>
            <div class={s.sectionSubtitle}>Last 30 days</div>
          </div>
        </div>
        <div class={s.sectionActions}>
          <a href="/me/transactions" class={s.linkBtn}>
            <ArrowUpRight size={14} /> View all
          </a>
        </div>
      </div>
      <div class={s.sectionBody}>
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
              const isPos = INCOME_TYPES.includes(tx.type);
              const title =
                tx.note ||
                (tx.user
                  ? isPos
                    ? `From @${tx.user}`
                    : `To @${tx.user}`
                  : isPos
                    ? "Credit received"
                    : "Payment made");
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
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Receipt size={24} />
            </div>
            <div class={s.emptyTitle}>No transactions yet</div>
            <div class={s.emptyText}>
              Your transaction history will appear here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          <div class={s.sectionIcon}>
            <Bell size={18} />
          </div>
          <div>
            <div class={s.sectionTitle}>Notifications</div>
            <div class={s.sectionSubtitle}>
              Manage devices, allowed senders, and delivery log
            </div>
          </div>
        </div>
        <div class={s.sectionActions}>
          <a href="/notifications" class={s.linkBtn}>
            <ArrowUpRight size={14} /> Open
          </a>
        </div>
      </div>
      <div class={s.sectionBody}>
        <div class={s.empty}>
          <div class={s.emptyIcon}>
            <Bell size={24} />
          </div>
          <div class={s.emptyTitle}>Notification settings</div>
          <div class={s.emptyText}>
            Register devices, choose which sources can notify you, and review
            your recent delivery history.
          </div>
          <a
            href="/notifications"
            class={s.btnPrimary}
            style={{ marginTop: "0.75rem" }}
          >
            <Bell size={14} /> View notifications
          </a>
        </div>
      </div>
    </div>
  );
}

function SubTokensSection() {
  return (
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          <div class={s.sectionIcon}>
            <Shield size={18} />
          </div>
          <div>
            <div class={s.sectionTitle}>Sub-Tokens</div>
            <div class={s.sectionSubtitle}>
              Permission-scoped tokens for the apps you use
            </div>
          </div>
        </div>
        <div class={s.sectionActions}>
          <a href="/token-manager" class={s.linkBtn}>
            <ArrowUpRight size={14} /> Manage
          </a>
        </div>
      </div>
      <div class={s.sectionBody}>
        <div class={s.empty}>
          <div class={s.emptyIcon}>
            <Shield size={24} />
          </div>
          <div class={s.emptyTitle}>Manage app permissions</div>
          <div class={s.emptyText}>
            Sub-tokens let you give apps limited, scoped access to your account
            instead of sharing your main token.
          </div>
          <a
            href="/token-manager"
            class={s.btnPrimary}
            style={{ marginTop: "0.75rem" }}
          >
            <Shield size={14} /> Open Token Manager
          </a>
        </div>
      </div>
    </div>
  );
}

function CosmeticsSection({ activeOverlay }: { activeOverlay: string }) {
  return (
    <div class={s.section}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitleGroup}>
          <div class={s.sectionIcon}>
            <Sparkles size={18} />
          </div>
          <div>
            <div class={s.sectionTitle}>Cosmetics</div>
            <div class={s.sectionSubtitle}>
              {activeOverlay
                ? `Wearing ${activeOverlay}`
                : "No overlay equipped"}
            </div>
          </div>
        </div>
        <div class={s.sectionActions}>
          <a href="/shop" class={s.linkBtn}>
            <Sparkles size={14} /> Open Shop
          </a>
        </div>
      </div>
      <div class={s.sectionBody}>
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
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Sparkles size={24} />
            </div>
            <div class={s.emptyTitle}>No overlay equipped</div>
            <div class={s.emptyText}>
              Browse the shop to find overlays, badges, and more to customise
              your avatar.
            </div>
            <a
              href="/shop"
              class={s.btnPrimary}
              style={{ marginTop: "0.75rem" }}
            >
              <Sparkles size={14} /> Visit the Shop
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
