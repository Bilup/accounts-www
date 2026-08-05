import { useState, useEffect } from "preact/hooks";
import {
  Users,
  Megaphone,
  Shield,
  Calendar,
  Coins,
  Globe,
  Lock,
  Crown,
  ArrowLeft,
  UserPlus,
  LogIn,
  LogOut,
  UserMinus,
  Plus,
  Trash2,
  Edit3,
  VolumeX,
  Volume2,
  Send,
  Search,
  Bell,
  BellOff,
  KeyRound,
  Sparkles,
  Save,
  X,
  Info,
  MapPin,
  Copy,
  BookOpen,
  ScrollText,
  ImagePlus,
} from "lucide-preact";
import {
  AccountPage,
  AccountSection,
  AccountTabPanel,
  AccountTabs,
} from "../../components/AccountPage";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth, getToken, formatRelativeTime } from "../../lib/auth";
import { plural } from "../../lib/format";
import { useI18n } from "../../i18n/i18n";
import s from "./GroupDetail.module.css";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useConfirm } from "../../components/ConfirmDialog";

const API_BASE_URL = "https://api.accounts.bilup.org";

type JoinPolicy = "OPEN" | "REQUEST" | "INVITE";
type EventVisibility = "MEMBERS" | "PUBLIC";

interface GroupPublic {
  id: string;
  tag: string;
  name: string;
  description: string;
  readme: string;
  rules: string;
  icon_url: string;
  banner_url: string;
  owner_user_id: string;
  public: boolean;
  join_policy: JoinPolicy;
  entry_fee: number;
  created_at: number;
  credits_balance: number;
  credits_balance_visible?: boolean;
  member_count: number;
}

interface GroupAnnouncement {
  id: string;
  group_tag: string;
  title: string;
  body: string;
  author_username: string;
  author_user_id?: string;
  created_at: number;
  ping_members: boolean;
}

interface GroupRole {
  id: string;
  group_tag: string;
  name: string;
  description: string;
  assign_on_join: boolean;
  self_assignable: boolean;
  benefits: string[];
  permissions: string[];
}

interface GroupMember {
  id: string;
  group_tag: string;
  user_id: string;
  username: string;
  role_ids: string[];
  joined_at: number;
  muted_announcements: boolean;
}

interface GroupEvent {
  id: string;
  group_tag: string;
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  location: string;
  visibility: EventVisibility;
  created_by: string;
  published: boolean;
}

interface GroupTip {
  id: string;
  group_tag: string;
  from_username: string;
  from_user_id?: string;
  amount_credits: number;
  note: string;
  created_at: number;
}

interface GroupProduct {
  id: string;
  group_tag: string;
  name: string;
  description: string;
  price_credits: number;
  role_granted_id?: string;
  role_name?: string;
  benefit_granted?: string;
  subscription: boolean;
  frequency?: number;
  period?: "day" | "week" | "month" | "year";
}

interface GroupInvite {
  id: string;
  group_tag: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  to_username: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";
  created_at: number;
}

interface GroupJoinRequest {
  id: string;
  group_tag: string;
  user_id: string;
  username: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  created_at: number;
}

interface GroupBan {
  id: string;
  group_tag: string;
  user_id: string;
  username: string;
  banned_by_id: string;
  banned_by: string;
  reason: string;
  created_at: number;
}

interface GroupWithdrawal {
  id: string;
  group_tag: string;
  to_username: string;
  amount_credits: number;
  created_at: number;
}

type DetailTab =
  | "overview"
  | "announcements"
  | "members"
  | "roles"
  | "events"
  | "tips"
  | "admin";

const ALL_PERMISSIONS = [
  "groups.manage",
  "groups.members.invite",
  "groups.members.remove",
  "groups.members.ban",
  "groups.members.view",
  "groups.roles.manage",
  "groups.roles.assign",
  "groups.announcements.send",
  "groups.events.manage",
  "groups.events.publish",
  "groups.tips.manage",
  "groups.tips.withdraw",
  "groups.tips.deposit",
  "groups.group.edit",
];

const PERMISSION_LABELS: Record<string, string> = {
  "groups.manage": "group.perm.groups.manage",
  "groups.members.invite": "group.perm.groups.members.invite",
  "groups.members.remove": "group.perm.groups.members.remove",
  "groups.members.ban": "group.perm.groups.members.ban",
  "groups.members.view": "group.perm.groups.members.view",
  "groups.roles.manage": "group.perm.groups.roles.manage",
  "groups.roles.assign": "group.perm.groups.roles.assign",
  "groups.announcements.send": "group.perm.groups.announcements.send",
  "groups.events.manage": "group.perm.groups.events.manage",
  "groups.events.publish": "group.perm.groups.events.publish",
  "groups.tips.manage": "group.perm.groups.tips.manage",
  "groups.tips.withdraw": "group.perm.groups.tips.withdraw",
  "groups.tips.deposit": "group.perm.groups.tips.deposit",
  "groups.group.edit": "group.perm.groups.group.edit",
};

const JOIN_POLICY_OPTIONS: { value: JoinPolicy; label: string }[] = [
  { value: "OPEN", label: "group.policyOpen" },
  { value: "REQUEST", label: "group.policyRequest" },
  { value: "INVITE", label: "group.policyInvite" },
];

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString();
}

function formatDateTime(epoch: number): string {
  return new Date(epoch * 1000).toLocaleString();
}

function authQs(): string {
  const t = getToken();
  return t ? `&auth=${encodeURIComponent(t)}` : "";
}

