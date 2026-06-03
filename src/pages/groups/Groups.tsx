import { useState, useEffect, useMemo } from "preact/hooks";
import {
  Users,
  Search,
  PlusCircle,
  Globe,
  Lock,
  Coins,
  UserPlus,
  Crown,
  Calendar,
  LogIn,
  Eye,
  Megaphone,
} from "lucide-preact";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { useAuth, getToken } from "../../lib/auth";
import s from "./Groups.module.css";

const API_BASE_URL = "https://api.rotur.dev";

type JoinPolicy = "OPEN" | "REQUEST" | "INVITE";

interface GroupNet {
  id: string;
  tag: string;
  name: string;
  description: string;
  icon_url: string;
  banner_url: string;
  owner_user_id: string;
  public: boolean;
  join_policy: JoinPolicy;
  created_at: number;
  credits_balance: number;
  member_count: number;
}

interface GroupPublic {
  tag: string;
  name: string;
  description: string;
  icon_url: string;
  banner_url: string;
  owner_user_id: string;
  public: boolean;
  join_policy: JoinPolicy;
  created_at: number;
  credits_balance: number;
  member_count: number;
}

type HubTab = "my-groups" | "browse" | "create";

const HUB_TABS: { id: HubTab; label: string; icon: typeof Users }[] = [
  { id: "my-groups", label: "My Groups", icon: Users },
  { id: "browse", label: "Browse", icon: Search },
  { id: "create", label: "Create Group", icon: PlusCircle },
];

const JOIN_POLICY_OPTIONS: {
  value: JoinPolicy;
  label: string;
  description: string;
}[] = [
  {
    value: "OPEN",
    label: "Open",
    description: "Anyone can join immediately.",
  },
  {
    value: "REQUEST",
    label: "Request",
    description: "Members must request to join.",
  },
  {
    value: "INVITE",
    label: "Invite Only",
    description: "Only the owner can add members.",
  },
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

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString();
}

function authQs(): string {
  const t = getToken();
  return t ? `&auth=${encodeURIComponent(t)}` : "";
}

