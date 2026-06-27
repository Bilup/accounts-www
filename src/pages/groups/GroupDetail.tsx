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
import s from "./GroupDetail.module.css";

const API_BASE_URL = "https://api.rotur.dev";

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
  "groups.manage": "Manage Group",
  "groups.members.invite": "Invite Members",
  "groups.members.remove": "Remove Members",
  "groups.members.ban": "Ban Members",
  "groups.members.view": "View Members",
  "groups.roles.manage": "Manage Roles",
  "groups.roles.assign": "Assign Roles",
  "groups.announcements.send": "Send Announcements",
  "groups.events.manage": "Manage Events",
  "groups.events.publish": "Publish Events",
  "groups.tips.manage": "Manage Tips",
  "groups.tips.withdraw": "Withdraw Tips",
  "groups.tips.deposit": "Deposit Tips",
  "groups.group.edit": "Edit Group",
};

const JOIN_POLICY_OPTIONS: { value: JoinPolicy; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "REQUEST", label: "Request" },
  { value: "INVITE", label: "Invite Only" },
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
        setError("Group not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
      } else {
        setError(data.error || "Failed to load group");
      }
    } catch {
      setError("Network error");
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

  async function joinGroup() {
    if (!isLoggedIn) {
      window.location.href = `/auth?return_to=${encodeURIComponent(
        window.location.origin + window.location.pathname,
      )}`;
      return;
    }
    if (group?.rules && group.rules.trim()) {
      if (
        !confirm(
          `Before joining, please read the group rules:\n\n${group.rules}\n\nDo you agree to these rules?`,
        )
      ) {
        return;
      }
    }
    if (group && group.entry_fee > 0) {
      if (
        !confirm(
          `Joining this group costs ${group.entry_fee} credits. Continue?`,
        )
      ) {
        return;
      }
    }
    setActionMessage(null);
    try {
      if (group?.join_policy === "REQUEST") {
        const message = prompt("Optional message for the group admins:") || "";
        const params = new URLSearchParams();
        if (message.trim()) params.set("message", message.trim());
        const requestRes = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join_requests?${params.toString()}&${authQs().slice(1)}`,
          { method: "POST" },
        );
        const requestData = await requestRes.json();
        if (requestRes.ok) {
          setActionMessage({
            text: "Join request sent.",
            type: "success",
          });
        } else {
          setActionMessage({
            text: requestData.error || "Failed to request access",
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
        setActionMessage({ text: "Joined group!", type: "success" });
        if (reloadUser) await reloadUser();
        loadGroup();
        loadMyMembership();
      } else {
        setActionMessage({
          text: data.error || "Failed to join",
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error", type: "error" });
    }
  }

  async function leaveGroup() {
    if (!confirm(`Are you sure you want to leave ${group?.name || tag}?`))
      return;
    setActionMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/leave?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: "Left group.", type: "success" });
        loadGroup();
        loadMyMembership();
      } else {
        setActionMessage({
          text: data.error || "Failed to leave",
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error", type: "error" });
    }
  }

  async function reportGroup() {
    if (!confirm("Report this group for review?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/report?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: "Report sent.", type: "success" });
      } else {
        setActionMessage({
          text: data.error || "Failed to report",
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error", type: "error" });
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
          text: data.error || "Failed to show on profile",
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error", type: "error" });
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
          text: "Stopped representing group.",
          type: "success",
        });
        if (reloadUser) await reloadUser();
      } else {
        setActionMessage({
          text: data.error || "Failed",
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error", type: "error" });
    }
  }

  async function copyLink() {
    const url = `${location.origin}/groups/${encodeURIComponent(tag)}`;
    try {
      await navigator.clipboard.writeText(url);
      setActionMessage({ text: "Link copied!", type: "success" });
      setTimeout(() => setActionMessage(null), 2000);
    } catch {
      /* ignore */
    }
  }

  const isOwner = !!user && !!group && user.username === group.owner_user_id;

  async function uploadHeaderImage(kind: "icon" | "banner", file?: File) {
    if (!file || !group) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionMessage({ text: "Image must be under 5MB.", type: "error" });
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
          text: kind === "icon" ? "Icon updated." : "Banner updated.",
          type: "success",
        });
        await loadGroup();
      } else {
        setActionMessage({
          text:
            data.error ||
            `${kind === "icon" ? "Icon" : "Banner"} upload failed`,
          type: "error",
        });
      }
    } catch {
      setActionMessage({ text: "Network error", type: "error" });
    }
  }

  if (loading) {
    return (
      <AccountPage layoutClassName={s.wideLayout}>
        <div class={s.loading}>Loading group…</div>
      </AccountPage>
    );
  }

  if (error || !group) {
    return (
      <AccountPage layoutClassName={s.wideLayout}>
        <a class={s.backBtn} href="/groups">
          <ArrowLeft size={14} /> Back to Groups
        </a>
        <div class={s.notFound}>
          <div class={s.notFoundIcon}>
            <Info size={32} />
          </div>
          <div class={s.notFoundTitle}>{error || "Group not found"}</div>
          <div class={s.notFoundText}>
            The group you are looking for does not exist or is private.
          </div>
        </div>
      </AccountPage>
    );
  }

  const tabs: { id: DetailTab; label: string; icon: typeof Users }[] = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "members", label: "Members", icon: Users },
    { id: "roles", label: "Roles", icon: Shield },
    { id: "events", label: "Events", icon: Calendar },
    { id: "tips", label: "Tips", icon: Coins },
  ];
  const canAdmin =
    hasPerm("groups.members.invite") ||
    hasPerm("groups.members.remove") ||
    hasPerm("groups.members.ban") ||
    hasPerm("groups.tips.withdraw") ||
    hasPerm("groups.manage");
  if (canAdmin) {
    tabs.push({ id: "admin", label: "Admin", icon: Shield });
  }
  const canEditBrand = hasPerm("groups.group.edit") || hasPerm("groups.manage");

  return (
    <AccountPage layoutClassName={s.wideLayout}>
      <a class={s.backBtn} href="/groups">
        <ArrowLeft size={14} /> Back to Groups
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
            <label class={s.bannerUpload} title="Update banner">
              <ImagePlus size={14} />
              <span>Update banner</span>
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
                <label class={s.iconUpload} title="Update icon">
                  <ImagePlus size={14} />
                  <span>Update icon</span>
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
                  {group.public ? "Public" : "Private"}
                </span>
                <span class={s.metaChip}>
                  <Users size={11} /> {group.member_count} members
                </span>
                <span class={s.metaChip}>
                  <Crown size={11} /> {group.owner_user_id}
                </span>
                <span class={s.metaChip}>
                  <Calendar size={11} /> {formatDate(group.created_at)}
                </span>
                {group.entry_fee > 0 && (
                  <span class={s.metaChip}>
                    <Coins size={11} /> {group.entry_fee.toLocaleString()} to
                    join
                  </span>
                )}
                {group.credits_balance_visible && group.credits_balance > 0 && (
                  <span class={s.metaChip}>
                    <Coins size={11} /> {group.credits_balance.toLocaleString()}{" "}
                    balance
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
              <Copy size={13} /> Copy Link
            </button>

            {!isLoggedIn && (
              <a
                class={s.btnPrimary}
                href={`/auth?return_to=${encodeURIComponent(
                  window.location.origin + window.location.pathname,
                )}`}
              >
                <UserPlus size={13} /> Sign in to Join
              </a>
            )}

            {isLoggedIn && !isMember && group.public && (
              <button class={s.btnPrimary} onClick={joinGroup}>
                <UserPlus size={13} />{" "}
                {group.join_policy === "REQUEST"
                  ? "Request to Join"
                  : group.entry_fee > 0
                    ? `Join (${group.entry_fee} credits)`
                    : group.join_policy === "INVITE"
                      ? "Join with Invite"
                      : "Join Group"}
              </button>
            )}

            {isLoggedIn && isMember && !isOwner && (
              <button class={s.btnDanger} onClick={leaveGroup}>
                <LogOut size={13} /> Leave
              </button>
            )}

            {isLoggedIn && isMember && (
              <>
                {representing ? (
                  <button class={s.btnSecondary} onClick={disrepresentGroup}>
                    <BellOff size={13} /> Stop Representing
                  </button>
                ) : (
                  <button class={s.btnPrimary} onClick={representGroup}>
                    <Sparkles size={13} /> Show on profile
                  </button>
                )}
              </>
            )}

            {isLoggedIn && (
              <button class={s.btnSecondary} onClick={reportGroup}>
                Report
              </button>
            )}
          </div>
        </div>
      </div>

      <AccountTabs
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Group sections"
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
                text: "Group updated.",
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
                text: "Tip sent!",
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
      onMessage({ text: "Name is required", type: "error" });
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(nextTag)) {
      onMessage({ text: "Tag must be alphanumeric only", type: "error" });
      return;
    }
    if (nextTag.length > 10) {
      onMessage({ text: "Tag must be 10 characters or less", type: "error" });
      return;
    }
    const fee = parseFloat(entryFee);
    if (entryFee.trim() && (isNaN(fee) || fee < 0)) {
      onMessage({
        text: "Entry fee must be a non-negative number",
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
        onMessage({ text: data.error || "Failed to update", type: "error" });
      }
    } catch {
      onMessage({ text: "Network error", type: "error" });
    }
    setBusy(false);
  }

  async function deleteGroup() {
    if (
      !confirm(
        `Delete "${group.name}"? This permanently removes the group and all data.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(group.tag)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/groups";
      } else {
        onMessage({ text: data.error || "Failed to delete", type: "error" });
      }
    } catch {
      onMessage({ text: "Network error", type: "error" });
    }
  }

  return (
    <div class={s.tabColumn}>
      {isMember && myRoles.length > 0 && (
        <AccountSection
          icon={<KeyRound size={18} />}
          title="Your Roles"
          subtitle={`${myRoles.length} role${myRoles.length === 1 ? "" : "s"}`}
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
                        {PERMISSION_LABELS[p] || p}
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
        title="About"
        subtitle="Group information and settings"
        actions={
          (hasPerm("groups.group.edit") || hasPerm("groups.manage")) &&
          !editing && (
            <>
              {hasPerm("groups.group.edit") && (
                <button class={s.btnSecondary} onClick={() => setEditing(true)}>
                  <Edit3 size={13} /> Edit
                </button>
              )}
              {hasPerm("groups.manage") && (
                <button class={s.btnDanger} onClick={deleteGroup}>
                  <Trash2 size={13} /> Delete
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
                <label>Name</label>
                <input
                  type="text"
                  class={s.formInput}
                  maxlength={50}
                  value={name}
                  onInput={(e) => setName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class={s.formGroup}>
                <label>Tag</label>
                <input
                  type="text"
                  class={s.formInput}
                  maxlength={10}
                  value={groupTag}
                  onInput={(e) =>
                    setGroupTag((e.target as HTMLInputElement).value)
                  }
                />
                <small class={s.formHint}>
                  Alphanumeric only. Changing it updates the group URL.
                </small>
              </div>
            </div>
            <div class={s.formGroup}>
              <label>Description</label>
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
                {description.length} / 500 characters.
              </small>
            </div>
            <div class={s.formGroup}>
              <label>Readme</label>
              <textarea
                class={s.formInput}
                rows={6}
                maxlength={10000}
                placeholder="Long-form description. Supports markdown."
                value={readme}
                onInput={(e) =>
                  setReadme((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {readme.length} / 10,000 characters.
              </small>
            </div>
            <div class={s.formGroup}>
              <label>Rules</label>
              <textarea
                class={s.formInput}
                rows={4}
                maxlength={5000}
                placeholder="Shown before users join."
                value={rules}
                onInput={(e) =>
                  setRules((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {rules.length} / 5,000 characters.
              </small>
            </div>
            <div class={s.formGroup}>
              <label>Entry Fee (credits)</label>
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
              <small class={s.formHint}>
                Credits required to join. Set to 0 for free entry.
              </small>
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
                <label for="overview-public">Public group</label>
              </div>
            </div>
            <div class={s.formGroup}>
              <label>Join Policy</label>
              <select
                class={s.formInput}
                value={policy}
                onChange={(e) =>
                  setPolicy((e.target as HTMLSelectElement).value as JoinPolicy)
                }
              >
                {JOIN_POLICY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div class={s.formActions}>
              <button class={s.btnPrimary} onClick={save} disabled={busy}>
                <Save size={13} /> {busy ? "Saving…" : "Save Changes"}
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
                <X size={13} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div class={s.detailGrid}>
              <div class={s.detailItem}>
                <h4>Description</h4>
                <div class={s.detailValue}>
                  {group.description || "No description provided."}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>Visibility</h4>
                <div class={s.detailValue}>
                  {group.public ? "Public" : "Private"}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>Join Policy</h4>
                <div class={s.detailValue}>
                  {JOIN_POLICY_OPTIONS.find(
                    (o) => o.value === group.join_policy,
                  )?.label || group.join_policy}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>Entry Fee</h4>
                <div class={s.detailValue}>
                  {group.entry_fee > 0
                    ? `${group.entry_fee.toLocaleString()} credits`
                    : "Free"}
                </div>
              </div>
              <div class={s.detailItem}>
                <h4>Owner</h4>
                <div class={s.detailValue}>{group.owner_user_id}</div>
              </div>
              <div class={s.detailItem}>
                <h4>Members</h4>
                <div class={s.detailValue}>{group.member_count}</div>
              </div>
              {group.credits_balance_visible && (
                <div class={s.detailItem}>
                  <h4>Credit Balance</h4>
                  <div class={s.detailValue}>
                    {group.credits_balance.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {group.readme && group.readme.trim() && (
              <div class={s.readmeBlock}>
                <h3 class={s.readmeTitle}>
                  <BookOpen size={14} /> Readme
                </h3>
                <pre class={s.readmeContent}>{group.readme}</pre>
              </div>
            )}

            {group.rules && group.rules.trim() && (
              <div class={s.rulesBlock}>
                <h3 class={s.readmeTitle}>
                  <ScrollText size={14} /> Group Rules
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
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function post() {
    if (!title.trim()) {
      setMsg({ text: "Title is required", type: "error" });
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
        setMsg({ text: "Announcement posted!", type: "success" });
        setTitle("");
        setBody("");
        setPingMembers(false);
        load();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
    setBusy(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/announcements/${encodeURIComponent(id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Announcement deleted.", type: "success" });
        load();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
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
          text: muted ? "Unmuted announcements." : "Muted announcements.",
          type: "success",
        });
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div class={s.tabColumn}>
      {isMember && (
        <AccountSection
          icon={muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          title="Notifications"
          subtitle={
            muted
              ? "You will not receive announcements"
              : "You receive announcements for this group"
          }
          actions={
            <button class={s.btnSecondary} onClick={toggleMute}>
              {muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {muted ? "Unmute" : "Mute"}
            </button>
          }
        />
      )}

      {canPost && (
        <AccountSection
          icon={<Plus size={18} />}
          title="New Announcement"
          subtitle="Share an update with all members"
        >
          <div class={s.formGroup}>
            <label>Title</label>
            <input
              type="text"
              class={s.formInput}
              placeholder="Announcement title"
              maxlength={100}
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class={s.formGroup}>
            <label>Body</label>
            <textarea
              class={s.formInput}
              rows={4}
              maxlength={2000}
              placeholder="Write your announcement…"
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
                <Bell size={12} style={{ verticalAlign: "middle" }} /> Ping
                members with a notification
              </label>
            </div>
          </div>
          <div class={s.formActions}>
            <button class={s.btnPrimary} onClick={post} disabled={busy}>
              <Send size={13} /> {busy ? "Posting…" : "Post Announcement"}
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
        title="All Announcements"
        subtitle={`${items.length} total`}
      >
        {loading && <div class={s.loading}>Loading…</div>}
        {!loading && items.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Megaphone size={24} />
            </div>
            <div class={s.emptyTitle}>No announcements yet</div>
            <div class={s.emptyText}>
              {canPost
                ? "Post the first announcement above."
                : "Check back later for updates."}
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
                    <Bell size={10} /> Ping
                  </span>
                )}
              </div>
              {a.body && <div class={s.announcementBody}>{a.body}</div>}
              <div class={s.announcementMeta}>
                <span>by {a.author_username || a.author_user_id || ""}</span>
                <span>•</span>
                <span title={formatDateTime(a.created_at)}>
                  {formatRelativeTime(a.created_at * 1000)}
                </span>
              </div>
              {canPost && (
                <div class={s.announcementActions}>
                  <button class={s.btnDanger} onClick={() => del(a.id)}>
                    <Trash2 size={12} /> Delete
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
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersPages, setMembersPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [targetRoles, setTargetRoles] = useState<GroupRole[]>([]);
  const [roleModalMember, setRoleModalMember] = useState<GroupMember | null>(
    null,
  );
  const [roleModalRoles, setRoleModalRoles] = useState<GroupRole[]>([]);
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
      }
    } catch {
      /* ignore */
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
          text: `${targetUser} is not a member of this group.`,
          type: "error",
        });
      } else if (res.ok) {
        const data = await res.json();
        setTargetRoles(data.roles || []);
        setLookupMsg({
          text: `Found ${data.roles?.length || 0} role(s).`,
          type: "success",
        });
      } else {
        const data = await res.json();
        setLookupMsg({ text: data.error || "Lookup failed", type: "error" });
      }
    } catch {
      setLookupMsg({ text: "Network error", type: "error" });
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
      setRoleModalMsg({ text: data.error || "Lookup failed", type: "error" });
    } catch {
      setRoleModalMsg({ text: "Network error", type: "error" });
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
        setLookupMsg({ text: "Role assigned.", type: "success" });
        if (roleModalMember && roleModalMember.user_id === userId) {
          setRoleModalMsg({ text: "Role assigned.", type: "success" });
          const roles = await loadRolesFor(userId);
          if (roles) setRoleModalRoles(roles);
        } else {
          lookup();
        }
        loadMembers(membersPage);
      } else {
        setLookupMsg({ text: data.error || "Failed", type: "error" });
        setRoleModalMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setLookupMsg({ text: "Network error", type: "error" });
      setRoleModalMsg({ text: "Network error", type: "error" });
    }
  }

  async function removeRole(userId: string, roleId: string) {
    if (!confirm("Remove this role from the user?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setLookupMsg({ text: "Role removed.", type: "success" });
        if (roleModalMember && roleModalMember.user_id === userId) {
          setRoleModalMsg({ text: "Role removed.", type: "success" });
          const roles = await loadRolesFor(userId);
          if (roles) setRoleModalRoles(roles);
        } else {
          lookup();
        }
        loadMembers(membersPage);
      } else {
        setLookupMsg({ text: data.error || "Failed", type: "error" });
        setRoleModalMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setLookupMsg({ text: "Network error", type: "error" });
      setRoleModalMsg({ text: "Network error", type: "error" });
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
      <AccountSection
        icon={<Users size={18} />}
        title="Your Membership"
        subtitle={isMember ? "You are a member" : "You are not a member"}
      >
        {!isMember ? (
          <div class={s.empty}>
            <div class={s.emptyText}>
              Join this group to see your roles here.
            </div>
          </div>
        ) : myRoles.length === 0 ? (
          <div class={s.empty}>
            <div class={s.emptyText}>
              You have no roles assigned. Contact an owner.
            </div>
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
          title="Members"
          subtitle={`${membersTotal} member${membersTotal === 1 ? "" : "s"}`}
        >
          <div class={s.actionRow}>
            <input
              type="text"
              class={s.formInput}
              placeholder="Search members…"
              value={memberSearch}
              onInput={(e) =>
                setMemberSearch((e.target as HTMLInputElement).value)
              }
              onKeyDown={(e) => {
                if ((e as KeyboardEvent).key === "Enter") searchMembers();
              }}
            />
            <button class={s.btnSecondary} onClick={searchMembers}>
              <Search size={13} /> Search
            </button>
          </div>
          {membersLoading ? (
            <div class={s.empty}>
              <div class={s.emptyText}>Loading members…</div>
            </div>
          ) : members.length === 0 ? (
            <div class={s.empty}>
              <div class={s.emptyText}>No members found.</div>
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
                        <Edit3 size={12} /> Edit roles
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
                    Prev
                  </button>
                  <span class={s.pageIndicator}>
                    Page {membersPage} of {membersPages}
                  </span>
                  <button
                    class={s.btnSecondary}
                    disabled={membersPage >= membersPages}
                    onClick={() => setMembersPage((p) => p + 1)}
                  >
                    Next
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
          title="Manage Member Roles"
          subtitle="Look up a member by username to assign or remove roles"
        >
          <div class={s.actionRow}>
            <input
              type="text"
              class={s.formInput}
              placeholder="Username"
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
              <Search size={13} /> {busy ? "Looking up…" : "Lookup"}
            </button>
          </div>
          {lookupMsg && (
            <div class={lookupMsg.type === "success" ? s.success : s.error}>
              {lookupMsg.text}
            </div>
          )}

          {targetUser && targetRoles.length > 0 && (
            <div class={s.manageList}>
              <h4 class={s.manageListTitle}>Roles for {targetUser}</h4>
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
                      <UserMinus size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {targetUser && availableToAssign.length > 0 && (
            <div class={s.manageList}>
              <h4 class={s.manageListTitle}>Available to assign</h4>
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
                    <UserPlus size={12} /> Assign
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
            class={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div class={s.modalHeader}>
              <div>
                <h2 id="role-modal-title" class={s.modalTitle}>
                  Edit Roles
                </h2>
                <p class={s.modalSubtitle}>{roleModalMember.username}</p>
              </div>
              <button
                class={s.iconButton}
                aria-label="Close"
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
                <h4 class={s.manageListTitle}>Current roles</h4>
                {roleModalRoles.length === 0 && (
                  <div class={s.emptyText}>No roles assigned.</div>
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
                        <UserMinus size={12} /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div class={s.manageList}>
                <h4 class={s.manageListTitle}>Available roles</h4>
                {modalAvailableToAssign.length === 0 && (
                  <div class={s.emptyText}>No roles available to assign.</div>
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
                      <UserPlus size={12} /> Assign
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
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [products, setProducts] = useState<GroupProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
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
      if (res.ok) setProducts(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
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
    if (!newName.trim()) {
      setMsg({ text: "Name required", type: "error" });
      return;
    }
    setMsg(null);
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
                text: `Role created but benefits failed: ${patchData.error || "unknown"}`,
                type: "error",
              });
            }
          }
        }
        setMsg({ text: "Role created.", type: "success" });
        setCreating(false);
        setNewName("");
        setNewDesc("");
        setNewAssignOnJoin(false);
        setNewSelfAssignable(false);
        setNewBenefits("");
        onRolesChanged();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
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
        setMsg({ text: "Role updated.", type: "success" });
        setEditingId(null);
        onRolesChanged();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  async function del(role: GroupRole) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/roles/${encodeURIComponent(role.id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Role deleted.", type: "success" });
        onRolesChanged();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  async function createProduct() {
    const price = parseFloat(productPrice);
    if (!productName.trim()) {
      setMsg({ text: "Product name required", type: "error" });
      return;
    }
    if (!productRoleId) {
      setMsg({ text: "Choose a role to sell", type: "error" });
      return;
    }
    if (!price || price <= 0) {
      setMsg({ text: "Enter a valid price", type: "error" });
      return;
    }
    const frequency = parseInt(productFrequency);
    if (productSubscription && (!frequency || frequency <= 0)) {
      setMsg({ text: "Enter a valid billing frequency", type: "error" });
      return;
    }
    setMsg(null);
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
        setMsg({ text: "Role product created.", type: "success" });
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
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  async function deleteProduct(product: GroupProduct) {
    if (!confirm(`Delete product "${product.name}"?`)) return;
    setMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/products/${encodeURIComponent(product.id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Role product deleted.", type: "success" });
        loadProducts();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  async function purchaseProduct(product: GroupProduct) {
    if (!confirm(`Buy ${product.name} for ${product.price_credits} credits?`))
      return;
    setMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/products/${encodeURIComponent(product.id)}/purchase?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Role purchased.", type: "success" });
        if (reloadUser) await reloadUser();
        onMembershipChanged();
        loadProducts();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  return (
    <div class={s.tabColumn}>
      {canManage && (
        <AccountSection
          icon={<Plus size={18} />}
          title="New Role"
          subtitle="Create a new role for members"
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
                  <label>Name</label>
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
                  <label>Description</label>
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
                  <label for="new-assign-on-join">Assign on join</label>
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
                  <label for="new-self-assign">
                    Members can self-assign this role
                  </label>
                </div>
              </div>
              <div class={s.formGroup}>
                <label>Benefits</label>
                <input
                  type="text"
                  class={s.formInput}
                  placeholder="custom_color, priority_access"
                  value={newBenefits}
                  onInput={(e) =>
                    setNewBenefits((e.target as HTMLInputElement).value)
                  }
                />
                <small class={s.formHint}>
                  Comma-separated benefit identifiers.
                </small>
              </div>
              <div class={s.formActions}>
                <button class={s.btnPrimary} onClick={create}>
                  <Save size={13} /> Create Role
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
                  Cancel
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
        title="Role Shop"
        subtitle="Buy roles with credits or manage role products"
        actions={
          canManage &&
          !creatingProduct && (
            <button
              class={s.btnPrimary}
              onClick={() => setCreatingProduct(true)}
            >
              <Plus size={13} /> Sell Role
            </button>
          )
        }
      >
        {canManage && creatingProduct && (
          <div class={s.roleCard}>
            <div class={s.formRow}>
              <div class={s.formGroup}>
                <label>Product name</label>
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
                <label>Price</label>
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
              <label>Role granted</label>
              <select
                class={s.formInput}
                value={productRoleId}
                onChange={(e) =>
                  setProductRoleId((e.target as HTMLSelectElement).value)
                }
              >
                <option value="">Choose a role</option>
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
                <label for="product-subscription">Recurring subscription</label>
              </div>
            </div>
            {productSubscription && (
              <div class={s.formRow}>
                <div class={s.formGroup}>
                  <label>Frequency</label>
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
                  <label>Period</label>
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
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                  </select>
                </div>
              </div>
            )}
            <div class={s.formGroup}>
              <label>Description</label>
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
              <button class={s.btnPrimary} onClick={createProduct}>
                <Save size={13} /> Create Product
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
                Cancel
              </button>
            </div>
          </div>
        )}

        {productsLoading && <div class={s.loading}>Loading role shop…</div>}
        {!productsLoading && products.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyText}>No purchasable roles yet.</div>
          </div>
        )}
        <div class={s.rolesList}>
          {products.map((product) => (
            <div key={product.id} class={s.roleCard}>
              <div class={s.roleCardHeader}>
                <div>
                  <div class={s.roleName}>{product.name}</div>
                  <div class={s.roleDescription}>
                    Grants {product.role_name || product.role_granted_id}
                    {product.subscription &&
                      ` · every ${product.frequency || 1} ${product.period || "month"}${(product.frequency || 1) > 1 ? "s" : ""}`}
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
                  >
                    <Coins size={13} /> Buy Role
                  </button>
                )}
                {canManage && (
                  <button
                    class={s.btnDanger}
                    onClick={() => deleteProduct(product)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </AccountSection>

      <AccountSection
        icon={<Shield size={18} />}
        title="All Roles"
        subtitle={`${groupRoles.length} role(s)`}
      >
        {groupRoles.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyText}>No roles defined yet.</div>
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
                        <label>Name</label>
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
                        <label>Description</label>
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
                        <label for={`edit-join-${r.id}`}>Assign on join</label>
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
                        <label for={`edit-self-${r.id}`}>Self-assignable</label>
                      </div>
                    </div>
                    <div class={s.formGroup}>
                      <label>Permissions</label>
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
                            {PERMISSION_LABELS[p] || p}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div class={s.formGroup}>
                      <label>Benefits</label>
                      <input
                        type="text"
                        class={s.formInput}
                        placeholder="custom_color, priority_access"
                        value={editBenefits}
                        onInput={(e) =>
                          setEditBenefits((e.target as HTMLInputElement).value)
                        }
                      />
                      <small class={s.formHint}>
                        Comma-separated benefit identifiers.
                      </small>
                    </div>
                    <div class={s.formActions}>
                      <button class={s.btnPrimary} onClick={() => saveEdit(r)}>
                        <Save size={13} /> Save
                      </button>
                      <button
                        class={s.btnSecondary}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div class={s.roleCardHeader}>
                      <div class={s.roleName}>{r.name}</div>
                      <div class={s.roleBadges}>
                        {r.assign_on_join && (
                          <span class={s.miniTag}>on join</span>
                        )}
                        {r.self_assignable && (
                          <span class={s.miniTag}>self-assign</span>
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
                            {PERMISSION_LABELS[p] || p}
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
                          <Edit3 size={12} /> Edit
                        </button>
                        <button class={s.btnDanger} onClick={() => del(r)}>
                          <Trash2 size={12} /> Delete
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
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function create() {
    if (!title.trim()) {
      setMsg({ text: "Title is required", type: "error" });
      return;
    }
    const start = new Date(startTime);
    if (!startTime || isNaN(start.getTime())) {
      setMsg({ text: "Valid start time is required", type: "error" });
      return;
    }
    if (published && !canPublish) {
      setMsg({
        text: "You don't have permission to publish events",
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
        setMsg({ text: "Event created!", type: "success" });
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
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
    setBusy(false);
  }

  async function updateEvent(event: GroupEvent, publishedValue: boolean) {
    if (publishedValue && !canPublish) {
      setMsg({
        text: "You don't have permission to publish events",
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
          text: publishedValue ? "Event published." : "Event moved to draft.",
          type: "success",
        });
        load();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  async function deleteEvent(event: GroupEvent) {
    if (!confirm(`Delete event "${event.title}"?`)) return;
    setMsg(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/events/${encodeURIComponent(event.id)}?${authQs().slice(1)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: "Event deleted.", type: "success" });
        load();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  const visible = isPublic
    ? events
    : isMember
      ? events
      : events.filter((e) => e.visibility === "PUBLIC");

  return (
    <div class={s.tabColumn}>
      {canManage && (
        <AccountSection
          icon={<Plus size={18} />}
          title="New Event"
          subtitle="Schedule an event for members"
          actions={
            !creating && (
              <button class={s.btnPrimary} onClick={() => setCreating(true)}>
                <Plus size={13} /> New Event
              </button>
            )
          }
        >
          {creating && (
            <>
              <div class={s.formGroup}>
                <label>Title</label>
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
                <label>Description</label>
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
                  Location
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
                  <label>Start Time</label>
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
                  <label>Duration (hours)</label>
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
                  <label>Visibility</label>
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
                    <option value="MEMBERS">Members only</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
                <div class={s.formGroup}>
                  <label>Status</label>
                  <div class={s.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="event-pub"
                      checked={published}
                      onChange={(e) =>
                        setPublished((e.target as HTMLInputElement).checked)
                      }
                    />
                    <label for="event-pub">Published</label>
                  </div>
                </div>
              </div>
              <div class={s.formActions}>
                <button class={s.btnPrimary} onClick={create} disabled={busy}>
                  <Save size={13} /> {busy ? "Creating…" : "Create Event"}
                </button>
                <button
                  class={s.btnSecondary}
                  onClick={() => setCreating(false)}
                >
                  Cancel
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
        title="Events"
        subtitle={`${visible.length} event(s)`}
      >
        {loading && <div class={s.loading}>Loading…</div>}
        {!loading && visible.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Calendar size={24} />
            </div>
            <div class={s.emptyTitle}>No events scheduled</div>
            <div class={s.emptyText}>
              {canManage
                ? "Create the first event above."
                : "Check back later."}
            </div>
          </div>
        )}
        <div class={s.eventList}>
          {visible.map((e) => (
            <div key={e.id} class={s.eventCard}>
              <div class={s.eventHeader}>
                <h3 class={s.eventTitle}>{e.title}</h3>
                <div class={s.eventBadges}>
                  {!e.published && <span class={s.miniTag}>draft</span>}
                  <span class={s.miniTag}>
                    {e.visibility === "PUBLIC" ? "public" : "members"}
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
                    <Save size={12} /> {e.published ? "Make Draft" : "Publish"}
                  </button>
                  <button class={s.btnDanger} onClick={() => deleteEvent(e)}>
                    <Trash2 size={12} /> Delete
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
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [bans, setBans] = useState<GroupBan[]>([]);
  const [withdrawals, setWithdrawals] = useState<GroupWithdrawal[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [banReason, setBanReason] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
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

  async function runAction(
    successText: string,
    input: RequestInfo,
    init?: RequestInit,
  ) {
    setMsg(null);
    try {
      const res = await fetch(input, init);
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: successText, type: "success" });
        await loadAdminData();
        onGroupChanged();
        if (reloadUser) await reloadUser();
      } else {
        setMsg({ text: data.error || "Action failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
  }

  async function invite() {
    if (!inviteUsername.trim()) return;
    await runAction(
      "Invite sent.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/invites?username=${encodeURIComponent(inviteUsername.trim())}&${authQs().slice(1)}`,
      { method: "POST" },
    );
    setInviteUsername("");
  }

  async function handleRequest(id: string, action: "accept" | "decline") {
    await runAction(
      action === "accept" ? "Join request accepted." : "Join request declined.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join_requests/${encodeURIComponent(id)}/${action}?${authQs().slice(1)}`,
      { method: "POST" },
    );
  }

  async function revokeInvite(id: string) {
    if (!confirm("Revoke this invite?")) return;
    await runAction(
      "Invite revoked.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/invites/${encodeURIComponent(id)}?${authQs().slice(1)}`,
      { method: "DELETE" },
    );
  }

  async function kick(member: GroupMember) {
    if (!confirm(`Remove ${member.username} from this group?`)) return;
    await runAction(
      "Member removed.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(member.user_id)}?${authQs().slice(1)}`,
      { method: "DELETE" },
    );
  }

  async function ban(member: GroupMember) {
    if (!confirm(`Ban ${member.username} from this group?`)) return;
    const params = new URLSearchParams();
    if (banReason.trim()) params.set("reason", banReason.trim());
    await runAction(
      "Member banned.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(member.user_id)}/ban?${params.toString()}&${authQs().slice(1)}`,
      { method: "POST" },
    );
  }

  async function unban(banItem: GroupBan) {
    await runAction(
      "Member unbanned.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(banItem.user_id)}/ban?${authQs().slice(1)}`,
      { method: "DELETE" },
    );
  }

  async function transfer(member: GroupMember) {
    if (
      !confirm(
        `Transfer ownership of ${group.name} to ${member.username}? You will no longer be the owner.`,
      )
    ) {
      return;
    }
    await runAction(
      "Ownership transferred.",
      `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/transfer/${encodeURIComponent(member.user_id)}?${authQs().slice(1)}`,
      { method: "POST" },
    );
  }

  async function withdraw() {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setMsg({ text: "Enter a valid withdrawal amount", type: "error" });
      return;
    }
    if (!confirm(`Withdraw ${amount} credits from the group balance?`)) return;
    await runAction(
      "Withdrawal complete.",
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
      {msg && (
        <div class={msg.type === "success" ? s.success : s.error}>
          {msg.text}
        </div>
      )}

      {canInvite && (
        <>
          <AccountSection
            icon={<UserPlus size={18} />}
            title="Invites"
            subtitle="Send and revoke pending invitations"
          >
            <div class={s.actionRow}>
              <input
                class={s.formInput}
                value={inviteUsername}
                placeholder="Username"
                onInput={(e) =>
                  setInviteUsername((e.target as HTMLInputElement).value)
                }
              />
              <button
                class={s.btnPrimary}
                onClick={invite}
                disabled={!inviteUsername.trim()}
              >
                <UserPlus size={13} /> Invite
              </button>
            </div>
            <div class={s.manageList}>
              {invites.length === 0 && (
                <div class={s.emptyText}>No pending invites.</div>
              )}
              {invites.map((inviteItem) => (
                <div key={inviteItem.id} class={s.manageRow}>
                  <div>
                    <div class={s.roleName}>{inviteItem.to_username}</div>
                    <div class={s.roleDescription}>
                      Invited by {inviteItem.from_username}{" "}
                      {formatRelativeTime(inviteItem.created_at * 1000)}
                    </div>
                  </div>
                  <button
                    class={s.btnDanger}
                    onClick={() => revokeInvite(inviteItem.id)}
                  >
                    <Trash2 size={12} /> Revoke
                  </button>
                </div>
              ))}
            </div>
          </AccountSection>

          <AccountSection
            icon={<LogIn size={18} />}
            title="Join Requests"
            subtitle="Approve or decline requested access"
          >
            <div class={s.manageList}>
              {requests.length === 0 && (
                <div class={s.emptyText}>No pending join requests.</div>
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
                      <X size={12} /> Decline
                    </button>
                    <button
                      class={s.btnPrimary}
                      onClick={() => handleRequest(request.id, "accept")}
                    >
                      <UserPlus size={12} /> Accept
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
          title="Member Actions"
          subtitle="Remove members, ban accounts, or transfer ownership"
          actions={
            <button
              class={s.btnSecondary}
              onClick={loadAdminData}
              disabled={busy}
            >
              <Search size={13} /> Refresh
            </button>
          }
        >
          {canBan && (
            <div class={s.formGroup}>
              <label>Ban reason</label>
              <input
                class={s.formInput}
                maxlength={200}
                value={banReason}
                placeholder="Optional reason used for the next ban"
                onInput={(e) =>
                  setBanReason((e.target as HTMLInputElement).value)
                }
              />
            </div>
          )}
          <div class={s.manageList}>
            {manageableMembers.length === 0 && (
              <div class={s.emptyText}>No manageable members found.</div>
            )}
            {manageableMembers.map((member) => (
              <div key={member.id} class={s.manageRow}>
                <div>
                  <div class={s.roleName}>{member.username}</div>
                  <div class={s.roleDescription}>
                    Joined {formatRelativeTime(member.joined_at * 1000)}
                  </div>
                </div>
                <div class={s.rowActions}>
                  {isOwner && (
                    <button
                      class={s.btnSecondary}
                      onClick={() => transfer(member)}
                    >
                      <Crown size={12} /> Transfer
                    </button>
                  )}
                  {canRemove && (
                    <button class={s.btnDanger} onClick={() => kick(member)}>
                      <UserMinus size={12} /> Remove
                    </button>
                  )}
                  {canBan && (
                    <button class={s.btnDanger} onClick={() => ban(member)}>
                      <Shield size={12} /> Ban
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
          title="Bans"
          subtitle="Review and remove group bans"
        >
          <div class={s.manageList}>
            {bans.length === 0 && <div class={s.emptyText}>No bans.</div>}
            {bans.map((banItem) => (
              <div key={banItem.id} class={s.manageRow}>
                <div>
                  <div class={s.roleName}>{banItem.username}</div>
                  <div class={s.roleDescription}>
                    By {banItem.banned_by}
                    {banItem.reason ? `: ${banItem.reason}` : ""}
                  </div>
                </div>
                <button class={s.btnSecondary} onClick={() => unban(banItem)}>
                  <UserPlus size={12} /> Unban
                </button>
              </div>
            ))}
          </div>
        </AccountSection>
      )}

      {canWithdraw && (
        <AccountSection
          icon={<Coins size={18} />}
          title="Tip Jar"
          subtitle={`Group balance: ${group.credits_balance.toLocaleString()} credits`}
        >
          <div class={s.actionRow}>
            <input
              type="number"
              min={0}
              step="0.01"
              class={s.formInput}
              value={withdrawAmount}
              placeholder="Amount to withdraw"
              onInput={(e) =>
                setWithdrawAmount((e.target as HTMLInputElement).value)
              }
            />
            <button
              class={s.btnPrimary}
              onClick={withdraw}
              disabled={!withdrawAmount}
            >
              <Coins size={13} /> Withdraw
            </button>
          </div>
          <div class={s.manageList}>
            {withdrawals.length === 0 && (
              <div class={s.emptyText}>No recent withdrawals.</div>
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
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tag]);

  async function send() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setMsg({ text: "Enter a valid amount", type: "error" });
      return;
    }
    if (!confirm(`Send ${amt} credits to this group? This cannot be undone.`))
      return;
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
        setMsg({ text: `Sent ${amt} credits!`, type: "success" });
        setAmount("");
        setNote("");
        if (reloadUser) await reloadUser();
        onSent();
        load();
      } else {
        setMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error", type: "error" });
    }
    setBusy(false);
  }

  return (
    <div class={s.tabColumn}>
      {balanceVisible && (
        <AccountSection
          icon={<Coins size={18} />}
          title="Group Balance"
          subtitle="Total tips received by this group"
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
          title="Send a Tip"
          subtitle="Support the group with credits"
        >
          <div class={s.actionRow}>
            <input
              type="number"
              class={s.formInput}
              min={0}
              step="0.01"
              placeholder="Amount in credits"
              value={amount}
              onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
            />
            <button
              class={s.btnPrimary}
              onClick={send}
              disabled={busy || !amount}
            >
              <Send size={13} /> {busy ? "Sending…" : "Send Tip"}
            </button>
          </div>
          <div class={s.formGroup} style={{ marginTop: "0.75rem" }}>
            <label>Note</label>
            <input
              type="text"
              class={s.formInput}
              maxlength={200}
              placeholder="Optional message with your tip"
              value={note}
              onInput={(e) => setNote((e.target as HTMLInputElement).value)}
            />
            <small class={s.formHint}>{note.length} / 200 characters.</small>
          </div>
          {user && (
            <small class={s.formHint}>
              Your balance: {(user["sys.currency"] ?? 0).toLocaleString()}{" "}
              credits
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
        title="Recent Tips"
        subtitle={`${tips.length} tip${tips.length === 1 ? "" : "s"}`}
      >
        {loading && <div class={s.loading}>Loading…</div>}
        {!loading && tips.length === 0 && (
          <div class={s.empty}>
            <div class={s.emptyIcon}>
              <Coins size={24} />
            </div>
            <div class={s.emptyTitle}>No tips yet</div>
            <div class={s.emptyText}>
              {canTip
                ? "Be the first to support the group!"
                : "Join the group to send a tip."}
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