export function GroupDetail(props: { matches?: { grouptag?: string } }) {
  const tag = props.matches?.grouptag || getTagFromUrl();
  const { user, isLoggedIn, reload: reloadUser } = useAuth();
  const { t } = useI18n();

  const [group, setGroup] = useState<GroupPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMember, setIsMember] = useState(false);
  const [myRoles, setMyRoles] = useState<GroupRole[]>([]);
  const [myPermissions, setMyPermissions] = useState<Set<string>>(new Set());
  const [representing, setRepresenting] = useState(false);
  const [groupRoles, setGroupRoles] = useState<GroupRole[]>([]);

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  // Joining can charge an entry fee — guard against a double-click charging twice.
  const [joining, setJoining] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [joinOpen, setJoinOpen] = useState(false);
  const joinTrapRef = useFocusTrap<HTMLDivElement>(joinOpen);
  const [joinMessage, setJoinMessage] = useState("");
  const [rulesAgreed, setRulesAgreed] = useState(false);

  useEffect(() => {
    if (!tag) return;
    loadGroup();
    loadGroupRoles();
  }, [tag]);

  useEffect(() => {
    if (!user || !tag) return;
    loadMyMembership();
  }, [user, tag]);

  useEffect(() => {
    setRepresenting(!!user && !!group && user["sys.group"] === group.id);
  }, [user, group]);

  async function loadGroupRoles() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/roles?${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setGroupRoles(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }

  async function loadGroup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}?${authQs().slice(1)}`,
      );
      if (res.status === 404) {
        setError(t("group.notFound"));
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
      } else {
        setError(data.error || t("group.failedLoad"));
      }
    } catch {
      setError(t("group.networkError"));
    }
    setLoading(false);
  }

  async function loadMyMembership() {
    if (!user) return;
    try {
      const permsRes = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(user["sys.id"] || user.username)}/permissions?${authQs().slice(1)}`,
      );
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        const perms = new Set<string>(permsData.permissions || []);
        setMyPermissions(perms);
        setIsMember(true);

        const rolesRes = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(user["sys.id"] || user.username)}/roles?${authQs().slice(1)}`,
        );
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setMyRoles(rolesData.roles || []);
        }
      } else {
        setIsMember(false);
        setMyRoles([]);
        setMyPermissions(new Set());
      }
    } catch {
      /* ignore */
    }
  }

  function hasPerm(perm: string): boolean {
    return isOwner || myPermissions.has(perm);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && joinOpen && !joining) setJoinOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [joinOpen, joining]);

  // Opens the join dialog. The rules, the entry fee and the request message all
  // belong in one reviewable surface — a native confirm() truncates long rules,
  // so people were agreeing to text they couldn't actually read.
  function joinGroup() {
    if (joining) return;
    if (!isLoggedIn) {
      window.location.href = `/auth?return_to=${encodeURIComponent(
        window.location.origin + window.location.pathname,
      )}`;
      return;
    }
    setJoinMessage("");
    setRulesAgreed(false);
    setJoinOpen(true);
  }

  async function confirmJoin() {
    if (joining || !group) return;
    setActionMessage(null);
    setJoining(true);
    try {
      if (group.join_policy === "REQUEST") {
        const params = new URLSearchParams();
        if (joinMessage.trim()) params.set("message", joinMessage.trim());
        const requestRes = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join_requests?${params.toString()}&${authQs().slice(1)}`,
          { method: "POST" },
        );
        const requestData = await requestRes.json();
        if (requestRes.ok) {
          setActionMessage({ text: t("group.joinRequestSent"), type: "success" });
          setJoinOpen(false);
        } else {
          setActionMessage({
            text: requestData.error || t("group.requestFailed"),
            type: "error",
          });
        }
        return;
      }
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: t("group.joined"), type: "success" });
        setJoinOpen(false);
        if (reloadUser) await reloadUser();
        loadGroup();
        loadMyMembership();
      } else {
        setActionMessage({
          text: data.error || t("group.joinFailed"),
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: t("group.networkError"), type: "error" });
    } finally {
      setJoining(false);
    }
  }

  async function leaveGroup() {
    const ok = await confirm({
      title: t("group.leaveConfirm", { name: group?.name || tag }),
      message: t("group.leaveMsg"),
      confirmLabel: t("group.leaveBtn"),
      danger: true,
    });
    if (!ok) return;
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/leave?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: t("group.left"), type: "success" });
        loadGroup();
        loadMyMembership();
      } else {
        setActionMessage({
          text: data.error || t("group.leaveFailed"),
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: t("group.networkError"), type: "error" });
    }
  }

  async function reportGroup() {
    const ok = await confirm({
      title: t("group.reportConfirm"),
      message: t("group.reportMsg"),
      confirmLabel: t("group.reportBtn"),
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/report?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: t("group.reportSent"), type: "success" });
      } else {
        setActionMessage({
          text: data.error || t("group.reportFailed"),
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: t("group.networkError"), type: "error" });
    }
  }

  async function representGroup() {
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/rep?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setRepresenting(true);
        setActionMessage({
          text: "Now showing on profile.",
          type: "success",
        });
        if (reloadUser) await reloadUser();
      } else {
        setActionMessage({
          text: data.error || t("group.showFailed"),
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: t("group.networkError"), type: "error" });
    }
  }

  async function disrepresentGroup() {
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/disrep?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setRepresenting(false);
        setActionMessage({
          text: t("group.stoppedRepresenting"),
          type: "success",
        });
        if (reloadUser) await reloadUser();
      } else {
        setActionMessage({
          text: data.error || t("group.representFailed"),
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: t("group.networkError"), type: "error" });
    }
  }

  async function copyLink() {
    const url = `${location.origin}/groups/${encodeURIComponent(tag)}`;
    try {
      await navigator.clipboard.writeText(url);
      setActionMessage({ text: t("group.linkCopied"), type: "success" });
      setTimeout(() => setActionMessage(null), 2000);
    } catch {
      /* ignore */
    }
  }

  const isOwner = !!user && !!group && user.username === group.owner_user_id;

  async function uploadHeaderImage(kind: "icon" | "banner", file?: File) {
    if (!file || !group) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionMessage({ text: t("group.imageTooLarge"), type: "error" });
      return;
    }
    setActionMessage(null);
    try {
      const fd = new FormData();
      fd.append(kind, file);
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(group.tag)}/${kind}?${authQs().slice(1)}`,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          text: kind === "icon" ? t("group.iconUpdated") : t("group.bannerUpdated"),
          type: "success",
        });
        await loadGroup();
      } else {
        setActionMessage({
          text:
            data.error ||
            `${kind === "icon" ? t("group.updateIcon") : t("group.updateBanner")} ${t("group.uploadFailed")}`,
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: t("group.networkError"), type: "error" });
    }
  }

  if (loading) {
    return (
      <AccountPage layoutClassName={s.wideLayout}>
        <div class={s.loading}>{t("group.loading")}</div>
      </AccountPage>
    );
  }

  if (error || !group) {
    return (
      <AccountPage layoutClassName={s.wideLayout}>
        <a class={s.backBtn} href="/groups">
          <ArrowLeft size={14} /> {t("group.backToGroups")}
        </a>
        <div class={s.notFound}>
          <div class={s.notFoundIcon}>
            <Info size={32} />
          </div>
          <div class={s.notFoundTitle}>{error || t("group.notFoundTitle")}</div>
          <div class={s.notFoundText}>{t("group.notFoundText")}</div>
        </div>
      </AccountPage>
    );
  }

  const tabs: { id: DetailTab; label: string; icon: typeof Users }[] = [
    { id: "overview", label: t("group.tabOverview"), icon: Info },
    { id: "announcements", label: t("group.tabAnnouncements"), icon: Megaphone },
    { id: "members", label: t("group.tabMembers"), icon: Users },
    { id: "roles", label: t("group.tabRoles"), icon: Shield },
    { id: "events", label: t("group.tabEvents"), icon: Calendar },
    { id: "tips", label: t("group.tabTips"), icon: Coins },
  ];
  const canAdmin =
    hasPerm("groups.members.invite") ||
    hasPerm("groups.members.remove") ||
    hasPerm("groups.members.ban") ||
    hasPerm("groups.tips.withdraw") ||
    hasPerm("groups.manage");
  if (canAdmin) {
    tabs.push({ id: "admin", label: t("group.tabAdmin"), icon: Shield });
  }
  const canEditBrand = hasPerm("groups.group.edit") || hasPerm("groups.manage");

  return (
    <AccountPage layoutClassName={s.wideLayout}>
      {confirmDialog}
      <a class={s.backBtn} href="/groups">
        <ArrowLeft size={14} /> {t("group.backToGroups")}
      </a>

      <div class={s.headerCard}>
        <div class={s.bannerFrame}>
          {group.banner_url ? (
            <div
              class={s.banner}
              style={{ backgroundImage: `url(${group.banner_url})` }}
            />
          ) : (
            <div class={s.bannerPlaceholder}>
              <Megaphone size={36} />
            </div>
          )}
          {canEditBrand && (
            <label class={s.bannerUpload} title={t("group.updateBanner")}>
              <ImagePlus size={14} />
              <span>{t("group.updateBanner")}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const input = e.target as HTMLInputElement;
                  uploadHeaderImage("banner", input.files?.[0]);
                  input.value = "";
                }}
              />
            </label>
          )}
        </div>
        <div class={s.headerBody}>
          <div class={s.headerTop}>
            <div class={s.iconFrame}>
              {group.icon_url ? (
                <img src={group.icon_url} alt={group.name} class={s.icon} />
              ) : (
                <div class={s.iconPlaceholder}>
                  <Users size={28} />
                </div>
              )}
              {canEditBrand && (
                <label class={s.iconUpload} title={t("group.updateIcon")}>
                  <ImagePlus size={14} />
                  <span>{t("group.updateIcon")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const input = e.target as HTMLInputElement;
                      uploadHeaderImage("icon", input.files?.[0]);
                      input.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <div class={s.headerTitles}>
              <div class={s.groupNameHeader}>
                <h1 class={s.groupName}>{group.name}</h1>
                <div class={s.groupTag}>@{group.tag}</div>
              </div>
              <div class={s.headerMeta}>
                <span class={s.metaChip}>
                  {group.public ? <Globe size={11} /> : <Lock size={11} />}{" "}
                  {group.public ? t("group.publicLabel") : t("group.privateLabel")}
                </span>
                <span class={s.metaChip}>
                  <Users size={11} /> {group.member_count} {t("group.members")}
                </span>
                <span class={s.metaChip}>
                  <Crown size={11} /> {group.owner_user_id}
                </span>
                <span class={s.metaChip}>
                  <Calendar size={11} /> {formatDate(group.created_at)}
                </span>
                {group.entry_fee > 0 && (
                  <span class={s.metaChip}>
                    <Coins size={11} /> {group.entry_fee.toLocaleString()}{" "}
                    {t("group.toJoin")}
                  </span>
                )}
                {group.credits_balance_visible && group.credits_balance > 0 && (
                  <span class={s.metaChip}>
                    <Coins size={11} /> {group.credits_balance.toLocaleString()}{" "}
                    {t("group.balance")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {group.description && (
            <div class={s.description}>{group.description}</div>
          )}

          {actionMessage && (
            <div class={actionMessage.type === "success" ? s.success : s.error}>
              {actionMessage.text}
            </div>
          )}

          <div class={s.headerActions}>
            <button class={s.btnSecondary} onClick={copyLink}>
              <Copy size={13} /> {t("group.copyLink")}
            </button>

            {!isLoggedIn && (
              <a
                class={s.btnPrimary}
                href={`/auth?return_to=${encodeURIComponent(
                  window.location.origin + window.location.pathname,
                )}`}
              >
                <UserPlus size={13} /> {t("group.signInToJoin")}
              </a>
            )}

            {isLoggedIn && !isMember && group.public && (
              <button
                class={s.btnPrimary}
                onClick={joinGroup}
                disabled={joining}
              >
                <UserPlus size={13} />{" "}
                {joining
                  ? t("group.joining")
                  : group.join_policy === "REQUEST"
                    ? t("group.requestToJoin")
                    : group.entry_fee > 0
                      ? t("group.joinCredits", {
                          price: String(group.entry_fee),
                        })
                      : group.join_policy === "INVITE"
                        ? t("group.joinWithInvite")
                        : t("group.joinGroupBtn")}
              </button>
            )}

            {isLoggedIn && isMember && !isOwner && (
              <button class={s.btnDanger} onClick={leaveGroup}>
                <LogOut size={13} /> {t("group.leave")}
              </button>
            )}

            {isLoggedIn && isMember && (
              <>
                {representing ? (
                  <button class={s.btnSecondary} onClick={disrepresentGroup}>
                    <BellOff size={13} /> {t("group.stopRepresenting")}
                  </button>
                ) : (
                  <button class={s.btnPrimary} onClick={representGroup}>
                    <Sparkles size={13} /> {t("group.showOnProfile")}
                  </button>
                )}
              </>
            )}

            {isLoggedIn && (
              <button class={s.btnSecondary} onClick={reportGroup}>
                {t("group.report")}
              </button>
            )}
          </div>
        </div>
      </div>

      <AccountTabs
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel={t("group.sectionsAria")}
      />

      <AccountTabPanel>
        {activeTab === "overview" && (
          <OverviewTab
            group={group}
            isMember={isMember}
            myRoles={myRoles}
            hasPerm={hasPerm}
            onUpdated={() => {
              loadGroup();
              setActionMessage({
                text: t("group.groupUpdated"),
                type: "success",
              });
            }}
            onMessage={setActionMessage}
          />
        )}

        {activeTab === "announcements" && (
          <AnnouncementsTab
            tag={tag}
            canPost={hasPerm("groups.announcements.send")}
            isMember={isMember}
          />
        )}

        {activeTab === "members" && (
          <MembersTab
            tag={tag}
            groupRoles={groupRoles}
            myRoles={myRoles}
            myPermissions={myPermissions}
            isOwner={isOwner}
            isMember={isMember}
          />
        )}

        {activeTab === "roles" && (
          <RolesTab
            tag={tag}
            groupRoles={groupRoles}
            onRolesChanged={loadGroupRoles}
            canManage={hasPerm("groups.roles.manage")}
            isMember={isMember}
            onMembershipChanged={() => {
              loadMyMembership();
              loadGroup();
              loadGroupRoles();
            }}
          />
        )}

        {activeTab === "events" && (
          <EventsTab
            tag={tag}
            canManage={hasPerm("groups.events.manage")}
            canPublish={hasPerm("groups.events.publish")}
            isMember={isMember}
            isPublic={group.public}
          />
        )}

        {activeTab === "tips" && (
          <TipsTab
            tag={tag}
            isMember={isMember}
            isPublic={group.public}
            groupBalance={group.credits_balance}
            balanceVisible={!!group.credits_balance_visible}
            onSent={() => {
              loadGroup();
              setActionMessage({
                text: t("group.tipSent"),
                type: "success",
              });
            }}
          />
        )}

        {activeTab === "admin" && canAdmin && (
          <AdminTab
            tag={tag}
            group={group}
            isOwner={isOwner}
            canInvite={hasPerm("groups.members.invite")}
            canRemove={hasPerm("groups.members.remove")}
            canBan={hasPerm("groups.members.ban")}
            canWithdraw={hasPerm("groups.tips.withdraw")}
            canViewMembers={hasPerm("groups.members.view")}
            onGroupChanged={loadGroup}
          />
        )}
      </AccountTabPanel>

      {joinOpen && (
        <div
          class={s.modalBackdrop}
          role="presentation"
          onClick={() => !joining && setJoinOpen(false)}
        >
          <div
            ref={joinTrapRef}
            tabIndex={-1}
            class={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div class={s.modalHeader}>
              <div>
                <h2 id="join-modal-title" class={s.modalTitle}>
                  {group.join_policy === "REQUEST"
                    ? t("group.joinRequestTitle")
                    : t("group.joinGroupTitle")}
                </h2>
                <p class={s.modalSubtitle}>{group.name}</p>
              </div>
              <button
                class={s.iconButton}
                aria-label={t("group.close")}
                disabled={joining}
                onClick={() => setJoinOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div class={s.modalBody}>
              {group.rules && group.rules.trim() && (
                <div class={s.joinSection}>
                  <h4 class={s.manageListTitle}>{t("group.groupRules")}</h4>
                  <div class={s.joinRules}>{group.rules}</div>
                  <label class={s.joinAgree}>
                    <input
                      type="checkbox"
                      checked={rulesAgreed}
                      onChange={(e) =>
                        setRulesAgreed((e.target as HTMLInputElement).checked)
                      }
                    />
                    <span>{t("group.agreeToRules")}</span>
                  </label>
                </div>
              )}

              {group.entry_fee > 0 && (
                <div class={s.joinFee}>
                  <Coins size={14} />
                  <span>
                    {t("group.joiningCosts")}{" "}
                    <strong>
                      {group.entry_fee.toLocaleString()} {t("keys.creditsUnit")}
                    </strong>
                    . {t("group.deductedImmediately")}
                  </span>
                </div>
              )}

              {group.join_policy === "REQUEST" && (
                <div class={s.joinSection}>
                  <label class={s.manageListTitle} for="join-message">
                    {t("group.messageForAdmins")}
                  </label>
                  <textarea
                    id="join-message"
                    class={s.formInput}
                    rows={3}
                    maxLength={500}
                    value={joinMessage}
                    disabled={joining}
                    placeholder={t("group.whyDoYouWantToJoin")}
                    onInput={(e) =>
                      setJoinMessage((e.target as HTMLTextAreaElement).value)
                    }
                  />
                </div>
              )}

              {actionMessage && actionMessage.type === "error" && (
                <div class={s.error} role="alert">
                  {actionMessage.text}
                </div>
              )}

              <div class={s.formActions}>
                <button
                  class={s.btnPrimary}
                  onClick={confirmJoin}
                  disabled={
                    joining ||
                    (!!group.rules && !!group.rules.trim() && !rulesAgreed)
                  }
                >
                  {joining
                    ? t("group.working")
                    : group.join_policy === "REQUEST"
                      ? t("group.sendRequest")
                      : group.entry_fee > 0
                        ? t("group.joinForCredits", {
                            price: group.entry_fee.toLocaleString(),
                          })
                        : t("group.joinGroupTitle")}
                </button>
                <button
                  class={s.btnSecondary}
                  onClick={() => setJoinOpen(false)}
                  disabled={joining}
                >
                  {t("group.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AccountPage>
  );
}

function getTagFromUrl(): string {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("groups");
  if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
  return "";
}

// ── Overview tab ──

function OverviewTab({
  group,
  isMember,
  myRoles,
  hasPerm,
  onUpdated,
  onMessage,
}: {
  group: GroupPublic;
  isMember: boolean;
  myRoles: GroupRole[];
  hasPerm: (perm: string) => boolean;
  onUpdated: () => void;
  onMessage: (m: { text: string; type: "success" | "error" } | null) => void;
}) {
  const { t } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [groupTag, setGroupTag] = useState(group.tag);
  const [description, setDescription] = useState(group.description);
  const [readme, setReadme] = useState(group.readme || "");
  const [rules, setRules] = useState(group.rules || "");
  const [entryFee, setEntryFee] = useState(String(group.entry_fee || 0));
  const [isPublic, setIsPublic] = useState(group.public);
  const [policy, setPolicy] = useState<JoinPolicy>(group.join_policy);
  const [busy, setBusy] = useState(false);

  async function save() {
    const nextTag = groupTag.trim();
    if (!name.trim()) {
      onMessage({ text: t("group.nameRequired"), type: "error" });
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(nextTag)) {
      onMessage({ text: t("group.tagAlphanumeric"), type: "error" });
      return;
    }
    if (nextTag.length > 10) {
      onMessage({ text: t("group.tagMaxLength"), type: "error" });
      return;
    }
    const fee = parseFloat(entryFee);
    if (entryFee.trim() && (isNaN(fee) || fee < 0)) {
      onMessage({
        text: t("group.entryFeeNonNegative"),
        type: "error",
      });
      return;
    }
    setBusy(true);
    onMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(group.tag)}?${authQs().slice(1)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            tag: nextTag,
            description,
            readme,
            rules,
            entry_fee: fee,
            public: isPublic,
            join_policy: policy,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        if (data.tag && data.tag !== group.tag) {
          window.location.href = `/groups/${encodeURIComponent(data.tag)}`;
          return;
        }
        onUpdated();
        setEditing(false);
      } else {
        onMessage({ text: data.error || t("group.failedUpdate"), type: "error" });
      }
    } catch {
      onMessage({ text: t("group.networkError"), type: "error" });
    }
    setBusy(false);
  }

  async function deleteGroup() {
    const ok = await confirm({
      title: t("group.deleteConfirmTitle", { name: group.name }),
      message: t("group.deleteConfirmMsg"),
      confirmLabel: t("group.deleteBtn"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(group.tag)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/groups";
      } else {
        onMessage({ text: data.error || t("group.failedDelete"), type: "error" });
      }
    } catch {
      onMessage({ text: t("group.networkError"), type: "error" });
    }
  }

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      {isMember && myRoles.length > 0 && (
        <AccountSection
          icon={<KeyRound size={18} />}
          title={t("group.yourRoles")}
          subtitle={`${myRoles.length} ${plural(myRoles.length, t("group.role"))}`}
        >
          <div class={s.rolesList}>
            {myRoles.map((r) => (
              <div key={r.id} class={s.roleCard}>
                <div class={s.roleName}>{r.name}</div>
                {r.description && (
                  <div class={s.roleDescription}>{r.description}</div>
                )}
                {r.permissions.length > 0 && (
                  <div class={s.rolePermissions}>
                    {r.permissions.map((p) => (
                      <span key={p} class={s.permTag}>
                        {t(PERMISSION_LABELS[p] || p)}
                      </span>
                    ))}
                  </div>
                )}
                {r.benefits && r.benefits.length > 0 && (
                  <div class={s.rolePermissions}>
                    {r.benefits.map((b) => (
                      <span key={b} class={s.permTag}>
                        <Sparkles size={10} /> {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AccountSection>
      )}

      <AccountSection
        icon={<Info size={18} />}
        title={t("group.about")}
        subtitle={t("group.aboutSub")}
        actions={
          (hasPerm("groups.group.edit") || hasPerm("groups.manage")) &&
          !editing && (
            <>
              {hasPerm("groups.group.edit") && (
                <button class={s.btnSecondary} onClick={() => setEditing(true)}>
                  <Edit3 size={13} /> {t("group.edit")}
                </button>
              )}
              {hasPerm("groups.manage") && (
                <button class={s.btnDanger} onClick={deleteGroup}>
                  <Trash2 size={13} /> {t("group.delete")}
                </button>
              )}
            </>
          )
        }
      >
        {editing ? (
          <div>
            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label>{t("group.nameLabel")}</label>
                <input
                  type="text"
                  class={s.formInput}
                  maxlength={50}
                  value={name}
                  onInput={(e) => setName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class={s.formGroup}>
                <label>{t("group.tagLabel")}</label>
                <input
                  type="text"
                  class={s.formInput}
                  maxlength={10}
                  value={groupTag}
                  onInput={(e) =>
                    setGroupTag((e.target as HTMLInputElement).value)
                  }
                />
                <small class={s.formHint}>{t("group.tagHint")}</small>
              </div>
            </div>
            <div class={s.formGroup}>
              <label>{t("group.descriptionLabel")}</label>
              <textarea
                class={s.formInput}
                rows={4}
                maxlength={500}
                value={description}
                onInput={(e) =>
                  setDescription((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {t("group.charCount", { count: description.length })}
              </small>
            </div>
            <div class={s.formGroup}>
              <label>{t("group.readme")}</label>
              <textarea
                class={s.formInput}
                rows={6}
                maxlength={10000}
                placeholder={t("group.readmePlaceholder")}
                value={readme}
                onInput={(e) =>
                  setReadme((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {t("group.readmeCharCount", { count: readme.length })}
              </small>
            </div>
            <div class={s.formGroup}>
              <label>{t("group.rulesLabel")}</label>
              <textarea
                class={s.formInput}
                rows={4}
                maxlength={5000}
                placeholder={t("group.rulesPlaceholder")}
                value={rules}
                onInput={(e) =>
                  setRules((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {t("group.rulesCharCount", { count: rules.length })}
              </small>
            </div>
            <div class={s.formGroup}>
              <label>{t("group.entryFeeLabel")}</label>
              <input
                type="number"
                class={s.formInput}
                min={0}
                step="0.01"
                value={entryFee}
                onInput={(e) =>
                  setEntryFee((e.target as HTMLInputElement).value)
                }
              />
              <small class={s.formHint}>{t("group.entryFeeHint")}</small>
            </div>
            <div class={s.formGroup}>
              <div class={s.checkboxGroup}>
                <input
                  type="checkbox"
                  id="overview-public"
                  checked={isPublic}
                  onChange={(e) =>
                    setIsPublic((e.target as HTMLInputElement).checked)
                  }
                />
                <label for="overview-public">{t("group.publicGroup")}</label>
              </div>
            </div>
            <div class={s.formGroup}>
              <label>{t("group.joinPolicy")}</label>
              <select
                class={s.formInput}
                value={policy}
                onChange={(e) =>
                  setPolicy((e.target as HTMLSelectElement).value as JoinPolicy)
                }
              >
                {JOIN_POLICY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.label)}
                  </option>
                ))}
              </select>
            </div>
            <div class={s.formActions}>
              <button class={s.btnPrimary} onClick={save} disabled={busy}>
                <Save size={13} />{" "}
                {busy ? t("group.saving") : t("group.saveChanges")}
              </button>
              <button
                class={s.btnSecondary}
                onClick={() => {
                  setEditing(false);
                  setName(group.name);
                  setGroupTag(group.tag);
                  setDescription(group.description);
                  setReadme(group.readme || "");
                  setRules(group.rules || "");
                  setEntryFee(String(group.entry_fee || 0));
                  setIsPublic(group.public);
                  setPolicy(group.join_policy);
                }}
              >
                <X size={13} /> {t("group.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div class={s.detailGrid}>
              <div class={s.detailItem}>
                <h4>{t("group.descriptionLabel")}</h4>
                <div class={s.detailValue}>
                  {group.description || t("group.noDescription")}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>{t("group.visibility")}</h4>
                <div class={s.detailValue}>
                  {group.public ? t("group.publicLabel") : t("group.privateLabel")}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>{t("group.joinPolicy")}</h4>
                <div class={s.detailValue}>
                  {(() => {
                    const opt = JOIN_POLICY_OPTIONS.find(
                      (o) => o.value === group.join_policy,
                    );
                    return opt ? t(opt.label) : group.join_policy;
                  })()}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>{t("group.entryFeeLabel")}</h4>
                <div class={s.detailValue}>
                  {group.entry_fee > 0
                    ? t("group.entryFeeDisplay", {
                        fee: group.entry_fee.toLocaleString(),
                      })
                    : t("group.free")}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>{t("group.owner")}</h4>
                <div class={s.detailValue}>{group.owner_user_id}</div>
              </div>
              <div class={s.detailItem}>
                <h4>{t("group.membersLabel")}</h4>
                <div class={s.detailValue}>{group.member_count}</div>
              </div>
              {group.credits_balance_visible && (
                <div class={s.detailItem}>
                  <h4>{t("group.creditBalance")}</h4>
                  <div class={s.detailValue}>
                    {group.credits_balance.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {group.readme && group.readme.trim() && (
              <div class={s.readmeBlock}>
                <h3 class={s.readmeTitle}>
                  <BookOpen size={14} /> {t("group.readmeTitle")}
                </h3>
                <pre class={s.readmeContent}>{group.readme}</pre>
              </div>
            )}

            {group.rules && group.rules.trim() && (
              <div class={s.rulesBlock}>
                <h3 class={s.readmeTitle}>
                  <ScrollText size={14} /> {t("group.groupRulesTitle")}
                </h3>
                <pre class={s.readmeContent}>{group.rules}</pre>
              </div>
            )}
          </div>
        )}
      </AccountSection>
    </div>
  );
}

// ── Announcements tab ──

function AnnouncementsTab({
  tag,
  canPost,
  isMember,
}: {
  tag: string;
  canPost: boolean;
  isMember: boolean;
}) {
  const { t } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [items, setItems] = useState<GroupAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pingMembers, setPingMembers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(`group_muted_${tag}`) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`group_muted_${tag}`, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted, tag]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/announcements?limit=50&${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data) ? data : []);
      } else {
        // A failed load must not render as "no announcements".
        setMsg({
          text: data?.error || t("group.couldntLoadAnnouncements"),
          type: "error",
        });
      }
    } catch {
      setMsg({ text: t("group.networkErrorAnnouncements"), type: "error" });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function post() {
    if (!title.trim()) {
      setMsg({ text: t("group.titleRequired"), type: "error" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const params = new URLSearchParams();
      params.set("title", title.trim());
      if (body.trim()) params.set("body", body.trim());
      params.set("ping_members", String(pingMembers));
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/announcements?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.announcementPosted"), type: "success" });
        setTitle("");
        setBody("");
        setPingMembers(false);
        load();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
    setBusy(false);
  }

  async function del(id: string) {
    const ok = await confirm({
      title: t("group.deleteAnnouncement"),
      confirmLabel: t("group.delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/announcements/${encodeURIComponent(id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.announcementDeleted"), type: "success" });
        load();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  async function toggleMute() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/announcements/mute?${authQs().slice(1)}`,
        { method: "POST" },
      );
      if (res.ok) {
        setMuted((m) => !m);
        setMsg({
          text: muted ? t("group.unmuted") : t("group.mutedMsg"),
          type: "success",
        });
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      {isMember && (
        <AccountSection
          icon={muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          title={t("group.notifications")}
          subtitle={
            muted ? t("group.mutedSub") : t("group.notMutedSub")
          }
          actions={
            <button class={s.btnSecondary} onClick={toggleMute}>
              {muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {muted ? t("group.unmute") : t("group.mute")}
            </button>
          }
        />
      )}

      {canPost && (
        <AccountSection
          icon={<Plus size={18} />}
          title={t("group.newAnnouncement")}
          subtitle={t("group.newAnnouncementSub")}
        >
          <div class={s.formGroup}>
            <label>{t("group.title")}</label>
            <input
              type="text"
              class={s.formInput}
              placeholder={t("group.announcementTitlePlaceholder")}
              maxlength={100}
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class={s.formGroup}>
            <label>{t("group.body")}</label>
            <textarea
              class={s.formInput}
              rows={4}
              maxlength={2000}
              placeholder={t("group.announcementBodyPlaceholder")}
              value={body}
              onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          <div class={s.formGroup}>
            <div class={s.checkboxGroup}>
              <input
                type="checkbox"
                id="ann-ping"
                checked={pingMembers}
                onChange={(e) =>
                  setPingMembers((e.target as HTMLInputElement).checked)
                }
              />
              <label for="ann-ping">
                <Bell size={12} style={{ verticalAlign: "middle" }} />{" "}
                {t("group.pingMembers")}
              </label>
            </div>
          </div>
          <div class={s.formActions}>
            <button class={s.btnPrimary} onClick={post} disabled={busy}>
              <Send size={13} />{" "}
              {busy ? t("group.posting") : t("group.postAnnouncement")}
            </button>
          </div>
          {msg && (
            <div class={msg.type === "success" ? s.success : s.error}>
              {msg.text}
            </div>
          )}
        </AccountSection>
      )}

      <AccountSection
        icon={<Megaphone size={18} />}
        title={t("group.allAnnouncements")}
        subtitle={t("group.totalCount", { count: items.length })}
      >
        {loading && <div class={s.loading}>{t("group.loadingShort")}</div>}
        {!loading && items.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Megaphone size={24} />
            </div>
            <div class={s.emptyTitle}>{t("group.noAnnouncements")}</div>
            <div class={s.emptyText}>
              {canPost
                ? t("group.postFirstAnnouncement")
                : t("group.checkBackLater")}
            </div>
          </div>
        )}
        <div class={s.announcementList}>
          {items.map((a) => (
            <div key={a.id} class={s.announcementCard}>
              <div class={s.announcementHeader}>
                <h3 class={s.announcementTitle}>{a.title}</h3>
                {a.ping_members && (
                  <span class={s.pingBadge}>
                    <Bell size={10} /> {t("group.pingBadge")}
                  </span>
                )}
              </div>
              {a.body && <div class={s.announcementBody}>{a.body}</div>}
              <div class={s.announcementMeta}>
                <span>
                  {t("group.byUser", {
                    user: a.author_username || a.author_user_id || "",
                  })}
                </span>
                <span>•</span>
                <span title={formatDateTime(a.created_at)}>
                  {formatRelativeTime(a.created_at * 1000)}
                </span>
              </div>
              {canPost && (
                <div class={s.announcementActions}>
                  <button class={s.btnDanger} onClick={() => del(a.id)}>
                    <Trash2 size={12} /> {t("group.delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </AccountSection>
    </div>
  );
}

// ── Members tab ──

function MembersTab({
  tag,
  groupRoles,
  myRoles,
  myPermissions,
  isOwner,
  isMember,
}: {
  tag: string;
  groupRoles: GroupRole[];
  myRoles: GroupRole[];
  myPermissions: Set<string>;
  isOwner: boolean;
  isMember: boolean;
}) {
  const { t } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPages, setMembersPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [targetRoles, setTargetRoles] = useState<GroupRole[]>([]);
  const [roleModalMember, setRoleModalMember] = useState<GroupMember | null>(
    null,
  );
  const [roleModalRoles, setRoleModalRoles] = useState<GroupRole[]>([]);
  const roleTrapRef = useFocusTrap<HTMLDivElement>(!!roleModalMember);
  const [roleModalMsg, setRoleModalMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [lookupMsg, setLookupMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const canAssign = isOwner || myPermissions.has("groups.roles.assign");
  const canViewMembers = isOwner || myPermissions.has("groups.members.view");

  async function loadMembers(page: number) {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "20",
      });
      if (memberSearch.trim()) {
        params.set("search", memberSearch.trim());
      }
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members?${params}&${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setMembers(data.members || []);
        setMembersTotal(data.total || 0);
        setMembersPages(data.pages || 1);
      } else {
        // A failed load must not render as "no members".
        setMembersError(data?.error || t("group.couldntLoadMembers"));
      }
    } catch {
      setMembersError(t("group.networkErrorConn"));
    }
    setMembersLoading(false);
  }

  useEffect(() => {
    if (canViewMembers) {
      loadMembers(membersPage);
    }
  }, [tag, membersPage, canViewMembers]);

  function searchMembers() {
    setMembersPage(1);
    loadMembers(1);
  }

  async function lookup() {
    if (!targetUser.trim()) return;
    setBusy(true);
    setLookupMsg(null);
    setTargetRoles([]);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(targetUser.trim())}/roles?${authQs().slice(1)}`,
      );
      if (res.status === 404) {
        setLookupMsg({
          text: t("group.notMember", { user: targetUser }),
          type: "error",
        });
      } else if (res.ok) {
        const data = await res.json();
        setTargetRoles(data.roles || []);
        setLookupMsg({
          text: t("group.foundRoles", { count: data.roles?.length || 0 }),
          type: "success",
        });
      } else {
        const data = await res.json();
        setLookupMsg({ text: data.error || t("group.lookupFailed"), type: "error" });
      }
    } catch {
      setLookupMsg({ text: t("group.networkError"), type: "error" });
    }
    setBusy(false);
  }

  async function loadRolesFor(userId: string): Promise<GroupRole[] | null> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(userId)}/roles?${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        return data.roles || [];
      }
      setRoleModalMsg({ text: data.error || t("group.lookupFailed"), type: "error" });
    } catch {
      setRoleModalMsg({ text: t("group.networkError"), type: "error" });
    }
    return null;
  }

  async function openRoleModal(member: GroupMember) {
    setRoleModalMember(member);
    setRoleModalMsg(null);
    setRoleModalRoles([]);
    const roles = await loadRolesFor(member.user_id || member.username);
    if (roles) {
      setRoleModalRoles(roles);
    }
  }

  async function assignRole(userId: string, roleId: string) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setLookupMsg({ text: t("group.roleAssigned"), type: "success" });
        if (roleModalMember && roleModalMember.user_id === userId) {
          setRoleModalMsg({ text: t("group.roleAssigned"), type: "success" });
          const roles = await loadRolesFor(userId);
          if (roles) setRoleModalRoles(roles);
        } else {
          lookup();
        }
        loadMembers(membersPage);
      } else {
        setLookupMsg({ text: data.error || t("group.failed"), type: "error" });
        setRoleModalMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setLookupMsg({ text: t("group.networkError"), type: "error" });
      setRoleModalMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  async function removeRole(userId: string, roleId: string) {
    const ok = await confirm({
      title: t("group.removeRoleConfirm"),
      confirmLabel: t("group.removeRoleBtn"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setLookupMsg({ text: t("group.roleRemoved"), type: "success" });
        if (roleModalMember && roleModalMember.user_id === userId) {
          setRoleModalMsg({ text: t("group.roleRemoved"), type: "success" });
          const roles = await loadRolesFor(userId);
          if (roles) setRoleModalRoles(roles);
        } else {
          lookup();
        }
        loadMembers(membersPage);
      } else {
        setLookupMsg({ text: data.error || t("group.failed"), type: "error" });
        setRoleModalMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setLookupMsg({ text: t("group.networkError"), type: "error" });
      setRoleModalMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  const targetHasRole = (roleId: string) =>
    targetRoles.some((r) => r.id === roleId);
  const availableToAssign = groupRoles.filter(
    (r) => r.name !== "Owner" && !targetHasRole(r.id),
  );
  const modalRoleIds = new Set(roleModalRoles.map((r) => r.id));
  const modalAvailableToAssign = groupRoles.filter(
    (r) => r.name !== "Owner" && !modalRoleIds.has(r.id),
  );

  function getRoleName(roleId: string): string {
    const role = groupRoles.find((r) => r.id === roleId);
    return role?.name || roleId;
  }

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      <AccountSection
        icon={<Users size={18} />}
        title={t("group.yourMembership")}
        subtitle={
          isMember ? t("group.youAreMember") : t("group.youAreNotMember")
        }
      >
        {!isMember ? (
          <div class={s.empty}>
            <div class={s.emptyText}>{t("group.joinToSeeRoles")}</div>
          </div>
        ) : myRoles.length === 0 ? (
          <div class={s.empty}>
            <div class={s.emptyText}>{t("group.noRolesContact")}</div>
          </div>
        ) : (
          <div class={s.rolesList}>
            {myRoles.map((r) => (
              <div key={r.id} class={s.roleCard}>
                <div class={s.roleName}>{r.name}</div>
                {r.description && (
                  <div class={s.roleDescription}>{r.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </AccountSection>

      {canViewMembers && (
        <AccountSection
          icon={<Users size={18} />}
          title={t("group.membersTitle")}
          subtitle={`${membersTotal} ${plural(membersTotal, t("group.member"))}`}
        >
          <div class={s.actionRow}>
            <input
              type="text"
              class={s.formInput}
              placeholder={t("group.searchMembersPlaceholder")}
              aria-label={t("group.searchMembersAria")}
              value={memberSearch}
              onInput={(e) =>
                setMemberSearch((e.target as HTMLInputElement).value)
              }
              onKeyDown={(e) => {
                if ((e as KeyboardEvent).key === "Enter") searchMembers();
              }}
            />
            <button class={s.btnSecondary} onClick={searchMembers}>
              <Search size={13} /> {t("group.search")}
            </button>
          </div>
          {membersLoading ? (
            <div class={s.empty}>
              <div class={s.emptyText}>{t("group.loadingMembers")}</div>
            </div>
          ) : membersError ? (
            <div class={s.empty}>
              <div class={s.error} role="alert">
                {membersError}
              </div>
              <button
                class={s.btnSecondary}
                onClick={() => loadMembers(membersPage)}
              >
                {t("group.retry")}
              </button>
            </div>
          ) : members.length === 0 ? (
            <div class={s.empty}>
              <div class={s.emptyText}>{t("group.noMembersFound")}</div>
            </div>
          ) : (
            <>
              <div class={s.memberList}>
                {members.map((m) => (
                  <div key={m.id} class={s.memberRow}>
                    <a
                      class={s.memberProfileLink}
                      href={`/profile/${encodeURIComponent(m.username)}`}
                    >
                      <UserAvatar
                        username={m.username}
                        size={32}
                        showOverlay={false}
                      />
                      <div class={s.memberInfo}>
                        <div class={s.memberName}>{m.username}</div>
                        {m.role_ids.length > 0 && (
                          <div class={s.memberRoles}>
                            {m.role_ids.map((rid) => (
                              <span key={rid} class={s.miniTag}>
                                {getRoleName(rid)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </a>
                    <span class={s.memberJoined}>
                      {formatRelativeTime(m.joined_at * 1000)}
                    </span>
                    {canAssign && (
                      <button
                        class={s.btnSecondary}
                        onClick={() => openRoleModal(m)}
                      >
                        <Edit3 size={12} /> {t("group.editRoles")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {membersPages > 1 && (
                <div class={s.pagination}>
                  <button
                    class={s.btnSecondary}
                    disabled={membersPage <= 1}
                    onClick={() => setMembersPage((p) => p - 1)}
                  >
                    {t("group.prev")}
                  </button>
                  <span class={s.pageIndicator}>
                    {t("group.pageOf", {
                      page: membersPage,
                      total: membersPages,
                    })}
                  </span>
                  <button
                    class={s.btnSecondary}
                    disabled={membersPage >= membersPages}
                    onClick={() => setMembersPage((p) => p + 1)}
                  >
                    {t("group.next")}
                  </button>
                </div>
              )}
            </>
          )}
        </AccountSection>
      )}

      {canAssign && (
        <AccountSection
          icon={<UserPlus size={18} />}
          title={t("group.manageMemberRoles")}
          subtitle={t("group.manageMemberRolesSub")}
        >
          <div class={s.actionRow}>
            <input
              type="text"
              class={s.formInput}
              placeholder={t("group.usernamePlaceholder")}
              aria-label={t("group.usernameLookupAria")}
              value={targetUser}
              onInput={(e) =>
                setTargetUser((e.target as HTMLInputElement).value)
              }
            />
            <button
              class={s.btnPrimary}
              onClick={lookup}
              disabled={busy || !targetUser.trim()}
            >
              <Search size={13} />{" "}
              {busy ? t("group.lookingUp") : t("group.lookup")}
            </button>
          </div>
          {lookupMsg && (
            <div class={lookupMsg.type === "success" ? s.success : s.error}>
              {lookupMsg.text}
            </div>
          )}

          {targetUser && targetRoles.length > 0 && (
            <div class={s.manageList}>
              <h4 class={s.manageListTitle}>
                {t("group.rolesFor", { user: targetUser })}
              </h4>
              {targetRoles.map((r) => (
                <div key={r.id} class={s.manageRow}>
                  <div>
                    <div class={s.roleName}>{r.name}</div>
                    {r.description && (
                      <div class={s.roleDescription}>{r.description}</div>
                    )}
                  </div>
                  {canAssign && r.name !== "Owner" && (
                    <button
                      class={s.btnDanger}
                      onClick={() => removeRole(targetUser, r.id)}
                    >
                      <UserMinus size={12} /> {t("group.remove")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {targetUser && availableToAssign.length > 0 && (
            <div class={s.manageList}>
              <h4 class={s.manageListTitle}>{t("group.availableToAssign")}</h4>
              {availableToAssign.map((r) => (
                <div key={r.id} class={s.manageRow}>
                  <div>
                    <div class={s.roleName}>{r.name}</div>
                    {r.description && (
                      <div class={s.roleDescription}>{r.description}</div>
                    )}
                  </div>
                  <button
                    class={s.btnSecondary}
                    onClick={() => assignRole(targetUser, r.id)}
                  >
                    <UserPlus size={12} /> {t("group.assign")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </AccountSection>
      )}

      {roleModalMember && (
        <div
          class={s.modalBackdrop}
          role="presentation"
          onClick={() => setRoleModalMember(null)}
        >
          <div
            ref={roleTrapRef}
            tabIndex={-1}
            class={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div class={s.modalHeader}>
              <div>
                <h2 id="role-modal-title" class={s.modalTitle}>
                  {t("group.editRolesTitle")}
                </h2>
                <p class={s.modalSubtitle}>{roleModalMember.username}</p>
              </div>
              <button
                class={s.iconButton}
                aria-label={t("group.close")}
                onClick={() => setRoleModalMember(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div class={s.modalBody}>
              {roleModalMsg && (
                <div
                  class={roleModalMsg.type === "success" ? s.success : s.error}
                >
                  {roleModalMsg.text}
                </div>
              )}
              <div class={s.manageList}>
                <h4 class={s.manageListTitle}>{t("group.currentRoles")}</h4>
                {roleModalRoles.length === 0 && (
                  <div class={s.emptyText}>{t("group.noRolesAssigned")}</div>
                )}
                {roleModalRoles.map((role) => (
                  <div key={role.id} class={s.manageRow}>
                    <div>
                      <div class={s.roleName}>{role.name}</div>
                      {role.description && (
                        <div class={s.roleDescription}>{role.description}</div>
                      )}
                    </div>
                    {role.name !== "Owner" && (
                      <button
                        class={s.btnDanger}
                        onClick={() =>
                          removeRole(roleModalMember.user_id, role.id)
                        }
                      >
                        <UserMinus size={12} /> {t("group.remove")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div class={s.manageList}>
                <h4 class={s.manageListTitle}>{t("group.availableRoles")}</h4>
                {modalAvailableToAssign.length === 0 && (
                  <div class={s.emptyText}>{t("group.noRolesAvailable")}</div>
                )}
                {modalAvailableToAssign.map((role) => (
                  <div key={role.id} class={s.manageRow}>
                    <div>
                      <div class={s.roleName}>{role.name}</div>
                      {role.description && (
                        <div class={s.roleDescription}>{role.description}</div>
                      )}
                    </div>
                    <button
                      class={s.btnSecondary}
                      onClick={() =>
                        assignRole(roleModalMember.user_id, role.id)
                      }
                    >
                      <UserPlus size={12} /> {t("group.assign")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Roles tab ──

function RolesTab({
  tag,
  groupRoles,
  onRolesChanged,
  canManage,
  isMember,
  onMembershipChanged,
}: {
  tag: string;
  groupRoles: GroupRole[];
  onRolesChanged: () => void;
  canManage: boolean;
  isMember: boolean;
  onMembershipChanged: () => void;
}) {
  const { t } = useI18n();
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [products, setProducts] = useState<GroupProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  // Product id whose purchase is in flight, so a second click can't charge twice.
  const [buying, setBuying] = useState<string | null>(null);
  // Guards role/product creation against a double-click creating duplicates.
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productRoleId, setProductRoleId] = useState("");
  const [productSubscription, setProductSubscription] = useState(false);
  const [productFrequency, setProductFrequency] = useState("1");
  const [productPeriod, setProductPeriod] = useState<
    "day" | "week" | "month" | "year"
  >("month");
  const { reload: reloadUser } = useAuth();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignOnJoin, setNewAssignOnJoin] = useState(false);
  const [newSelfAssignable, setNewSelfAssignable] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignOnJoin, setEditAssignOnJoin] = useState(false);
  const [editSelfAssignable, setEditSelfAssignable] = useState(false);
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
  const [editBenefits, setEditBenefits] = useState("");
  const [newBenefits, setNewBenefits] = useState("");

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/products?${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setMsg({
          text: data?.error || t("group.couldntLoadRoleShop"),
          type: "error",
        });
      }
    } catch {
      setMsg({ text: t("group.networkErrorRoleShop"), type: "error" });
    }
    setProductsLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, [tag]);

  function togglePerm(set: Set<string>, perm: string): Set<string> {
    const next = new Set(set);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    return next;
  }

  async function create() {
    if (creatingBusy) return;
    if (!newName.trim()) {
      setMsg({ text: t("group.nameRequiredShort"), type: "error" });
      return;
    }
    setMsg(null);
    setCreatingBusy(true);
    try {
      const params = new URLSearchParams();
      params.set("name", newName.trim());
      if (newDesc.trim()) params.set("description", newDesc.trim());
      params.set("assign_on_join", String(newAssignOnJoin));
      params.set("self_assignable", String(newSelfAssignable));
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/roles?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        const role = data;
        if (newBenefits.trim() && role?.id) {
          const benefits = newBenefits
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean);
          if (benefits.length) {
            const patchRes = await fetch(
              `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/roles/${encodeURIComponent(role.id)}?${authQs().slice(1)}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ benefits }),
              },
            );
            if (!patchRes.ok) {
              const patchData = await patchRes.json();
              setMsg({
                text: t("group.benefitsFailed", {
                  err: patchData.error || "unknown",
                }),
                type: "error",
              });
            }
          }
        }
        setMsg({ text: t("group.roleCreated"), type: "success" });
        setCreating(false);
        setNewName("");
        setNewDesc("");
        setNewAssignOnJoin(false);
        setNewSelfAssignable(false);
        setNewBenefits("");
        onRolesChanged();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    } finally {
      setCreatingBusy(false);
    }
  }

  function startEdit(role: GroupRole) {
    setEditingId(role.id);
    setEditName(role.name);
    setEditDesc(role.description);
    setEditAssignOnJoin(role.assign_on_join);
    setEditSelfAssignable(role.self_assignable);
    setEditPerms(new Set(role.permissions));
    setEditBenefits((role.benefits || []).join(", "));
  }

  async function saveEdit(role: GroupRole) {
    setMsg(null);
    const benefits = editBenefits
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/roles/${encodeURIComponent(role.id)}?${authQs().slice(1)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            description: editDesc,
            assign_on_join: editAssignOnJoin,
            self_assignable: editSelfAssignable,
            permissions: Array.from(editPerms),
            benefits,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.roleUpdated"), type: "success" });
        setEditingId(null);
        onRolesChanged();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  async function del(role: GroupRole) {
    const ok = await confirm({
      title: t("group.deleteRoleConfirm", { name: role.name }),
      message: t("group.deleteRoleMsg"),
      confirmLabel: t("group.deleteRoleBtn"),
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/roles/${encodeURIComponent(role.id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.roleDeleted"), type: "success" });
        onRolesChanged();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  async function createProduct() {
    if (creatingBusy) return;
    const price = parseFloat(productPrice);
    if (!productName.trim()) {
      setMsg({ text: t("group.productNameRequired"), type: "error" });
      return;
    }
    if (!productRoleId) {
      setMsg({ text: t("group.chooseRoleToSell"), type: "error" });
      return;
    }
    if (!price || price <= 0) {
      setMsg({ text: t("group.validPrice"), type: "error" });
      return;
    }
    const frequency = parseInt(productFrequency);
    if (productSubscription && (!frequency || frequency <= 0)) {
      setMsg({ text: t("group.validFrequency"), type: "error" });
      return;
    }
    setMsg(null);
    setCreatingBusy(true);
    try {
      const params = new URLSearchParams();
      params.set("name", productName.trim());
      if (productDescription.trim()) {
        params.set("description", productDescription.trim());
      }
      params.set("price_credits", String(price));
      params.set("role_id", productRoleId);
      params.set("subscription", String(productSubscription));
      if (productSubscription) {
        params.set("frequency", String(frequency));
        params.set("period", productPeriod);
      }
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/products?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.roleProductCreated"), type: "success" });
        setCreatingProduct(false);
        setProductName("");
        setProductDescription("");
        setProductPrice("");
        setProductRoleId("");
        setProductSubscription(false);
        setProductFrequency("1");
        setProductPeriod("month");
        loadProducts();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    } finally {
      setCreatingBusy(false);
    }
  }

  async function deleteProduct(product: GroupProduct) {
    const ok = await confirm({
      title: t("group.deleteProductConfirm", { name: product.name }),
      confirmLabel: t("group.deleteProductBtn"),
      danger: true,
    });
    if (!ok) return;
    setMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/products/${encodeURIComponent(product.id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.roleProductDeleted"), type: "success" });
        loadProducts();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  async function purchaseProduct(product: GroupProduct) {
    if (buying) return;
    const ok = await confirm({
      title: t("group.buyProductConfirm", { name: product.name }),
      message: t("group.buyProductMsg", {
        price: product.price_credits.toLocaleString(),
      }),
      confirmLabel: t("group.buyForCredits", {
        price: product.price_credits.toLocaleString(),
      }),
    });
    if (!ok) return;
    setMsg(null);
    setBuying(product.id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/products/${encodeURIComponent(product.id)}/purchase?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.rolePurchased"), type: "success" });
        if (reloadUser) await reloadUser();
        onMembershipChanged();
        loadProducts();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    } finally {
      setBuying(null);
    }
  }

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      {canManage && (
        <AccountSection
          icon={<Plus size={18} />}
          title={t("group.newRole")}
          subtitle={t("group.newRoleSub")}
          actions={
            !creating && (
              <button class={s.btnPrimary} onClick={() => setCreating(true)}>
                <Plus size={13} /> New Role
              </button>
            )
          }
        >
          {creating && (
            <>
              <div class={s.formRow}>
                <div class={s.formGroup}>
                  <label>{t("group.nameLabel")}</label>
                  <input
                    type="text"
                    class={s.formInput}
                    maxlength={50}
                    value={newName}
                    onInput={(e) =>
                      setNewName((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div class={s.formGroup}>
                  <label>{t("group.descriptionLabel")}</label>
                  <input
                    type="text"
                    class={s.formInput}
                    maxlength={200}
                    value={newDesc}
                    onInput={(e) =>
                      setNewDesc((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
              </div>
              <div class={s.formGroup}>
                <div class={s.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="new-assign-on-join"
                    checked={newAssignOnJoin}
                    onChange={(e) =>
                      setNewAssignOnJoin((e.target as HTMLInputElement).checked)
                    }
                  />
                  <label for="new-assign-on-join">{t("group.assignOnJoin")}</label>
                </div>
              </div>
              <div class={s.formGroup}>
                <div class={s.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="new-self-assign"
                    checked={newSelfAssignable}
                    onChange={(e) =>
                      setNewSelfAssignable(
                        (e.target as HTMLInputElement).checked,
                      )
                    }
                  />
                  <label for="new-self-assign">{t("group.selfAssign")}</label>
                </div>
              </div>
              <div class={s.formGroup}>
                <label>{t("group.benefits")}</label>
                <input
                  type="text"
                  class={s.formInput}
                  placeholder={t("group.benefitsPlaceholder")}
                  value={newBenefits}
                  onInput={(e) =>
                    setNewBenefits((e.target as HTMLInputElement).value)
                  }
                />
                <small class={s.formHint}>{t("group.benefitsHint")}</small>
              </div>
              <div class={s.formActions}>
                <button
                  class={s.btnPrimary}
                  onClick={create}
                  disabled={creatingBusy}
                >
                  <Save size={13} /> {t("group.createRole")}
                </button>
                <button
                  class={s.btnSecondary}
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                    setNewDesc("");
                    setNewBenefits("");
                  }}
                >
                  {t("group.cancel")}
                </button>
              </div>
            </>
          )}
        </AccountSection>
      )}

      {msg && (
        <div class={msg.type === "success" ? s.success : s.error}>
          {msg.text}
        </div>
      )}

      <AccountSection
        icon={<Coins size={18} />}
        title={t("group.roleShop")}
        subtitle={t("group.roleShopSub")}
        actions={
          canManage &&
          !creatingProduct && (
            <button
              class={s.btnPrimary}
              onClick={() => setCreatingProduct(true)}
            >
              <Plus size={13} /> {t("group.sellRole")}
            </button>
          )
        }
      >
        {canManage && creatingProduct && (
          <div class={s.roleCard}>
            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label>{t("group.productName")}</label>
                <input
                  class={s.formInput}
                  maxlength={50}
                  value={productName}
                  onInput={(e) =>
                    setProductName((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class={s.formGroup}>
                <label>{t("group.price")}</label>
                <input
                  class={s.formInput}
                  type="number"
                  min={0}
                  step="0.01"
                  value={productPrice}
                  onInput={(e) =>
                    setProductPrice((e.target as HTMLInputElement).value)
                  }
                />
              </div>
            </div>
            <div class={s.formGroup}>
              <label>{t("group.roleGranted")}</label>
              <select
                class={s.formInput}
                value={productRoleId}
                onChange={(e) =>
                  setProductRoleId((e.target as HTMLSelectElement).value)
                }
              >
                <option value="">{t("group.chooseRole")}</option>
                {groupRoles
                  .filter((role) => role.name !== "Owner")
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </div>
            <div class={s.formGroup}>
              <div class={s.checkboxGroup}>
                <input
                  type="checkbox"
                  id="product-subscription"
                  checked={productSubscription}
                  onChange={(e) =>
                    setProductSubscription(
                      (e.target as HTMLInputElement).checked,
                    )
                  }
                />
                <label for="product-subscription">
                  {t("group.recurringSubscription")}
                </label>
              </div>
            </div>
            {productSubscription && (
              <div class={s.formRow}>
                <div class={s.formGroup}>
                  <label>{t("group.frequency")}</label>
                  <input
                    class={s.formInput}
                    type="number"
                    min={1}
                    value={productFrequency}
                    onInput={(e) =>
                      setProductFrequency((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div class={s.formGroup}>
                  <label>{t("group.period")}</label>
                  <select
                    class={s.formInput}
                    value={productPeriod}
                    onChange={(e) =>
                      setProductPeriod(
                        (e.target as HTMLSelectElement).value as
                          | "day"
                          | "week"
                          | "month"
                          | "year",
                      )
                    }
                  >
                    <option value="day">{t("group.day")}</option>
                    <option value="week">{t("group.week")}</option>
                    <option value="month">{t("group.month")}</option>
                    <option value="year">{t("group.year")}</option>
                  </select>
                </div>
              </div>
            )}
            <div class={s.formGroup}>
              <label>{t("group.descriptionLabel")}</label>
              <input
                class={s.formInput}
                maxlength={200}
                value={productDescription}
                onInput={(e) =>
                  setProductDescription((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div class={s.formActions}>
              <button
                class={s.btnPrimary}
                onClick={createProduct}
                disabled={creatingBusy}
              >
                <Save size={13} /> {t("group.createProduct")}
              </button>
              <button
                class={s.btnSecondary}
                onClick={() => {
                  setCreatingProduct(false);
                  setProductName("");
                  setProductDescription("");
                  setProductPrice("");
                  setProductRoleId("");
                  setProductSubscription(false);
                  setProductFrequency("1");
                  setProductPeriod("month");
                }}
              >
                {t("group.cancel")}
              </button>
            </div>
          </div>
        )}

        {productsLoading && <div class={s.loading}>{t("group.loadingRoleShop")}</div>}
        {!productsLoading && products.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyText}>{t("group.noPurchasableRoles")}</div>
          </div>
        )}
        <div class={s.rolesList}>
          {products.map((product) => (
            <div key={product.id} class={s.roleCard}>
              <div class={s.roleCardHeader}>
                <div>
                  <div class={s.roleName}>{product.name}</div>
                  <div class={s.roleDescription}>
                    {t("group.grantsRole", {
                      role: product.role_name || product.role_granted_id || "",
                    })}
                    {product.subscription &&
                      ` · ${t("group.every")} ${product.frequency || 1} ${t(`group.${product.period || "month"}`)}`}
                  </div>
                </div>
                <div class={s.bigBalance}>
                  <Coins size={14} />
                  <span>{product.price_credits.toLocaleString()}</span>
                </div>
              </div>
              {product.description && (
                <div class={s.roleDescription}>{product.description}</div>
              )}
              <div class={s.formActions}>
                {isMember && (
                  <button
                    class={s.btnPrimary}
                    onClick={() => purchaseProduct(product)}
                    disabled={buying === product.id}
                  >
                    <Coins size={13} />{" "}
                    {buying === product.id ? t("group.purchasing") : t("group.buyRole")}
                  </button>
                )}
                {canManage && (
                  <button
                    class={s.btnDanger}
                    onClick={() => deleteProduct(product)}
                  >
                    <Trash2 size={12} /> {t("group.delete")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </AccountSection>

      <AccountSection
        icon={<Shield size={18} />}
        title={t("group.allRoles")}
        subtitle={t("group.roleCount", { count: groupRoles.length })}
      >
        {groupRoles.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyText}>{t("group.noRolesDefined")}</div>
          </div>
        )}
        <div class={s.rolesList}>
          {groupRoles.map((r) => {
            const isProtected = r.name === "Owner";
            const isEditing = editingId === r.id;
            return (
              <div key={r.id} class={s.roleCard}>
                {isEditing ? (
                  <div>
                    <div class={s.formRow}>
                      <div class={s.formGroup}>
                        <label>{t("group.nameLabel")}</label>
                        <input
                          type="text"
                          class={s.formInput}
                          value={editName}
                          onInput={(e) =>
                            setEditName((e.target as HTMLInputElement).value)
                          }
                        />
                      </div>
                      <div class={s.formGroup}>
                        <label>{t("group.descriptionLabel")}</label>
                        <input
                          type="text"
                          class={s.formInput}
                          value={editDesc}
                          onInput={(e) =>
                            setEditDesc((e.target as HTMLInputElement).value)
                          }
                        />
                      </div>
                    </div>
                    <div class={s.formGroup}>
                      <div class={s.checkboxGroup}>
                        <input
                          type="checkbox"
                          id={`edit-join-${r.id}`}
                          checked={editAssignOnJoin}
                          onChange={(e) =>
                            setEditAssignOnJoin(
                              (e.target as HTMLInputElement).checked,
                            )
                          }
                        />
                        <label for={`edit-join-${r.id}`}>{t("group.assignOnJoin")}</label>
                      </div>
                    </div>
                    <div class={s.formGroup}>
                      <div class={s.checkboxGroup}>
                        <input
                          type="checkbox"
                          id={`edit-self-${r.id}`}
                          checked={editSelfAssignable}
                          onChange={(e) =>
                            setEditSelfAssignable(
                              (e.target as HTMLInputElement).checked,
                            )
                          }
                        />
                        <label for={`edit-self-${r.id}`}>{t("group.selfAssignable")}</label>
                      </div>
                    </div>
                    <div class={s.formGroup}>
                      <label>{t("group.permissions")}</label>
                      <div class={s.permGrid}>
                        {ALL_PERMISSIONS.map((p) => (
                          <label key={p} class={s.permCheck}>
                            <input
                              type="checkbox"
                              checked={editPerms.has(p)}
                              onChange={() =>
                                setEditPerms(togglePerm(editPerms, p))
                              }
                            />
                            {t(PERMISSION_LABELS[p] || p)}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div class={s.formGroup}>
                      <label>{t("group.benefits")}</label>
                      <input
                        type="text"
                        class={s.formInput}
                        placeholder={t("group.benefitsPlaceholder")}
                        value={editBenefits}
                        onInput={(e) =>
                          setEditBenefits((e.target as HTMLInputElement).value)
                        }
                      />
                      <small class={s.formHint}>{t("group.benefitsHint")}</small>
                    </div>
                    <div class={s.formActions}>
                      <button class={s.btnPrimary} onClick={() => saveEdit(r)}>
                        <Save size={13} /> {t("group.save")}
                      </button>
                      <button
                        class={s.btnSecondary}
                        onClick={() => setEditingId(null)}
                      >
                        {t("group.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div class={s.roleCardHeader}>
                      <div class={s.roleName}>{r.name}</div>
                      <div class={s.roleBadges}>
                        {r.assign_on_join && (
                          <span class={s.miniTag}>{t("group.onJoin")}</span>
                        )}
                        {r.self_assignable && (
                          <span class={s.miniTag}>{t("group.selfAssignable")}</span>
                        )}
                      </div>
                    </div>
                    {r.description && (
                      <div class={s.roleDescription}>{r.description}</div>
                    )}
                    {r.permissions.length > 0 && (
                      <div class={s.rolePermissions}>
                        {r.permissions.map((p) => (
                          <span key={p} class={s.permTag}>
                            {t(PERMISSION_LABELS[p] || p)}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.benefits && r.benefits.length > 0 && (
                      <div class={s.rolePermissions}>
                        {r.benefits.map((b) => (
                          <span key={b} class={s.permTag}>
                            <Sparkles size={10} /> {b}
                          </span>
                        ))}
                      </div>
                    )}
                    {canManage && !isProtected && (
                      <div class={s.formActions}>
                        <button
                          class={s.btnSecondary}
                          onClick={() => startEdit(r)}
                        >
                          <Edit3 size={12} /> {t("group.edit")}
                        </button>
                        <button class={s.btnDanger} onClick={() => del(r)}>
                          <Trash2 size={12} /> {t("group.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AccountSection>
    </div>
  );
}

// ── Events tab ──

function EventsTab({
  tag,
  canManage,
  canPublish,
  isMember,
  isPublic,
}: {
  tag: string;
  canManage: boolean;
  canPublish: boolean;
  isMember: boolean;
  isPublic: boolean;
}) {
  const { t } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("1");
  const [visibility, setVisibility] = useState<EventVisibility>("MEMBERS");
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/events?${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setEvents(Array.isArray(data) ? data : []);
      } else {
        setMsg({
          text: data?.error || t("group.couldntLoadEvents"),
          type: "error",
        });
      }
    } catch {
      setMsg({ text: t("group.networkErrorEvents"), type: "error" });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function create() {
    if (!title.trim()) {
      setMsg({ text: t("group.titleRequired"), type: "error" });
      return;
    }
    const start = new Date(startTime);
    if (!startTime || isNaN(start.getTime())) {
      setMsg({ text: t("group.validStartTime"), type: "error" });
      return;
    }
    if (published && !canPublish) {
      setMsg({
        text: t("group.noPublishPerm"),
        type: "error",
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const params = new URLSearchParams();
      params.set("title", title.trim());
      if (description.trim()) params.set("description", description.trim());
      if (location.trim()) params.set("location", location.trim());
      params.set("start_time", String(Math.floor(start.getTime() / 1000)));
      params.set("duration_hours", duration);
      params.set("visibility", visibility);
      params.set("published", String(published));
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/events?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.eventCreated"), type: "success" });
        setCreating(false);
        setTitle("");
        setDescription("");
        setLocation("");
        setStartTime("");
        setDuration("1");
        setPublished(false);
        setVisibility("MEMBERS");
        load();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
    setBusy(false);
  }

  async function updateEvent(event: GroupEvent, publishedValue: boolean) {
    if (publishedValue && !canPublish) {
      setMsg({
        text: t("group.noPublishPerm"),
        type: "error",
      });
      return;
    }
    setMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/events/${encodeURIComponent(event.id)}?${authQs().slice(1)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: publishedValue }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({
          text: publishedValue
            ? t("group.eventPublished")
            : t("group.eventDraft"),
          type: "success",
        });
        load();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  async function deleteEvent(event: GroupEvent) {
    const ok = await confirm({
      title: t("group.deleteEventConfirm", { name: event.title }),
      confirmLabel: t("group.deleteEventBtn"),
      danger: true,
    });
    if (!ok) return;
    setMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/events/${encodeURIComponent(event.id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.eventDeleted"), type: "success" });
        load();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
  }

  const visible = isPublic
    ? events
    : isMember
      ? events
      : events.filter((e) => e.visibility === "PUBLIC");

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      {canManage && (
        <AccountSection
          icon={<Plus size={18} />}
          title={t("group.newEvent")}
          subtitle={t("group.newEventSub")}
          actions={
            !creating && (
              <button class={s.btnPrimary} onClick={() => setCreating(true)}>
                <Plus size={13} /> {t("group.newEvent")}
              </button>
            )
          }
        >
          {creating && (
            <>
              <div class={s.formGroup}>
                <label>{t("group.title")}</label>
                <input
                  type="text"
                  class={s.formInput}
                  maxlength={100}
                  value={title}
                  onInput={(e) =>
                    setTitle((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class={s.formGroup}>
                <label>{t("group.descriptionLabel")}</label>
                <textarea
                  class={s.formInput}
                  rows={3}
                  maxlength={500}
                  value={description}
                  onInput={(e) =>
                    setDescription((e.target as HTMLTextAreaElement).value)
                  }
                />
              </div>
              <div class={s.formGroup}>
                <label>
                  <MapPin size={11} style={{ verticalAlign: "middle" }} />{" "}
                  {t("group.location")}
                </label>
                <input
                  type="text"
                  class={s.formInput}
                  maxlength={200}
                  value={location}
                  onInput={(e) =>
                    setLocation((e.target as HTMLInputElement).value)
                  }
                />
              </div>
              <div class={s.formRow}>
                <div class={s.formGroup}>
                  <label>{t("group.startTime")}</label>
                  <input
                    type="datetime-local"
                    class={s.formInput}
                    value={startTime}
                    onInput={(e) =>
                      setStartTime((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
                <div class={s.formGroup}>
                  <label>{t("group.durationHours")}</label>
                  <input
                    type="number"
                    class={s.formInput}
                    min={1}
                    max={72}
                    value={duration}
                    onInput={(e) =>
                      setDuration((e.target as HTMLInputElement).value)
                    }
                  />
                </div>
              </div>
              <div class={s.formRow}>
                <div class={s.formGroup}>
                  <label>{t("group.visibility")}</label>
                  <select
                    class={s.formInput}
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(
                        (e.target as HTMLSelectElement)
                          .value as EventVisibility,
                      )
                    }
                  >
                    <option value="MEMBERS">{t("group.membersOnly")}</option>
                    <option value="PUBLIC">{t("group.public")}</option>
                  </select>
                </div>
                <div class={s.formGroup}>
                  <label>{t("group.status")}</label>
                  <div class={s.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="event-pub"
                      checked={published}
                      onChange={(e) =>
                        setPublished((e.target as HTMLInputElement).checked)
                      }
                    />
                    <label for="event-pub">{t("group.published")}</label>
                  </div>
                </div>
              </div>
              <div class={s.formActions}>
                <button class={s.btnPrimary} onClick={create} disabled={busy}>
                  <Save size={13} />{" "}
                  {busy ? t("group.creating") : t("group.createEvent")}
                </button>
                <button
                  class={s.btnSecondary}
                  onClick={() => setCreating(false)}
                >
                  {t("group.cancel")}
                </button>
              </div>
            </>
          )}
        </AccountSection>
      )}

      {msg && (
        <div class={msg.type === "success" ? s.success : s.error}>
          {msg.text}
        </div>
      )}

      <AccountSection
        icon={<Calendar size={18} />}
        title={t("group.events")}
        subtitle={t("group.eventCount", { count: visible.length })}
      >
        {loading && <div class={s.loading}>{t("group.loadingShort")}</div>}
        {!loading && visible.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Calendar size={24} />
            </div>
            <div class={s.emptyTitle}>{t("group.noEvents")}</div>
            <div class={s.emptyText}>
              {canManage
                ? t("group.createFirstEvent")
                : t("group.checkBackLaterShort")}
            </div>
          </div>
        )}
        <div class={s.eventList}>
          {visible.map((e) => (
            <div key={e.id} class={s.eventCard}>
              <div class={s.eventHeader}>
                <h3 class={s.eventTitle}>{e.title}</h3>
                <div class={s.eventBadges}>
                  {!e.published && (
                    <span class={s.miniTag}>{t("group.draft")}</span>
                  )}
                  <span class={s.miniTag}>
                    {e.visibility === "PUBLIC"
                      ? t("group.public")
                      : t("group.membersOnly")}
                  </span>
                </div>
              </div>
              {e.description && (
                <div class={s.eventDescription}>{e.description}</div>
              )}
              <div class={s.eventMeta}>
                <span>
                  <Calendar size={11} /> {formatDateTime(e.start_time)}
                </span>
                <span>•</span>
                <span>{formatDateTime(e.end_time)}</span>
                {e.location && (
                  <>
                    <span>•</span>
                    <span>
                      <MapPin size={11} /> {e.location}
                    </span>
                  </>
                )}
              </div>
              {canManage && (
                <div class={s.formActions}>
                  <button
                    class={s.btnSecondary}
                    onClick={() => updateEvent(e, !e.published)}
                    disabled={!canPublish && !e.published}
                  >
                    <Save size={12} />{" "}
                    {e.published ? t("group.makeDraft") : t("group.publish")}
                  </button>
                  <button class={s.btnDanger} onClick={() => deleteEvent(e)}>
                    <Trash2 size={12} /> {t("group.delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </AccountSection>
    </div>
  );
}

// ── Admin tab ──

function AdminTab({
  tag,
  group,
  isOwner,
  canInvite,
  canRemove,
  canBan,
  canWithdraw,
  canViewMembers,
  onGroupChanged,
}: {
  tag: string;
  group: GroupPublic;
  isOwner: boolean;
  canInvite: boolean;
  canRemove: boolean;
  canBan: boolean;
  canWithdraw: boolean;
  canViewMembers: boolean;
  onGroupChanged: () => void;
}) {
  const { t } = useI18n();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [bans, setBans] = useState<GroupBan[]>([]);
  const [confirm, confirmDialog] = useConfirm();
  const [withdrawals, setWithdrawals] = useState<GroupWithdrawal[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [banReason, setBanReason] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const { reload: reloadUser } = useAuth();

  async function loadAdminData() {
    setBusy(true);
    try {
      if (canViewMembers || canRemove || canBan || isOwner) {
        const membersRes = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members?per_page=100&${authQs().slice(1)}`,
        );
        const membersData = await membersRes.json();
        if (membersRes.ok) setMembers(membersData.members || []);
      }
      if (canInvite) {
        const [inviteRes, requestRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/invites?${authQs().slice(1)}`,
          ),
          fetch(
            `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join_requests?${authQs().slice(1)}`,
          ),
        ]);
        const inviteData = await inviteRes.json();
        const requestData = await requestRes.json();
        if (inviteRes.ok)
          setInvites(Array.isArray(inviteData) ? inviteData : []);
        if (requestRes.ok) {
          setRequests(Array.isArray(requestData) ? requestData : []);
        }
      }
      if (canBan) {
        const bansRes = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/bans?${authQs().slice(1)}`,
        );
        const bansData = await bansRes.json();
        if (bansRes.ok) setBans(Array.isArray(bansData) ? bansData : []);
      }
      if (canWithdraw) {
        const withdrawalsRes = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/tips/withdrawals?limit=20&${authQs().slice(1)}`,
        );
        const withdrawalsData = await withdrawalsRes.json();
        if (withdrawalsRes.ok) {
          setWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
        }
      }
    } catch {
      /* ignore */
    }
    setBusy(false);
  }

  useEffect(() => {
    loadAdminData();
  }, [tag, canInvite, canBan, canWithdraw, canViewMembers]);

  // Every admin action (including the money ones: withdraw, transfer) funnels
  // through here, so one in-flight guard stops all of them double-firing.
  async function runAction(
    successText: string,
    input: RequestInfo,
    init?: RequestInit,
  ) {
    if (actionBusy) return;
    setMsg(null);
    setActionBusy(true);
    try {
      const res = await fetch(input, init);
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: successText, type: "success" });
        await loadAdminData();
        onGroupChanged();
        if (reloadUser) await reloadUser();
      } else {
        setMsg({ text: data.error || t("group.actionFailed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    } finally {
      setActionBusy(false);
    }
  }

  async function invite() {
    if (!inviteUsername.trim()) return;
    await runAction(
      t("group.inviteSent"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/invites?username=${encodeURIComponent(inviteUsername.trim())}&${authQs().slice(1)}`,
      { method: "POST" },
    );
    setInviteUsername("");
  }

  async function handleRequest(id: string, action: "accept" | "decline") {
    await runAction(
      action === "accept" ? t("group.joinReqAccepted") : t("group.joinReqDeclined"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join_requests/${encodeURIComponent(id)}/${action}?${authQs().slice(1)}`,
      { method: "POST" },
    );
  }

  async function revokeInvite(id: string) {
    const ok = await confirm({
      title: t("group.revokeInviteConfirm"),
      confirmLabel: t("group.revokeInviteBtn"),
      danger: true,
    });
    if (!ok) return;
    await runAction(
      t("group.inviteRevoked"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/invites/${encodeURIComponent(id)}?${authQs().slice(1)}`,
      { method: "DELETE" },
    );
  }

  async function kick(member: GroupMember) {
    const ok = await confirm({
      title: t("group.removeMemberConfirm", { user: member.username }),
      message: t("group.removeMemberMsg"),
      confirmLabel: t("group.removeMemberBtn"),
      danger: true,
    });
    if (!ok) return;
    await runAction(
      t("group.memberRemoved"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(member.user_id)}?${authQs().slice(1)}`,
      { method: "DELETE" },
    );
  }

  async function ban(member: GroupMember) {
    const ok = await confirm({
      title: t("group.banConfirm", { user: member.username }),
      message: t("group.banMsg"),
      confirmLabel: t("group.banBtn"),
      danger: true,
    });
    if (!ok) return;
    const params = new URLSearchParams();
    if (banReason.trim()) params.set("reason", banReason.trim());
    await runAction(
      t("group.memberBanned"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(member.user_id)}/ban?${params.toString()}&${authQs().slice(1)}`,
      { method: "POST" },
    );
  }

  async function unban(banItem: GroupBan) {
    await runAction(
      t("group.memberUnbanned"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(banItem.user_id)}/ban?${authQs().slice(1)}`,
      { method: "DELETE" },
    );
  }

  async function transfer(member: GroupMember) {
    const ok = await confirm({
      title: t("group.transferOwnerConfirm", { user: member.username }),
      message: t("group.transferOwnerMsg", { group: group.name }),
      confirmLabel: t("group.transferOwnerBtn"),
      danger: true,
    });
    if (!ok) return;
    await runAction(
      t("group.ownershipTransferred"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/transfer/${encodeURIComponent(member.user_id)}?${authQs().slice(1)}`,
      { method: "POST" },
    );
  }

  async function withdraw() {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setMsg({ text: t("group.validWithdrawAmount"), type: "error" });
      return;
    }
    const ok = await confirm({
      title: t("group.withdrawConfirm", { amount: amount.toLocaleString() }),
      message: t("group.withdrawMsg"),
      confirmLabel: t("group.withdrawBtn"),
    });
    if (!ok) return;
    await runAction(
      t("group.withdrawalComplete"),
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/tips/withdraw?amount=${encodeURIComponent(String(amount))}&${authQs().slice(1)}`,
      { method: "POST" },
    );
    setWithdrawAmount("");
  }

  const manageableMembers = members.filter(
    (m) => m.username !== group.owner_user_id,
  );

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      {msg && (
        <div class={msg.type === "success" ? s.success : s.error}>
          {msg.text}
        </div>
      )}

      {canInvite && (
        <>
          <AccountSection
            icon={<UserPlus size={18} />}
            title={t("group.invites")}
            subtitle={t("group.invitesSub")}
          >
            <div class={s.actionRow}>
              <input
                class={s.formInput}
                value={inviteUsername}
                placeholder={t("group.usernamePlaceholder")}
                aria-label={t("group.usernameToInvite")}
                onInput={(e) =>
                  setInviteUsername((e.target as HTMLInputElement).value)
                }
              />
              <button
                class={s.btnPrimary}
                onClick={invite}
                disabled={!inviteUsername.trim()}
              >
                <UserPlus size={13} /> {t("group.invite")}
              </button>
            </div>
            <div class={s.manageList}>
              {invites.length === 0 && (
                <div class={s.emptyText}>{t("group.noPendingInvites")}</div>
              )}
              {invites.map((inviteItem) => (
                <div key={inviteItem.id} class={s.manageRow}>
                  <div>
                    <div class={s.roleName}>{inviteItem.to_username}</div>
                    <div class={s.roleDescription}>
                      {t("group.invitedBy")} {inviteItem.from_username}{" "}
                      {formatRelativeTime(inviteItem.created_at * 1000)}
                    </div>
                  </div>
                  <button
                    class={s.btnDanger}
                    onClick={() => revokeInvite(inviteItem.id)}
                  >
                    <Trash2 size={12} /> {t("group.revoke")}
                  </button>
                </div>
              ))}
            </div>
          </AccountSection>

          <AccountSection
            icon={<LogIn size={18} />}
            title={t("group.joinRequests")}
            subtitle={t("group.joinRequestsSub")}
          >
            <div class={s.manageList}>
              {requests.length === 0 && (
                <div class={s.emptyText}>{t("group.noPendingJoinRequests")}</div>
              )}
              {requests.map((request) => (
                <div key={request.id} class={s.manageRow}>
                  <div>
                    <div class={s.roleName}>{request.username}</div>
                    {request.message && (
                      <div class={s.roleDescription}>{request.message}</div>
                    )}
                  </div>
                  <div class={s.rowActions}>
                    <button
                      class={s.btnSecondary}
                      onClick={() => handleRequest(request.id, "decline")}
                    >
                      <X size={12} /> {t("group.decline")}
                    </button>
                    <button
                      class={s.btnPrimary}
                      onClick={() => handleRequest(request.id, "accept")}
                    >
                      <UserPlus size={12} /> {t("group.accept")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </AccountSection>
        </>
      )}

      {(canRemove || canBan || isOwner) && (
        <AccountSection
          icon={<UserMinus size={18} />}
          title={t("group.memberActions")}
          subtitle={t("group.memberActionsSub")}
          actions={
            <button
              class={s.btnSecondary}
              onClick={loadAdminData}
              disabled={busy}
            >
              <Search size={13} /> {t("group.refresh")}
            </button>
          }
        >
          {canBan && (
            <div class={s.formGroup}>
              <label>{t("group.banReason")}</label>
              <input
                class={s.formInput}
                maxlength={200}
                value={banReason}
                placeholder={t("group.banReasonPlaceholder")}
                onInput={(e) =>
                  setBanReason((e.target as HTMLInputElement).value)
                }
              />
            </div>
          )}
          <div class={s.manageList}>
            {manageableMembers.length === 0 && (
              <div class={s.emptyText}>{t("group.noManageableMembers")}</div>
            )}
            {manageableMembers.map((member) => (
              <div key={member.id} class={s.manageRow}>
                <div>
                  <div class={s.roleName}>{member.username}</div>
                  <div class={s.roleDescription}>
                    {t("group.joinedPrefix")}{" "}
                    {formatRelativeTime(member.joined_at * 1000)}
                  </div>
                </div>
                <div class={s.rowActions}>
                  {isOwner && (
                    <button
                      class={s.btnSecondary}
                      onClick={() => transfer(member)}
                    >
                      <Crown size={12} /> {t("group.transfer")}
                    </button>
                  )}
                  {canRemove && (
                    <button class={s.btnDanger} onClick={() => kick(member)}>
                      <UserMinus size={12} /> {t("group.remove")}
                    </button>
                  )}
                  {canBan && (
                    <button class={s.btnDanger} onClick={() => ban(member)}>
                      <Shield size={12} /> {t("group.banBtn")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AccountSection>
      )}

      {canBan && (
        <AccountSection
          icon={<Shield size={18} />}
          title={t("group.bans")}
          subtitle={t("group.bansSub")}
        >
          <div class={s.manageList}>
            {bans.length === 0 && <div class={s.emptyText}>{t("group.noBans")}</div>}
            {bans.map((banItem) => (
              <div key={banItem.id} class={s.manageRow}>
                <div>
                  <div class={s.roleName}>{banItem.username}</div>
                  <div class={s.roleDescription}>
                    {t("group.byPrefix")} {banItem.banned_by}
                    {banItem.reason ? `: ${banItem.reason}` : ""}
                  </div>
                </div>
                <button class={s.btnSecondary} onClick={() => unban(banItem)}>
                  <UserPlus size={12} /> {t("group.unban")}
                </button>
              </div>
            ))}
          </div>
        </AccountSection>
      )}

      {canWithdraw && (
        <AccountSection
          icon={<Coins size={18} />}
          title={t("group.tipJar")}
          subtitle={t("group.tipJarSub", {
            balance: group.credits_balance.toLocaleString(),
          })}
        >
          <div class={s.actionRow}>
            <input
              type="number"
              min={0}
              step="0.01"
              class={s.formInput}
              value={withdrawAmount}
              placeholder={t("group.withdrawalAmount")}
              aria-label={t("group.withdrawalAmount")}
              onInput={(e) =>
                setWithdrawAmount((e.target as HTMLInputElement).value)
              }
              onKeyDown={(e) => e.key === "Enter" && withdraw()}
            />
            <button
              class={s.btnPrimary}
              onClick={withdraw}
              disabled={!withdrawAmount || actionBusy}
            >
              <Coins size={13} />{" "}
              {actionBusy ? t("group.withdrawing") : t("group.withdrawBtn")}
            </button>
          </div>
          <div class={s.manageList}>
            {withdrawals.length === 0 && (
              <div class={s.emptyText}>{t("group.noRecentWithdrawals")}</div>
            )}
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} class={s.manageRow}>
                <div>
                  <div class={s.roleName}>{withdrawal.to_username}</div>
                  <div class={s.roleDescription}>
                    {formatRelativeTime(withdrawal.created_at * 1000)}
                  </div>
                </div>
                <div class={s.tipAmount}>
                  -{withdrawal.amount_credits.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </AccountSection>
      )}
    </div>
  );
}

// ── Tips tab ──

function TipsTab({
  tag,
  isMember,
  isPublic,
  groupBalance,
  balanceVisible,
  onSent,
}: {
  tag: string;
  isMember: boolean;
  isPublic: boolean;
  groupBalance: number;
  balanceVisible: boolean;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [tips, setTips] = useState<GroupTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const { user, reload: reloadUser } = useAuth();

  const canTip = isMember || isPublic;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/tips?limit=50&${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setTips(Array.isArray(data) ? data : []);
      } else {
        setMsg({
          text: data?.error || t("group.couldntLoadTips"),
          type: "error",
        });
      }
    } catch {
      setMsg({ text: t("group.networkErrorTips"), type: "error" });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function send() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setMsg({ text: t("group.validAmount"), type: "error" });
      return;
    }
    const ok = await confirm({
      title: t("group.sendTipConfirm", { amount: amt.toLocaleString() }),
      message: t("group.deleteMsg"),
      confirmLabel: t("group.sendTipBtn"),
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const params = new URLSearchParams();
      params.set("amount", String(amt));
      if (note.trim()) params.set("note", note.trim());
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/tips?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: t("group.sentCredits", { amount: amt.toLocaleString() }), type: "success" });
        setAmount("");
        setNote("");
        if (reloadUser) await reloadUser();
        onSent();
        load();
      } else {
        setMsg({ text: data.error || t("group.failed"), type: "error" });
      }
    } catch {
      setMsg({ text: t("group.networkError"), type: "error" });
    }
    setBusy(false);
  }

  return (
    <div class={s.tabColumn}>
      {confirmDialog}
      {balanceVisible && (
        <AccountSection
          icon={<Coins size={18} />}
          title={t("group.groupBalance")}
          subtitle={t("group.groupBalanceSub")}
          actions={
            <div class={s.bigBalance}>
              <Coins size={18} />
              <span>{groupBalance.toLocaleString()}</span>
            </div>
          }
        />
      )}

      {canTip && (
        <AccountSection
          icon={<Send size={18} />}
          title={t("group.sendTipTitle")}
          subtitle={t("group.sendTipSub")}
        >
          <div class={s.actionRow}>
            <input
              type="number"
              class={s.formInput}
              min={0}
              step="0.01"
              placeholder={t("group.amountInCredits")}
              aria-label={t("group.tipAmountAria")}
              value={amount}
              onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
            />
            <button
              class={s.btnPrimary}
              onClick={send}
              disabled={busy || !amount}
            >
              <Send size={13} /> {busy ? t("group.sending") : t("group.sendTip")}
            </button>
          </div>
          <div class={s.formGroup} style={{ marginTop: "0.75rem" }}>
            <label>{t("group.note")}</label>
            <input
              type="text"
              class={s.formInput}
              maxlength={200}
              placeholder={t("group.notePlaceholder")}
              value={note}
              onInput={(e) => setNote((e.target as HTMLInputElement).value)}
            />
            <small class={s.formHint}>
              {t("group.noteCharCount", { count: note.length })}
            </small>
          </div>
          {user && (
            <small class={s.formHint}>
              {t("group.yourBalance", {
                balance: (user["sys.currency"] ?? 0).toLocaleString(),
              })}
            </small>
          )}
          {msg && (
            <div
              class={msg.type === "success" ? s.success : s.error}
              style={{ marginTop: "0.5rem" }}
            >
              {msg.text}
            </div>
          )}
        </AccountSection>
      )}

      <AccountSection
        icon={<Coins size={18} />}
        title={t("group.recentTips")}
        subtitle={`${tips.length} ${plural(tips.length, t("group.tip"))}`}
      >
        {loading && <div class={s.loading}>{t("group.loadingShort")}</div>}
        {!loading && tips.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Coins size={24} />
            </div>
            <div class={s.emptyTitle}>{t("group.noTips")}</div>
            <div class={s.emptyText}>
              {canTip ? t("group.beFirstTip") : t("group.joinToTip")}
            </div>
          </div>
        )}
        <div class={s.tipList}>
          {tips.map((t) => (
            <div key={t.id} class={s.tipCard}>
              <div class={s.tipLeft}>
                <div class={s.tipFrom}>
                  {t.from_username || t.from_user_id || ""}
                </div>
                <div class={s.tipDate}>
                  {formatRelativeTime(t.created_at * 1000)}
                </div>
                {t.note && <div class={s.tipNote}>{t.note}</div>}
              </div>
              <div class={s.tipAmount}>
                +{t.amount_credits.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </AccountSection>
    </div>
  );
}