export function Groups() {
  const { user, isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<HubTab>("my-groups");

  const [myGroups, setMyGroups] = useState<GroupPublic[]>([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(false);

  const [browseResults, setBrowseResults] = useState<GroupNet[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [createTag, setCreateTag] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIcon, setCreateIcon] = useState("");
  const [createBanner, setCreateBanner] = useState("");
  const [createPublic, setCreatePublic] = useState(true);
  const [createPolicy, setCreatePolicy] = useState<JoinPolicy>("OPEN");
  const [createMessage, setCreateMessage] = useState("");
  const [createMessageType, setCreateMessageType] = useState<
    "success" | "error"
  >("success");
  const [createBusy, setCreateBusy] = useState(false);

  const [joinBusy, setJoinBusy] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (isLoggedIn) loadMyGroups();
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === "browse") loadBrowse();
  }, [activeTab]);

  async function loadMyGroups() {
    setMyGroupsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/mine?${authQs().slice(1)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setMyGroups(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
    setMyGroupsLoading(false);
  }

  async function loadBrowse() {
    setBrowseLoading(true);
    try {
      const res = (await searchQuery.trim())
        ? await fetch(
            `${API_BASE_URL}/groups/search?query=${encodeURIComponent(
              searchQuery.trim(),
            )}&${authQs().slice(1)}`,
          )
        : await fetch(
            `${API_BASE_URL}/groups/search?query=&${authQs().slice(1)}`,
          );
      const data = await res.json();
      if (res.ok) {
        setBrowseResults(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
    setBrowseLoading(false);
  }

  function onSearchSubmit(e: Event) {
    e.preventDefault();
    loadBrowse();
  }

  function resetCreateForm() {
    setCreateTag("");
    setCreateName("");
    setCreateDescription("");
    setCreateIcon("");
    setCreateBanner("");
    setCreatePublic(true);
    setCreatePolicy("OPEN");
    setCreateMessage("");
  }

  async function createGroup() {
    if (!createTag.trim()) {
      setCreateMessage("Tag is required");
      setCreateMessageType("error");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(createTag.trim())) {
      setCreateMessage("Tag must be alphanumeric only");
      setCreateMessageType("error");
      return;
    }
    if (!createName.trim()) {
      setCreateMessage("Name is required");
      setCreateMessageType("error");
      return;
    }
    setCreateBusy(true);
    setCreateMessage("");
    try {
      const params = new URLSearchParams();
      params.set("tag", createTag.trim());
      params.set("name", createName.trim());
      if (createDescription.trim())
        params.set("description", createDescription.trim());
      if (createIcon.trim()) params.set("icon_url", createIcon.trim());
      if (createBanner.trim()) params.set("banner_url", createBanner.trim());
      params.set("public", String(createPublic));
      params.set("join_policy", createPolicy);

      const res = await fetch(
        `${API_BASE_URL}/groups/create?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setCreateMessage(`Group "${createName.trim()}" created!`);
        setCreateMessageType("success");
        resetCreateForm();
        setTimeout(() => {
          window.location.href = `/groups/${encodeURIComponent(
            data.tag || createTag.trim(),
          )}`;
        }, 800);
      } else {
        setCreateMessage(data.error || "Failed to create group");
        setCreateMessageType("error");
      }
    } catch {
      setCreateMessage("Network error occurred");
      setCreateMessageType("error");
    }
    setCreateBusy(false);
  }

  async function joinGroup(tag: string) {
    if (!isLoggedIn) {
      window.location.href = `/auth?return_to=${encodeURIComponent(
        window.location.pathname + window.location.search,
      )}`;
      return;
    }
    setJoinBusy(tag);
    setJoinMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(tag)}/join?${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setJoinMessage({
          text: `Joined "${data.name}" successfully!`,
          type: "success",
        });
        loadMyGroups();
      } else {
        setJoinMessage({ text: data.error || "Failed to join", type: "error" });
      }
    } catch {
      setJoinMessage({ text: "Network error", type: "error" });
    }
    setJoinBusy(null);
  }

  const filteredBrowse = useMemo(() => {
    if (!searchQuery.trim()) return browseResults;
    const q = searchQuery.toLowerCase();
    return browseResults.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tag.toLowerCase().includes(q),
    );
  }, [browseResults, searchQuery]);

  if (!isLoggedIn) {
    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
            <div class={s.authRequired}>
              <div class={s.authRequiredIcon}>
                <Users size={32} />
              </div>
              <div class={s.authRequiredTitle}>Sign in to use Groups</div>
              <div class={s.authRequiredText}>
                Join communities, manage members, and post announcements.
              </div>
              <a
                class={s.btnPrimary}
                href={`/auth?return_to=${encodeURIComponent(
                  window.location.pathname + window.location.search,
                )}`}
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

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
          <div class={s.pageHeader}>
            <div>
              <h1 class={s.pageTitle}>Groups</h1>
              <p class={s.pageSubtitle}>
                Join communities, manage members, and post announcements
              </p>
            </div>
            {user && (
              <div class={s.balance}>
                <Coins size={16} />
                <span>
                  {(user["sys.currency"] ?? 0).toLocaleString()} credits
                </span>
              </div>
            )}
          </div>

          <div class={s.tabsBar} role="tablist" aria-label="Groups sections">
            <div class={s.tabs}>
              {HUB_TABS.map(({ id, label, icon: Icon }) => (
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
            {activeTab === "my-groups" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Your Groups</h2>
                      <p class={s.sectionSubtitle}>
                        {myGroups.length} group
                        {myGroups.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  {myGroupsLoading && (
                    <div class={s.loading}>Loading your groups…</div>
                  )}
                  {!myGroupsLoading && myGroups.length === 0 && (
                    <div class={s.empty}>
                      <div class={s.emptyIcon}>
                        <Users size={24} />
                      </div>
                      <div class={s.emptyTitle}>No groups yet</div>
                      <div class={s.emptyText}>
                        Browse public groups or create your own to get started.
                      </div>
                    </div>
                  )}
                  <div class={s.groupGrid}>
                    {myGroups.map((g) => (
                      <GroupCard key={g.tag} group={g} isMember />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "browse" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <Search size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Browse Public Groups</h2>
                      <p class={s.sectionSubtitle}>
                        {browseResults.length} result
                        {browseResults.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  <form class={s.searchRow} onSubmit={onSearchSubmit}>
                    <input
                      type="text"
                      class={s.searchInput}
                      placeholder="Search by name, description, or tag…"
                      value={searchQuery}
                      onInput={(e) =>
                        setSearchQuery((e.target as HTMLInputElement).value)
                      }
                    />
                    <button
                      class={s.btnPrimary}
                      type="submit"
                      disabled={browseLoading}
                    >
                      <Search size={14} /> Search
                    </button>
                  </form>

                  {joinMessage && (
                    <div
                      class={
                        joinMessage.type === "success" ? s.success : s.error
                      }
                    >
                      {joinMessage.text}
                    </div>
                  )}

                  {browseLoading && (
                    <div class={s.loading}>Searching groups…</div>
                  )}
                  {!browseLoading && browseResults.length === 0 && (
                    <div class={s.empty}>
                      <div class={s.emptyIcon}>
                        <Search size={24} />
                      </div>
                      <div class={s.emptyTitle}>No groups found</div>
                      <div class={s.emptyText}>
                        Try a different search term.
                      </div>
                    </div>
                  )}
                  <div class={s.groupGrid}>
                    {filteredBrowse.map((g) => (
                      <GroupCard
                        key={g.tag}
                        group={g}
                        onJoin={() => joinGroup(g.tag)}
                        joinBusy={joinBusy === g.tag}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "create" && (
              <div class={s.section}>
                <div class={s.sectionHeader}>
                  <div class={s.sectionTitleGroup}>
                    <div class={s.sectionIcon}>
                      <PlusCircle size={18} />
                    </div>
                    <div>
                      <h2 class={s.sectionTitle}>Create a New Group</h2>
                      <p class={s.sectionSubtitle}>
                        Set up your community and invite members
                      </p>
                    </div>
                  </div>
                </div>
                <div class={s.sectionBody}>
                  <div class={s.formGroup}>
                    <label for="group-tag">Tag</label>
                    <input
                      id="group-tag"
                      type="text"
                      class={s.formInput}
                      placeholder="mygroup"
                      maxlength={20}
                      value={createTag}
                      onInput={(e) =>
                        setCreateTag(
                          (e.target as HTMLInputElement).value.toLowerCase(),
                        )
                      }
                    />
                    <small class={s.formHint}>
                      Alphanumeric only. Used in your group URL (max 20
                      characters).
                    </small>
                  </div>

                  <div class={s.formGroup}>
                    <label for="group-name">Name</label>
                    <input
                      id="group-name"
                      type="text"
                      class={s.formInput}
                      placeholder="My Awesome Group"
                      maxlength={50}
                      value={createName}
                      onInput={(e) =>
                        setCreateName((e.target as HTMLInputElement).value)
                      }
                    />
                    <small class={s.formHint}>
                      The display name (max 50 characters).
                    </small>
                  </div>

                  <div class={s.formGroup}>
                    <label for="group-description">Description</label>
                    <textarea
                      id="group-description"
                      class={s.formInput}
                      placeholder="What is this group about?"
                      maxlength={500}
                      rows={4}
                      value={createDescription}
                      onInput={(e) =>
                        setCreateDescription(
                          (e.target as HTMLTextAreaElement).value,
                        )
                      }
                    />
                    <small class={s.formHint}>
                      Brief description (max 500 characters).
                    </small>
                  </div>

                  <div class={s.formRow}>
                    <div class={s.formGroup}>
                      <label for="group-icon">Icon URL</label>
                      <input
                        id="group-icon"
                        type="url"
                        class={s.formInput}
                        placeholder="https://…"
                        value={createIcon}
                        onInput={(e) =>
                          setCreateIcon((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div class={s.formGroup}>
                      <label for="group-banner">Banner URL</label>
                      <input
                        id="group-banner"
                        type="url"
                        class={s.formInput}
                        placeholder="https://…"
                        value={createBanner}
                        onInput={(e) =>
                          setCreateBanner((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                  </div>

                  <div class={s.formGroup}>
                    <div class={s.checkboxGroup}>
                      <input
                        type="checkbox"
                        id="group-public"
                        checked={createPublic}
                        onChange={(e) =>
                          setCreatePublic(
                            (e.target as HTMLInputElement).checked,
                          )
                        }
                      />
                      <label for="group-public">Public group</label>
                    </div>
                    <small class={s.formHint}>
                      Public groups appear in search and can be joined by anyone
                      (subject to join policy).
                    </small>
                  </div>

                  <div class={s.formGroup}>
                    <label>Join Policy</label>
                    <div class={s.policyGrid}>
                      {JOIN_POLICY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          class={`${s.policyCard} ${
                            createPolicy === opt.value ? s.policyCardActive : ""
                          }`}
                          onClick={() => setCreatePolicy(opt.value)}
                        >
                          <div class={s.policyCardName}>{opt.label}</div>
                          <div class={s.policyCardDesc}>{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class={s.formActions}>
                    <button
                      class={s.btnPrimary}
                      onClick={createGroup}
                      disabled={createBusy}
                    >
                      <PlusCircle size={14} />
                      {createBusy ? "Creating…" : "Create Group"}
                    </button>
                    <button
                      class={s.btnSecondary}
                      onClick={resetCreateForm}
                      type="button"
                    >
                      Clear Form
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
        </div>
      </div>
      <Footer />
    </div>
  );
}

function GroupCard({
  group,
  isMember,
  onJoin,
  joinBusy,
}: {
  group: GroupNet | GroupPublic;
  isMember?: boolean;
  onJoin?: () => void;
  joinBusy?: boolean;
}) {
  return (
    <a class={s.groupCard} href={`/groups/${encodeURIComponent(group.tag)}`}>
      {group.banner_url ? (
        <div
          class={s.groupBanner}
          style={{ backgroundImage: `url(${group.banner_url})` }}
        />
      ) : (
        <div class={s.groupBannerPlaceholder}>
          <Megaphone size={28} />
        </div>
      )}
      <div class={s.groupCardBody}>
        <div class={s.groupCardHeader}>
          {group.icon_url ? (
            <img
              src={group.icon_url}
              alt={group.name}
              class={s.groupCardIcon}
            />
          ) : (
            <div class={s.groupCardIconPlaceholder}>
              <Users size={18} />
            </div>
          )}
          <div class={s.groupCardTitles}>
            <div class={s.groupCardName}>{escapeHtml(group.name)}</div>
            <div class={s.groupCardTag}>@{escapeHtml(group.tag)}</div>
          </div>
        </div>
        {group.description && (
          <div class={s.groupCardDescription}>
            {escapeHtml(group.description)}
          </div>
        )}
        <div class={s.groupCardMeta}>
          <span class={s.metaChip}>
            <Users size={11} /> {group.member_count}
          </span>
          <span class={s.metaChip}>
            {group.public ? <Globe size={11} /> : <Lock size={11} />}{" "}
            {group.public ? "Public" : "Private"}
          </span>
          <span class={s.metaChip}>
            <Crown size={11} /> {escapeHtml(group.owner_user_id)}
          </span>
          <span class={s.metaChip}>
            <Calendar size={11} /> {formatDate(group.created_at)}
          </span>
        </div>
        {onJoin && (
          <button
            class={s.joinBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJoin();
            }}
            disabled={joinBusy}
            type="button"
          >
            <UserPlus size={13} /> {joinBusy ? "Joining…" : "Join"}
          </button>
        )}
        {isMember && (
          <div class={s.memberBadge}>
            <Eye size={11} /> View
          </div>
        )}
      </div>
    </a>
  );
}
