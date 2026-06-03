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
  Image as ImageIcon,
  ImagePlus,
} from "lucide-preact";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { UserAvatar } from "../../components/UserAvatar";
import { useAuth, getToken, formatRelativeTime } from "../../lib/auth";
import s from "./GroupDetail.module.css";

const API_BASE_URL = "https://api.rotur.dev";

type JoinPolicy = "OPEN" | "REQUEST" | "INVITE";
type EventVisibility = "MEMBERS" | "PUBLIC";

interface GroupPublic {
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
  created_at: number;
}

type DetailTab =
  | "overview"
  | "announcements"
  | "members"
  | "roles"
  | "events"
  | "tips";

const ALL_PERMISSIONS = [
  "groups.manage",
  "groups.members.invite",
  "groups.members.remove",
  "groups.members.view",
  "groups.roles.manage",
  "groups.roles.assign",
  "groups.announcements.send",
  "groups.events.manage",
  "groups.events.publish",
  "groups.tips.manage",
  "groups.group.edit",
];

const PERMISSION_LABELS: Record<string, string> = {
  "groups.manage": "Manage Group",
  "groups.members.invite": "Invite Members",
  "groups.members.remove": "Remove Members",
  "groups.members.view": "View Members",
  "groups.roles.manage": "Manage Roles",
  "groups.roles.assign": "Assign Roles",
  "groups.announcements.send": "Send Announcements",
  "groups.events.manage": "Manage Events",
  "groups.events.publish": "Publish Events",
  "groups.tips.manage": "Manage Tips",
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
    if (user["sys.group"] === tag) {
      setRepresenting(true);
    }
  }, [user, tag]);

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

  if (loading) {
    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
            <div class={s.loading}>Loading group…</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
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
          </div>
        </div>
        <Footer />
      </div>
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

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
          <a class={s.backBtn} href="/groups">
            <ArrowLeft size={14} /> Back to Groups
          </a>

          <div class={s.headerCard}>
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
            <div class={s.headerBody}>
              <div class={s.headerTop}>
                {group.icon_url ? (
                  <img src={group.icon_url} alt={group.name} class={s.icon} />
                ) : (
                  <div class={s.iconPlaceholder}>
                    <Users size={28} />
                  </div>
                )}
                <div class={s.headerTitles}>
                  <h1 class={s.groupName}>{group.name}</h1>
                  <div class={s.groupTag}>@{group.tag}</div>
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
                        <Coins size={11} /> {group.entry_fee.toLocaleString()}{" "}
                        to join
                      </span>
                    )}
                    {group.credits_balance > 0 && (
                      <span class={s.metaChip}>
                        <Coins size={11} />{" "}
                        {group.credits_balance.toLocaleString()} balance
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {group.description && (
                <div class={s.description}>{group.description}</div>
              )}

              {actionMessage && (
                <div
                  class={actionMessage.type === "success" ? s.success : s.error}
                >
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
                    {group.entry_fee > 0
                      ? `Join (${group.entry_fee} credits)`
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
                      <button
                        class={s.btnSecondary}
                        onClick={disrepresentGroup}
                      >
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

          <div class={s.tabsBar} role="tablist" aria-label="Group sections">
            <div class={s.tabs}>
              {tabs.map(({ id, label, icon: Icon }) => (
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
          </div>

          <div role="tabpanel" class={s.tabPanel}>
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
                onSent={() => {
                  loadGroup();
                  setActionMessage({
                    text: "Tip sent!",
                    type: "success",
                  });
                }}
              />
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
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
  const [description, setDescription] = useState(group.description);
  const [readme, setReadme] = useState(group.readme || "");
  const [rules, setRules] = useState(group.rules || "");
  const [entryFee, setEntryFee] = useState(String(group.entry_fee || 0));
  const [iconUrl, setIconUrl] = useState(group.icon_url);
  const [bannerUrl, setBannerUrl] = useState(group.banner_url);
  const [isPublic, setIsPublic] = useState(group.public);
  const [policy, setPolicy] = useState<JoinPolicy>(group.join_policy);
  const [busy, setBusy] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  async function save() {
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
            description,
            readme,
            rules,
            entry_fee: fee,
            icon: iconUrl,
            banner_url: bannerUrl,
            public: isPublic,
            join_policy: policy,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
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

  async function uploadIcon(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onMessage({ text: "Image must be under 5MB", type: "error" });
      return;
    }
    setUploadingIcon(true);
    onMessage(null);
    try {
      const fd = new FormData();
      fd.append("icon", file);
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(group.tag)}/icon?${authQs().slice(1)}`,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (res.ok) {
        onMessage({ text: "Icon uploaded.", type: "success" });
        onUpdated();
      } else {
        onMessage({ text: data.error || "Icon upload failed", type: "error" });
      }
    } catch {
      onMessage({ text: "Network error", type: "error" });
    }
    setUploadingIcon(false);
  }

  async function uploadBanner(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onMessage({ text: "Image must be under 5MB", type: "error" });
      return;
    }
    setUploadingBanner(true);
    onMessage(null);
    try {
      const fd = new FormData();
      fd.append("banner", file);
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(group.tag)}/banner?${authQs().slice(1)}`,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (res.ok) {
        onMessage({ text: "Banner uploaded.", type: "success" });
        onUpdated();
      } else {
        onMessage({
          text: data.error || "Banner upload failed",
          type: "error",
        });
      }
    } catch {
      onMessage({ text: "Network error", type: "error" });
    }
    setUploadingBanner(false);
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
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <KeyRound size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>Your Roles</h2>
                <p class={s.sectionSubtitle}>
                  {myRoles.length} role{myRoles.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          <div class={s.sectionBody}>
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
          </div>
        </div>
      )}

      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Info size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>About</h2>
              <p class={s.sectionSubtitle}>Group information and settings</p>
            </div>
          </div>
          {(hasPerm("groups.group.edit") || hasPerm("groups.manage")) &&
            !editing && (
              <div class={s.sectionActions}>
                {hasPerm("groups.group.edit") && (
                  <button
                    class={s.btnSecondary}
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                )}
                {hasPerm("groups.manage") && (
                  <button class={s.btnDanger} onClick={deleteGroup}>
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            )}
        </div>
        <div class={s.sectionBody}>
          {editing ? (
            <div>
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
                <label>Group Icon</label>
                <div class={s.iconEditRow}>
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={group.name}
                      class={s.iconEditPreview}
                    />
                  ) : (
                    <div class={s.iconEditPlaceholder}>
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <label class={s.fileDrop}>
                    <ImagePlus size={14} />
                    <span>
                      {uploadingIcon
                        ? "Uploading…"
                        : iconUrl
                          ? "Replace icon"
                          : "Upload icon"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingIcon}
                      onChange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) uploadIcon(f);
                      }}
                    />
                  </label>
                </div>
                <small class={s.formHint}>
                  Auto-resized to 256×256 JPEG. Max 5MB.
                </small>
              </div>
              <div class={s.formGroup}>
                <label>Banner</label>
                <div class={s.iconEditRow}>
                  {bannerUrl ? (
                    <div
                      class={s.bannerEditPreview}
                      style={{ backgroundImage: `url(${bannerUrl})` }}
                    />
                  ) : (
                    <div class={s.bannerEditPlaceholder}>
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <label class={s.fileDrop}>
                    <ImagePlus size={14} />
                    <span>
                      {uploadingBanner
                        ? "Uploading…"
                        : bannerUrl
                          ? "Replace banner"
                          : "Upload banner"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBanner}
                      onChange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) uploadBanner(f);
                      }}
                    />
                  </label>
                </div>
                <small class={s.formHint}>
                  Auto-resized to banner dimensions. Max 5MB.
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
                    setPolicy(
                      (e.target as HTMLSelectElement).value as JoinPolicy,
                    )
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
                    setDescription(group.description);
                    setReadme(group.readme || "");
                    setRules(group.rules || "");
                    setEntryFee(String(group.entry_fee || 0));
                    setIconUrl(group.icon_url);
                    setBannerUrl(group.banner_url);
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
                <div class={s.detailItem}>
                  <h4>Credit Balance</h4>
                  <div class={s.detailValue}>
                    {group.credits_balance.toLocaleString()}
                  </div>
                </div>
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
        </div>
      </div>
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
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </div>
              <div>
                <h2 class={s.sectionTitle}>Notifications</h2>
                <p class={s.sectionSubtitle}>
                  {muted
                    ? "You will not receive announcements"
                    : "You receive announcements for this group"}
                </p>
              </div>
            </div>
            <button class={s.btnSecondary} onClick={toggleMute}>
              {muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {muted ? "Unmute" : "Mute"}
            </button>
          </div>
        </div>
      )}

      {canPost && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <Plus size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>New Announcement</h2>
                <p class={s.sectionSubtitle}>
                  Share an update with all members
                </p>
              </div>
            </div>
          </div>
          <div class={s.sectionBody}>
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
                onInput={(e) =>
                  setBody((e.target as HTMLTextAreaElement).value)
                }
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
          </div>
        </div>
      )}

      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Megaphone size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>All Announcements</h2>
              <p class={s.sectionSubtitle}>{items.length} total</p>
            </div>
          </div>
        </div>
        <div class={s.sectionBody}>
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
        </div>
      </div>
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
  const [lookupMsg, setLookupMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const canAssign = isOwner || myPermissions.has("groups.roles.assign");
  const canRemove = isOwner || myPermissions.has("groups.members.remove");
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

  async function assignRole(userId: string, roleId: string) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/members/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setLookupMsg({ text: "Role assigned.", type: "success" });
        lookup();
      } else {
        setLookupMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setLookupMsg({ text: "Network error", type: "error" });
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
        lookup();
      } else {
        setLookupMsg({ text: data.error || "Failed", type: "error" });
      }
    } catch {
      setLookupMsg({ text: "Network error", type: "error" });
    }
  }

  const targetHasRole = (roleId: string) =>
    targetRoles.some((r) => r.id === roleId);
  const availableToAssign = groupRoles.filter(
    (r) => r.name !== "Owner" && !targetHasRole(r.id),
  );

  function getRoleName(roleId: string): string {
    const role = groupRoles.find((r) => r.id === roleId);
    return role?.name || roleId;
  }

  return (
    <div class={s.tabColumn}>
      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Users size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>Your Membership</h2>
              <p class={s.sectionSubtitle}>
                {isMember ? "You are a member" : "You are not a member"}
              </p>
            </div>
          </div>
        </div>
        <div class={s.sectionBody}>
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
        </div>
      </div>

      {canViewMembers && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <Users size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>Members</h2>
                <p class={s.sectionSubtitle}>
                  {membersTotal} member{membersTotal === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          <div class={s.sectionBody}>
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
                    <a
                      key={m.id}
                      class={s.memberRow}
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
                      <span class={s.memberJoined}>
                        {formatRelativeTime(m.joined_at * 1000)}
                      </span>
                    </a>
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
          </div>
        </div>
      )}

      {canAssign && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <UserPlus size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>Manage Member Roles</h2>
                <p class={s.sectionSubtitle}>
                  Look up a member by username to assign or remove roles
                </p>
              </div>
            </div>
          </div>
          <div class={s.sectionBody}>
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
                    {canRemove && r.name !== "Owner" && (
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
}: {
  tag: string;
  groupRoles: GroupRole[];
  onRolesChanged: () => void;
  canManage: boolean;
}) {
  const [msg, setMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

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

  return (
    <div class={s.tabColumn}>
      {canManage && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <Plus size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>New Role</h2>
                <p class={s.sectionSubtitle}>Create a new role for members</p>
              </div>
            </div>
            {!creating && (
              <button class={s.btnPrimary} onClick={() => setCreating(true)}>
                <Plus size={13} /> New Role
              </button>
            )}
          </div>
          {creating && (
            <div class={s.sectionBody}>
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
            </div>
          )}
        </div>
      )}

      {msg && (
        <div class={msg.type === "success" ? s.success : s.error}>
          {msg.text}
        </div>
      )}

      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Shield size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>All Roles</h2>
              <p class={s.sectionSubtitle}>{groupRoles.length} role(s)</p>
            </div>
          </div>
        </div>
        <div class={s.sectionBody}>
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
                          <label for={`edit-join-${r.id}`}>
                            Assign on join
                          </label>
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
                          <label for={`edit-self-${r.id}`}>
                            Self-assignable
                          </label>
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
                            setEditBenefits(
                              (e.target as HTMLInputElement).value,
                            )
                          }
                        />
                        <small class={s.formHint}>
                          Comma-separated benefit identifiers.
                        </small>
                      </div>
                      <div class={s.formActions}>
                        <button
                          class={s.btnPrimary}
                          onClick={() => saveEdit(r)}
                        >
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
        </div>
      </div>
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

  const visible = isPublic
    ? events
    : isMember
      ? events
      : events.filter((e) => e.visibility === "PUBLIC");

  return (
    <div class={s.tabColumn}>
      {canManage && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <Plus size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>New Event</h2>
                <p class={s.sectionSubtitle}>Schedule an event for members</p>
              </div>
            </div>
            {!creating && (
              <button class={s.btnPrimary} onClick={() => setCreating(true)}>
                <Plus size={13} /> New Event
              </button>
            )}
          </div>
          {creating && (
            <div class={s.sectionBody}>
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
            </div>
          )}
        </div>
      )}

      {msg && (
        <div class={msg.type === "success" ? s.success : s.error}>
          {msg.text}
        </div>
      )}

      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Calendar size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>Events</h2>
              <p class={s.sectionSubtitle}>{visible.length} event(s)</p>
            </div>
          </div>
        </div>
        <div class={s.sectionBody}>
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tips tab ──

function TipsTab({
  tag,
  isMember,
  isPublic,
  groupBalance,
  onSent,
}: {
  tag: string;
  isMember: boolean;
  isPublic: boolean;
  groupBalance: number;
  onSent: () => void;
}) {
  const [tips, setTips] = useState<GroupTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
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
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/tips?amount=${amt}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: `Sent ${amt} credits!`, type: "success" });
        setAmount("");
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
      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Coins size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>Group Balance</h2>
              <p class={s.sectionSubtitle}>Total tips received by this group</p>
            </div>
          </div>
          <div class={s.bigBalance}>
            <Coins size={18} />
            <span>{groupBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {canTip && (
        <div class={s.section}>
          <div class={s.sectionHeader}>
            <div class={s.sectionTitleGroup}>
              <div class={s.sectionIcon}>
                <Send size={18} />
              </div>
              <div>
                <h2 class={s.sectionTitle}>Send a Tip</h2>
                <p class={s.sectionSubtitle}>Support the group with credits</p>
              </div>
            </div>
          </div>
          <div class={s.sectionBody}>
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
          </div>
        </div>
      )}

      <div class={s.section}>
        <div class={s.sectionHeader}>
          <div class={s.sectionTitleGroup}>
            <div class={s.sectionIcon}>
              <Coins size={18} />
            </div>
            <div>
              <h2 class={s.sectionTitle}>Recent Tips</h2>
              <p class={s.sectionSubtitle}>
                {tips.length} tip{tips.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <div class={s.sectionBody}>
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
                </div>
                <div class={s.tipAmount}>
                  +{t.amount_credits.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
