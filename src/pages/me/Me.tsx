import { useI18n } from "../../i18n/i18n";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "preact/hooks";
import {
  Users,
  CreditCard,
  Receipt,
  UserPlus,
  Check,
  X,
  UserMinus,
  Send,
  Search,
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
  Inbox,
  ArrowRightLeft,
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
import { useConfirm } from "../../components/ConfirmDialog";
import { CAPTCHA_SITE_KEY } from "../../lib/captcha";
import { UserAvatar } from "../../components/UserAvatar";
import {
  useAuth,
  useBenefits,
  usePublicProfile,
  type Benefits,
  type Transaction,
  captureTokenFromUrl,
} from "../../lib/auth";
import {
  computeTransactionStats,
  describeTransaction,
  isTransactionIncome,
} from "../../lib/transactions";
import { plural } from "../../lib/format";
import s from "./Me.module.css";

const API = "https://api.accounts.bilup.org";

declare const turnstile: any;

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

const MAIN_TABS: { id: MainTab; labelKey: string; icon: typeof Users }[] = [
  { id: "profile", labelKey: "me.profile", icon: LayoutGrid },
  { id: "social", labelKey: "me.social", icon: Users },
  { id: "billing", labelKey: "me.billing", icon: CreditCard },
  { id: "security", labelKey: "me.security", icon: Shield },
];

export function Me() {
  const { t } = useI18n();
  const { user, isLoggedIn, token, reload, logout } = useAuth();
  const [confirm, confirmDialog] = useConfirm();
  const { benefits } = useBenefits();
  const { profile: myPublicProfile } = usePublicProfile(user?.username ?? null);
  const [activeTab, setActiveTab] = useState<MainTab>("profile");
  const [friendsTab, setFriendsTab] = useState<"all" | "requests">("all");
  const [friendInput, setFriendInput] = useState("");
  const [friendSending, setFriendSending] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([]);
  const [outgoingLoading, setOutgoingLoading] = useState(false);
  const [keys, setKeys] = useState<KeyRecord[] | null>(null);
  const [groupSubs, setGroupSubs] = useState<GroupProductSubscription[]>([]);
  const [subError, setSubError] = useState<string | null>(null);

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

  const fetchOutgoingRequests = useCallback(async () => {
    if (!token) {
      setOutgoingRequests([]);
      return;
    }
    setOutgoingLoading(true);
    try {
      const res = await fetch(
        `${API}/requests_out?auth=${encodeURIComponent(token)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (res.ok) {
        const requests = Array.isArray(data?.requests_out)
          ? data.requests_out
          : Array.isArray(data?.outgoing)
            ? data.outgoing
            : [];
        setOutgoingRequests(requests);
      }
    } catch {
      /* keep the last loaded list */
    } finally {
      setOutgoingLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) {
      setOutgoingRequests([]);
      return;
    }
    fetchOutgoingRequests();
  }, [user?.username, token, fetchOutgoingRequests]);

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
    if (!username || !token || friendSending) return;
    setFriendSending(true);
    setFriendError(null);
    try {
      const res = await fetch(
        `${API}/friends/request/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        // Keep what they typed so they can correct it, and say what went wrong.
        setFriendError(
          data?.error || t("me.friendRequestFailed", { username }),
        );
        return;
      }
      setFriendInput("");
      setOutgoingRequests((prev) =>
        prev.some((u) => u.toLowerCase() === username.toLowerCase())
          ? prev
          : [...prev, username],
      );
      await reload();
    } catch {
      setFriendError(t("me.networkFriendRequestErr"));
    } finally {
      setFriendSending(false);
    }
  }, [friendInput, token, reload, friendSending, t]);

  const friendAction = useCallback(
    async (action: "accept" | "reject" | "remove", username: string) => {
      if (!token) return;
      try {
        await fetch(
          `${API}/friends/${action}/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        if (action === "accept") {
          setOutgoingRequests((prev) =>
            prev.filter((u) => u.toLowerCase() !== username.toLowerCase()),
          );
        }
        await reload();
      } catch {
        /* ignore */
      }
    },
    [token, reload],
  );

  const cancelFriendRequest = useCallback(
    async (username: string) => {
      if (!token) return;
      try {
        const res = await fetch(
          `${API}/friends/cancel/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.error) return;
        setOutgoingRequests((prev) =>
          prev.filter((u) => u.toLowerCase() !== username.toLowerCase()),
        );
      } catch {
        /* ignore */
      }
    },
    [token],
  );

  const cancelSubscription = useCallback(
    async (keyId: string) => {
      if (!token) return;
      const ok = await confirm({
        title: t("me.cancelSubTitle"),
        message: t("me.cancelSubMsg"),
        confirmLabel: t("me.cancelSub"),
        cancelLabel: t("me.keepIt"),
        danger: true,
      });
      if (!ok) return;
      setSubError(null);
      try {
        const res = await fetch(
          `${API}/keys/cancel/${encodeURIComponent(keyId)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        // A failed cancel leaves the subscription billing — never fail silently.
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSubError(data?.error || t("me.failedCancelSub"));
          return;
        }
        await reload();
      } catch {
        setSubError(t("me.networkErrorSubCancel"));
      }
    },
    [token, reload, confirm, t],
  );

  const cancelGroupSubscription = useCallback(
    async (groupTag: string, productId: string) => {
      if (!token) return;
      const ok = await confirm({
        title: t("me.cancelGroupSub"),
        message: t("me.cancelSubMsg"),
        confirmLabel: t("me.cancelSub"),
        cancelLabel: t("me.keepIt"),
        danger: true,
      });
      if (!ok) return;
      setSubError(null);
      try {
        const res = await fetch(
          `${API}/groups/${encodeURIComponent(groupTag)}/products/${encodeURIComponent(productId)}/cancel?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSubError(data?.error || t("me.failedCancelSub"));
          return;
        }
        const refreshed = await fetch(
          `${API}/groups/products/subscriptions/mine?auth=${encodeURIComponent(token)}`,
        );
        const data = await refreshed.json();
        if (refreshed.ok && Array.isArray(data)) setGroupSubs(data);
        await reload();
      } catch {
        setSubError(t("me.networkErrorSubCancel"));
      }
    },
    [token, reload, confirm, t],
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
        title={t("me.signInToView")}
        text={t("me.signInText")}
        href={`/auth?return_to=${encodeURIComponent(`${window.location.origin}/me`)}`}
      />
    );
  }

  if (!user) return null;

  return (
    <AccountPage>
      {confirmDialog}
      <AccountTabs
        tabs={MAIN_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) }))}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel={t("me.accountSections")}
        actions={
          <button class={s.logoutBtn} onClick={logout} title={t("me.logout")}>
            <LogOut size={14} /> {t("me.logout")}
          </button>
        }
      />

      <AccountTabPanel>
        {activeTab === "profile" && (
          <>
            <ProfileCard
              user={user}
              editable
              showActions={false}
              isSelf
              benefits={benefits?.benefits ?? null}
              index={myPublicProfile?.index}
              onEdit={async () => {
                await reload();
              }}
            />
            <CosmeticsSection
              activeOverlay={user["sys.overlay"] || ""}
              benefits={benefits?.benefits ?? null}
            />
          </>
        )}

        {activeTab === "social" && (
          <>
            <FriendsSection
              friends={friends}
              requests={requests}
              outgoingRequests={outgoingRequests}
              outgoingLoading={outgoingLoading}
              tab={friendsTab}
              setTab={setFriendsTab}
              input={friendInput}
              setInput={setFriendInput}
              onSend={sendFriendRequest}
              sending={friendSending}
              error={friendError}
              onAction={friendAction}
              onCancelRequest={cancelFriendRequest}
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
              error={subError}
              loading={keys === null}
            />
          </>
        )}

        {activeTab === "security" && (
          <>
            <ChangePasswordSection />
            <SubTokensSection />
            <NotificationsSection />
            <DeleteAccountSection />
          </>
        )}
      </AccountTabPanel>
    </AccountPage>
  );
}

interface FriendsSectionProps {
  friends: string[];
  requests: string[];
  outgoingRequests: string[];
  outgoingLoading: boolean;
  tab: "all" | "requests";
  setTab: (t: "all" | "requests") => void;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  error: string | null;
  onAction: (action: "accept" | "reject" | "remove", username: string) => void;
  onCancelRequest: (username: string) => void;
}

function FriendsSection({
  friends,
  requests,
  outgoingRequests,
  outgoingLoading,
  tab,
  setTab,
  input,
  setInput,
  onSend,
  sending,
  error,
  onAction,
  onCancelRequest,
}: FriendsSectionProps) {
  const { t } = useI18n();
  const list = tab === "all" ? friends : requests;
  const pendingCount = requests.length + outgoingRequests.length;

  return (
    <AccountSection
      icon={<Users size={18} />}
      title={t("me.friends")}
      subtitle={`${friends.length} ${t("me.connected")} • ${pendingCount} ${t("me.pending")}`}
    >
      <div class={s.addFriendForm}>
        <input
          type="text"
          class={s.addFriendInput}
          placeholder={t("me.addFriendPlaceholder")}
          aria-label={t("me.addFriendPlaceholder")}
          value={input}
          disabled={sending}
          onInput={(e: any) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <button
          class={s.btnPrimary}
          onClick={onSend}
          disabled={!input.trim() || sending}
        >
          <UserPlus size={14} /> {sending ? t("me.sending") : t("me.add")}
        </button>
      </div>
      {error && (
        <div class={s.subError} role="alert">
          {error}
        </div>
      )}

      <div class={s.friendsTabs}>
        <button
          class={`${s.friendsTab} ${tab === "all" ? s.active : ""}`}
          onClick={() => setTab("all")}
        >
          {t("me.all")} <span class={s.friendsTabCount}>{friends.length}</span>
        </button>
        <button
          class={`${s.friendsTab} ${tab === "requests" ? s.active : ""}`}
          onClick={() => setTab("requests")}
        >
          {t("me.requests")} <span class={s.friendsTabCount}>{pendingCount}</span>
        </button>
      </div>

      {tab === "requests" ? (
        <RequestsSection
          incoming={requests}
          outgoing={outgoingRequests}
          outgoingLoading={outgoingLoading}
          onAction={onAction}
          onCancelRequest={onCancelRequest}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title={t("me.noFriends")}
          text={t("me.addFriendStart")}
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
                    {tab === "all" ? t("me.connectedState") : t("me.wantsToConnect")}
                  </div>
                </div>
              </a>
              <div class={s.friendActions}>
                <button
                  class={`${s.iconBtn} ${s.iconBtnDanger}`}
                  onClick={() => onAction("remove", username)}
                  title={t("me.removeFriend")}
                  aria-label={t("me.removeFriend")}
                >
                  <UserMinus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountSection>
  );
}

function RequestsSection({
  incoming,
  outgoing,
  outgoingLoading,
  onAction,
  onCancelRequest,
}: {
  incoming: string[];
  outgoing: string[];
  outgoingLoading: boolean;
  onAction: (action: "accept" | "reject" | "remove", username: string) => void;
  onCancelRequest: (username: string) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filteredIncoming = q
    ? incoming.filter((u) => u.toLowerCase().includes(q))
    : incoming;
  const filteredOutgoing = q
    ? outgoing.filter((u) => u.toLowerCase().includes(q))
    : outgoing;
  const totalEmpty = incoming.length === 0 && outgoing.length === 0;
  const noResults =
    !totalEmpty &&
    filteredIncoming.length === 0 &&
    filteredOutgoing.length === 0;

  if (totalEmpty && !outgoingLoading) {
    return (
      <EmptyState
        icon={<Inbox size={24} />}
        title={t("me.noPendingRequests")}
        text={t("me.friendRequestsAppear")}
      />
    );
  }

  return (
    <div class={s.requestsView}>
      {!totalEmpty && (
        <div class={s.requestSearch}>
          <Search size={14} />
          <input
            type="text"
            class={s.requestSearchInput}
            placeholder={t("me.searchRequests")}
            value={search}
            onInput={(e: any) => setSearch(e.target.value)}
          />
        </div>
      )}

      {incoming.length > 0 && (
        <RequestGroup
          icon={<ArrowRightLeft size={13} />}
          title={t("me.incoming")}
          count={filteredIncoming.length}
        >
          {filteredIncoming.map((username) => (
            <RequestCard
              key={username}
              username={username}
              subtitle={t("me.wantsToConnect")}
            >
              <button
                class={`${s.iconBtn} ${s.iconBtnSuccess}`}
                onClick={() => onAction("accept", username)}
                title={t("me.accept")}
                aria-label={`${t("me.accept")} ${username}`}
              >
                <Check size={14} />
              </button>
              <button
                class={`${s.iconBtn} ${s.iconBtnDanger}`}
                onClick={() => onAction("reject", username)}
                title={t("me.reject")}
                aria-label={`${t("me.reject")} ${username}`}
              >
                <X size={14} />
              </button>
            </RequestCard>
          ))}
        </RequestGroup>
      )}

      {(outgoing.length > 0 || outgoingLoading) && (
        <RequestGroup
          icon={<Send size={13} />}
          title={t("me.outgoing")}
          count={filteredOutgoing.length}
        >
          {outgoingLoading && outgoing.length === 0 ? (
            <div class={s.requestsLoading}>{t("me.sending")}</div>
          ) : (
            filteredOutgoing.map((username) => (
              <RequestCard
                key={username}
                username={username}
                subtitle={t("me.outgoingRequest")}
              >
                <button
                  class={`${s.iconBtn} ${s.iconBtnDanger}`}
                  onClick={() => onCancelRequest(username)}
                  title={t("me.cancelRequest")}
                  aria-label={`${t("me.cancelRequest")} ${username}`}
                >
                  <X size={14} />
                </button>
              </RequestCard>
            ))
          )}
        </RequestGroup>
      )}

      {noResults && (
        <EmptyState
          icon={<Search size={24} />}
          title={t("me.noRequestsFound")}
          text={t("me.tryDifferentSearch")}
        />
      )}
    </div>
  );
}

function RequestGroup({
  icon,
  title,
  count,
  children,
}: {
  icon: any;
  title: string;
  count: number;
  children: any;
}) {
  return (
    <div class={s.requestGroup}>
      <h3 class={s.requestGroupTitle}>
        {icon} {title} <span>{count}</span>
      </h3>
      <div class={s.friendGrid}>{children}</div>
    </div>
  );
}

function RequestCard({
  username,
  subtitle,
  children,
}: {
  username: string;
  subtitle: string;
  children: any;
}) {
  return (
    <div class={s.friendCard}>
      <a href={`/profile/${username}`} style={{ display: "contents" }}>
        <UserAvatar username={username} className={s.friendAvatar} />
        <div class={s.friendInfo}>
          <div class={s.friendName}>@{username}</div>
          <div class={s.friendHandle}>{subtitle}</div>
        </div>
      </a>
      <div class={s.friendActions}>{children}</div>
    </div>
  );
}

interface SubscriptionsSectionProps {
  paying: KeyRecord[];
  created: KeyRecord[];
  groupSubs: GroupProductSubscription[];
  username: string;
  onCancel: (keyId: string) => void;
  onCancelGroup: (groupTag: string, productId: string) => void;
  error?: string | null;
  loading?: boolean;
}

function SubscriptionsSection({
  paying,
  created,
  groupSubs,
  username,
  onCancel,
  onCancelGroup,
  error,
  loading,
}: SubscriptionsSectionProps) {
  const { t } = useI18n();
  return (
    <AccountSection
      icon={<CreditCard size={18} />}
      title={t("me.subscriptions")}
      subtitle={`${paying.length + groupSubs.length} ${t("me.activeCreated")} • ${
        created.length
      } ${t("me.created")}`}
      actions={
        <a href="/key-manager" class={s.linkBtn}>
          <Key size={14} /> {t("me.manageKeys")}
        </a>
      }
    >
      {error && (
        <div class={s.subError} role="alert">
          {error}
        </div>
      )}

      {paying.length > 0 && (
        <>
          <div class={s.sectionDivider}>{t("me.keySubscriptions")}</div>
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
                      {t("me.by")} @{sub.creator} • {sub.price} {t("me.credits")}
                      {mine?.cancel_at
                        ? ` • ${t("me.activeUntil")} ${formatBillingDate(mine.cancel_at)}`
                        : mine?.next_billing
                          ? ` • ${t("me.next")} ${formatBillingDate(mine.next_billing)}`
                          : ""}
                    </div>
                  </div>
                </a>
                {mine?.cancel_at ? (
                  <span class={s.statusPill}>
                    {t("me.cancelsOn")} {formatBillingDate(mine.cancel_at)}
                  </span>
                ) : (
                  <button
                    class={`${s.subBtn} ${s.subBtnDanger}`}
                    onClick={() => onCancel(sub.key)}
                  >
                    {t("me.cancel")}
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {groupSubs.length > 0 && (
        <>
          <div class={s.sectionDivider}>{t("me.groupRoleSubs")}</div>
          {groupSubs.map((sub) => {
            const paidThrough = sub.cancel_at || sub.next_billing;
            return (
              <div key={sub.id} class={s.subCard}>
                <div class={s.subInfo}>
                  <div class={s.subName}>{sub.product_name}</div>
                  <div class={s.subMeta}>
                    @{sub.group_tag} • {sub.role_name || t("me.role")}
                    {sub.cancel_at
                      ? ` • ${t("me.cancelsOn")} ${formatBillingDate(paidThrough)}`
                      : ` • ${t("me.next")} ${formatBillingDate(sub.next_billing)}`}
                  </div>
                </div>
                {sub.cancel_at ? (
                  <span class={s.statusPill}>
                    {t("me.activeUntil")} {formatBillingDate(paidThrough)}
                  </span>
                ) : (
                  <button
                    class={`${s.subBtn} ${s.subBtnDanger}`}
                    onClick={() => onCancelGroup(sub.group_tag, sub.product_id)}
                  >
                    {t("me.cancel")}
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {created.length > 0 && (
        <>
          <div class={s.sectionDivider}>{t("me.yourServices")}</div>
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
                    {sub.price} {t("me.creditsPerMonth")} • {subCount}{" "}
                    {plural(subCount, t("me.subscriber"), t("me.subscribers"))}
                    {sub.total_income ? ` • ${sub.total_income} ${t("me.earned")}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {loading && <div class={s.loading}>{t("me.loadingSubs")}</div>}

      {!loading &&
        paying.length === 0 &&
        created.length === 0 &&
        groupSubs.length === 0 && (
          <EmptyState
            icon={<CreditCard size={24} />}
            title={t("me.noSubscriptions")}
            text={t("me.noSubsText")}
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
  const { t } = useI18n();
  return (
    <AccountSection
      icon={<Receipt size={18} />}
      title={t("me.transactions")}
      subtitle={t("me.last30Days")}
      actions={
        <a href="/me/transactions" class={s.linkBtn}>
          <ArrowUpRight size={14} /> {t("me.viewAll")}
        </a>
      }
    >
      <div class={s.txSummary}>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("me.balance")}</div>
          <div class={s.summaryValue}>{credits.toLocaleString()}</div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("me.income")}</div>
          <div class={`${s.summaryValue} ${s.income}`}>
            +
            {stats.totalIncome.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("me.spent")}</div>
          <div class={`${s.summaryValue} ${s.expense}`}>
            -
            {stats.totalExpense.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div class={s.summaryCard}>
          <div class={s.summaryLabel}>{t("me.net")}</div>
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
            const title = describeTransaction(tx, t);
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
          title={t("me.noTransactions")}
          text={t("me.transactionHistory")}
        />
      )}
    </AccountSection>
  );
}

function NotificationsSection() {
  const { t } = useI18n();
  return (
    <AccountSection
      icon={<Bell size={18} />}
      title={t("me.notifications")}
      subtitle={t("me.notificationsSub")}
      actions={
        <a href="/notifications" class={s.linkBtn}>
          <ArrowUpRight size={14} /> {t("me.open")}
        </a>
      }
    >
      <EmptyState
        icon={<Bell size={24} />}
        title={t("me.notificationSettings")}
        text={t("me.notificationsDesc")}
      >
        <a
          href="/notifications"
          class={s.btnPrimary}
          style={{ marginTop: "0.75rem" }}
        >
          <Bell size={14} /> {t("me.viewNotifications")}
        </a>
      </EmptyState>
    </AccountSection>
  );
}

function ChangePasswordSection() {
  const { t } = useI18n();
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
        setMsg({ kind: "err", text: t("me.password8Chars") });
        return;
      }
      if (next !== confirm) {
        setMsg({ kind: "err", text: t("me.passwordsNotMatch") });
        return;
      }
      if (current === next) {
        setMsg({ kind: "err", text: t("me.passwordDifferent") });
        return;
      }
      if (!token) {
        setMsg({ kind: "err", text: t("me.signInAgain") });
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
            text: data.error || t("me.failedChangePassword"),
          });
          setBusy(false);
          return;
        }
        setMsg({ kind: "ok", text: t("me.passwordUpdated") });
        setCurrent("");
        setNext("");
        setConfirm("");
        setTimeout(() => {
          logout();
        }, 1500);
      } catch {
        setMsg({ kind: "err", text: t("me.networkError") });
      } finally {
        setBusy(false);
      }
    },
    [current, next, confirm, token, logout, t],
  );

  return (
    <AccountSection
      icon={<Key size={18} />}
      title={t("me.changePassword")}
      subtitle={t("me.changePasswordSub")}
    >
      <form onSubmit={onSubmit} class={s.changePwForm}>
        <div class={s.changePwField}>
          <label class={s.changePwLabel} for="cp-current">
            {t("me.currentPassword")}
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
            {t("me.newPassword")}
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
            {t("me.confirmNewPassword")}
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
            <Key size={14} /> {busy ? t("me.updating") : t("me.updatePassword")}
          </button>
        </div>
      </form>
    </AccountSection>
  );
}

function DeleteAccountSection() {
  const { t } = useI18n();
  const { user, token, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const captchaRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<string | null>(null);

  const username = user?.username ?? "";

  useEffect(() => {
    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      const el = captchaRef.current;
      if (!el) return;
      if (typeof turnstile === "undefined") {
        setTimeout(tryRender, 100);
        return;
      }
      if (captchaWidgetIdRef.current !== null) {
        try {
          turnstile.remove(captchaWidgetIdRef.current);
        } catch {}
        captchaWidgetIdRef.current = null;
      }
      try {
        captchaWidgetIdRef.current = turnstile.render(el, {
          sitekey: CAPTCHA_SITE_KEY,
        });
      } catch {}
    };
    tryRender();
    return () => {
      cancelled = true;
      if (
        captchaWidgetIdRef.current !== null &&
        typeof turnstile !== "undefined"
      ) {
        try {
          turnstile.remove(captchaWidgetIdRef.current);
        } catch {}
        captchaWidgetIdRef.current = null;
      }
    };
  }, []);

  const onDelete = useCallback(async () => {
    if (!token || !username) return;
    const captchaToken =
      typeof turnstile !== "undefined" && captchaWidgetIdRef.current !== null
        ? turnstile.getResponse(captchaWidgetIdRef.current)
        : "";
    if (!captchaToken) {
      setErr(t("me.completeCaptcha"));
      return;
    }
    setErr(null);
    const password = await confirm({
      title: t("me.deleteAccountTitle"),
      message: t("me.deleteAccountMsg"),
      confirmLabel: t("me.deleteForever"),
      cancelLabel: t("me.cancel"),
      danger: true,
      input: {
        type: "password",
        label: t("me.password"),
        placeholder: t("me.yourPassword"),
      },
    });
    if (typeof password !== "string" || !password) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/users/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, captcha: captchaToken }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as any);
        setErr(data.error || t("me.failedDeleteAccount"));
        if (typeof turnstile !== "undefined")
          turnstile.reset(captchaWidgetIdRef.current);
        setBusy(false);
        return;
      }
      logout();
      window.location.href = "/";
    } catch {
      if (typeof turnstile !== "undefined")
        turnstile.reset(captchaWidgetIdRef.current);
      setErr(t("me.networkError"));
      setBusy(false);
    }
  }, [token, username, confirm, logout, t]);

  return (
    <AccountSection
      icon={<Trash2 size={18} />}
      iconStyle={{ background: "rgba(248, 113, 113, 0.12)", color: "#f87171" }}
      title={t("me.deleteAccount")}
      subtitle={t("me.deleteAccountSub")}
    >
      {err && (
        <div class={`${s.changePwMsg} ${s.changePwMsgErr}`}>
          <i class="fas fa-circle-exclamation" />
          <span>{err}</span>
        </div>
      )}
      <div
        ref={captchaRef}
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "0.5rem",
        }}
      />
      <div class={s.changePwActions}>
        <button
          type="button"
          class={`${s.subBtn} ${s.subBtnDanger}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 size={14} /> {busy ? t("me.deleting") : t("me.deleteMyAccount")}
        </button>
      </div>
      {confirmDialog}
    </AccountSection>
  );
}

function SubTokensSection() {
  const { t } = useI18n();
  return (
    <AccountSection
      icon={<Shield size={18} />}
      title={t("me.subTokens")}
      subtitle={t("me.subTokensSub")}
      actions={
        <a href="/token-manager" class={s.linkBtn}>
          <ArrowUpRight size={14} /> {t("me.manage")}
        </a>
      }
    >
      <EmptyState
        icon={<Shield size={24} />}
        title={t("me.manageAppPerms")}
        text={t("me.subTokensDesc")}
      >
        <a
          href="/token-manager"
          class={s.btnPrimary}
          style={{ marginTop: "0.75rem" }}
        >
          <Shield size={14} /> {t("me.openTokenManager")}
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
  const { t } = useI18n();
  const hasAnimatedPfp = benefits?.animated_pfp;
  const hasAnimatedBanner = benefits?.animated_banner;
  const hasFreeBanners = benefits?.free_banner_uploads;
  const isSubscribed = hasAnimatedPfp || hasAnimatedBanner || hasFreeBanners;

  return (
    <AccountSection
      icon={<Sparkles size={18} />}
      title={t("me.cosmetics")}
      subtitle={
        activeOverlay
          ? `${t("me.wearing")} ${activeOverlay.replace(/_/g, " ")}`
          : t("me.noOverlay")
      }
      actions={
        <a href="/shop" class={s.linkBtn}>
          <Sparkles size={14} /> {t("me.openShop")}
        </a>
      }
    >
      {!isSubscribed && (
        <div class={s.upsellBanner}>
          <div class={s.upsellIcon}>
            <Heart size={16} />
          </div>
          <div class={s.upsellContent}>
            <div class={s.upsellTitle}>{t("me.upsellTitle")}</div>
            <div class={s.upsellText}>{t("me.upsellText")}</div>
          </div>
          <a
            href="https://ifdian.net/a/RyaninCn11"
            target="_blank"
            rel="noopener noreferrer"
            class={s.upsellBtn}
          >
            <Heart size={14} /> {t("me.subscribe")}
          </a>
        </div>
      )}

      {activeOverlay ? (
        <div class={s.subCard}>
          <div class={s.subAvatar}>
            <img
              src={`https://api.accounts.bilup.org/cosmetics/overlays/${encodeURIComponent(activeOverlay)}.gif`}
              alt={activeOverlay}
              class={s.subAvatarImg}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div class={s.subInfo}>
            <div class={s.subName}>{activeOverlay.replace(/_/g, " ")}</div>
            <div class={s.subMeta}>{t("me.activeOverlayOn")}</div>
          </div>
          <a href="/shop" class={s.subBtn}>
            {t("me.change")}
          </a>
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles size={24} />}
          title={t("me.noOverlayEquipped")}
          text={t("me.noOverlayText")}
        >
          <a href="/shop" class={s.btnPrimary} style={{ marginTop: "0.75rem" }}>
            <Sparkles size={14} /> {t("me.visitShop")}
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
  const { t } = useI18n();
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
        title={t("me.profileNotes")}
        subtitle={t("me.profileNotesSub")}
      >
        <EmptyState
          icon={<Heart size={24} />}
          title={t("me.premiumFeature")}
          text={t("me.profileNotesDesc")}
        >
          <a
            href="https://ifdian.net/a/RyaninCn11"
            target="_blank"
            rel="noopener noreferrer"
            class={s.btnPrimary}
            style={{ marginTop: "0.75rem" }}
          >
            <Heart size={14} /> {t("me.subscribeToUnlock")}
          </a>
        </EmptyState>
      </AccountSection>
    );
  }

  return (
    <AccountSection
      icon={<StickyNote size={18} />}
      title={t("me.profileNotes")}
      subtitle={`${noteEntries.length} ${plural(
        noteEntries.length,
        t("me.notes"),
        t("me.notesPlural"),
      )} • ${t("me.privateNotes")}`}
    >
      <div class={s.addFriendForm}>
        <input
          type="text"
          class={s.addFriendInput}
          placeholder={t("me.addNotePlaceholder")}
          value={addInput}
          onInput={(e: any) => setAddInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
        />
        <button
          class={s.btnPrimary}
          onClick={addNote}
          disabled={!addInput.trim()}
        >
          <StickyNote size={14} /> {t("me.add")}
        </button>
      </div>

      {editUser && (
        <div class={s.noteEditPanel}>
          <div class={s.noteEditHeader}>{t("me.noteFor")} @{editUser}</div>
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
            placeholder={`${t("me.addNoteAbout")} @${editUser}...`}
            maxLength={300}
          />
          <div class={s.noteEditActions}>
            <button
              class={`${s.iconBtn} ${s.iconBtnSuccess}`}
              onClick={saveNote}
              title={t("me.saveNote")}
              aria-label={t("me.saveNote")}
            >
              <Check size={14} />
            </button>
            <button
              class={s.iconBtn}
              onClick={() => {
                setEditUser(null);
                setEditDraft("");
              }}
              title={t("me.cancel")}
              aria-label={t("me.cancel")}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {noteEntries.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={24} />}
          title={t("me.noNotesYet")}
          text={t("me.noNotesText")}
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
                  title={t("me.editNote")}
                  aria-label={t("me.editNote")}
                >
                  <StickyNote size={14} />
                </button>
                <button
                  class={`${s.iconBtn} ${s.iconBtnDanger}`}
                  onClick={() => onNoteUpdate(username, "")}
                  title={t("me.deleteNote")}
                  aria-label={t("me.deleteNote")}
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
  const { t } = useI18n();
  return (
    <AccountSection
      icon={<Ban size={18} />}
      title={t("me.blockedUsers")}
      subtitle={
        blocked.length === 0
          ? t("me.notBlockedAnyone")
          : `${blocked.length} ${t("me.blockedCount")}`
      }
    >
      {blocked.length === 0 ? (
        <EmptyState
          icon={<Ban size={24} />}
          title={t("me.noBlockedUsers")}
          text={t("me.blockedDesc")}
        />
      ) : (
        <div class={s.friendGrid}>
          {blocked.map((username) => (
            <div key={username} class={s.friendCard}>
              <a href={`/profile/${username}`} style={{ display: "contents" }}>
                <UserAvatar username={username} className={s.friendAvatar} />
                <div class={s.friendInfo}>
                  <div class={s.friendName}>@{username}</div>
                  <div class={s.friendHandle}>{t("me.blocked")}</div>
                </div>
              </a>
              <div class={s.friendActions}>
                <button
                  class={`${s.iconBtn} ${s.iconBtnSuccess}`}
                  onClick={() => onUnblock(username)}
                  title={t("me.unblockUser")}
                  aria-label={t("me.unblockUser")}
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
    restrictedShow: boolean;
    color: string;
  }
> = {
  good: {
    label: "standing.goodStanding",
    description: "standing.goodDesc",
    allowed: "standing.allFeatures",
    restricted: "standing.none",
    restrictedShow: false,
    color: "#4ade80",
  },
  warning: {
    label: "standing.warning",
    description: "standing.warningDesc",
    allowed: "standing.warningAllowed",
    restricted: "standing.warningRestricted",
    restrictedShow: true,
    color: "#fbbf24",
  },
  suspended: {
    label: "standing.suspended",
    description: "standing.suspendedDesc",
    allowed: "standing.browsing",
    restricted: "standing.suspendedRestricted",
    restrictedShow: true,
    color: "#f87171",
  },
  banned: {
    label: "standing.banned",
    description: "standing.bannedDesc",
    allowed: "standing.nothing",
    restricted: "standing.allFeatures",
    restrictedShow: true,
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
  const { t } = useI18n();
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
      title={t("standing.title")}
      subtitle={
        willRecover
          ? `${t("standing.recovers")} ${new Date(recoversMs).toLocaleString()}`
          : t("standing.currentStatus")
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
          {t(info.label)}
        </span>
      }
    >
      <div class={s.standingDescription}>
        <Info size={16} />
        <span>{t(info.description)}</span>
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
                  <div class={s.standingLevelLabel}>{t(li.label)}</div>
                  <div class={s.standingLevelAllowed}>
                    <span class={s.standingLevelAllowedLabel}>{t("standing.allowed")}</span>{" "}
                    {t(li.allowed)}
                  </div>
                  {li.restrictedShow && (
                    <div class={s.standingLevelRestricted}>
                      <span class={s.standingLevelAllowedLabel}>
                        {t("standing.restricted")}
                      </span>{" "}
                      {t(li.restricted)}
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
            <Clock size={14} /> {t("standing.recentChanges")}
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
                        {t(li.label)}
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
