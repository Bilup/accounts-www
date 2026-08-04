import { useState, useEffect, useMemo } from "preact/hooks";
import {
  Users,
  Search,
  PlusCircle,
  Globe,
  Lock,
  Coins,
  Crown,
  Calendar,
  Eye,
  Megaphone,
  Trophy,
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Check,
  ImagePlus,
  PartyPopper,
  Save,
  XCircle,
} from "lucide-preact";
import {
  AccountPage,
  AccountPageHeader,
  AccountSection,
  AccountTabPanel,
  AccountTabs,
  AuthRequired,
  EmptyState,
} from "../../components/AccountPage";
import { useAuth, getToken } from "../../lib/auth";
import { plural } from "../../lib/format";
import { useI18n } from "../../i18n/i18n";
import s from "./Groups.module.css";

const API_BASE_URL = "https://api.accounts.bilup.org";

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

type HubTab = "my-groups" | "browse" | "top" | "create";

const HUB_TABS: { id: HubTab; labelKey: string; icon: typeof Users }[] = [
  { id: "my-groups", labelKey: "groups.myGroups", icon: Users },
  { id: "browse", labelKey: "groups.browse", icon: Search },
  { id: "top", labelKey: "groups.top", icon: Trophy },
  { id: "create", labelKey: "groups.createGroup", icon: PlusCircle },
];

const JOIN_POLICY_OPTIONS: {
  value: JoinPolicy;
  labelKey: string;
  descKey: string;
}[] = [
  {
    value: "OPEN",
    labelKey: "groups.policyOpenLabel",
    descKey: "groups.policyOpenDesc",
  },
  {
    value: "REQUEST",
    labelKey: "groups.policyRequestLabel",
    descKey: "groups.policyRequestDesc",
  },
  {
    value: "INVITE",
    labelKey: "groups.policyInviteLabel",
    descKey: "groups.policyInviteDesc",
  },
];

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString();
}

function authQs(): string {
  const t = getToken();
  return t ? `&auth=${encodeURIComponent(t)}` : "";
}

export function Groups() {
  const { t } = useI18n();
  const { user, isLoggedIn, reload: reloadUser } = useAuth();

  const [activeTab, setActiveTab] = useState<HubTab>("my-groups");

  const [myGroups, setMyGroups] = useState<GroupPublic[]>([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(false);

  const [browseResults, setBrowseResults] = useState<GroupNet[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createTag, setCreateTag] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPublic, setCreatePublic] = useState(true);
  const [createPolicy, setCreatePolicy] = useState<JoinPolicy>("OPEN");
  const [createMessage, setCreateMessage] = useState("");
  const [createMessageType, setCreateMessageType] = useState<
    "success" | "error"
  >("success");
  const [createBusy, setCreateBusy] = useState(false);
  const [tagStatus, setTagStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [createdTag, setCreatedTag] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string>("");
  const [iconUploading, setIconUploading] = useState(false);
  const [iconUploaded, setIconUploaded] = useState(false);
  const [iconUrl, setIconUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [bannerSetting, setBannerSetting] = useState(false);
  const [bannerSet, setBannerSet] = useState(false);
  const [entryFee, setEntryFee] = useState("0");
  const [entryFeeBusy, setEntryFeeBusy] = useState(false);
  const [entryFeeSet, setEntryFeeSet] = useState(false);
  const [wizardMessage, setWizardMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const [topGroups, setTopGroups] = useState<GroupPublic[]>([]);
  const [topLoading, setTopLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) loadMyGroups();
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === "browse") loadBrowse();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "top") loadTop();
  }, [activeTab]);

  useEffect(() => {
    const tag = createTag.trim();
    if (!tag) {
      setTagStatus("idle");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(tag)) {
      setTagStatus("invalid");
      return;
    }
    setTagStatus("checking");
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/groups/${encodeURIComponent(tag)}`,
          { signal: ctrl.signal },
        );
        if (res.status === 404) {
          setTagStatus("available");
        } else if (res.ok) {
          setTagStatus("taken");
        } else {
          setTagStatus("idle");
        }
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") {
          setTagStatus("idle");
        }
      }
    }, 500);
    return () => {
      ctrl.abort();
      clearTimeout(handle);
    };
  }, [createTag]);

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
    setBrowseError(null);
    try {
      const res = searchQuery.trim()
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
      } else {
        // A failed search must not read as "there are no groups".
        setBrowseError(data?.error || t("groups.searchError"));
      }
    } catch {
      setBrowseError(t("groups.networkError"));
    }
    setBrowseLoading(false);
  }

  function onSearchSubmit(e: Event) {
    e.preventDefault();
    loadBrowse();
  }

  async function loadTop() {
    setTopLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/groups/top`);
      const data = await res.json();
      if (res.ok) {
        setTopGroups(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
    setTopLoading(false);
  }

  function resetOnboarding() {
    setCreateTag("");
    setCreateName("");
    setCreateDescription("");
    setCreatePublic(true);
    setCreatePolicy("OPEN");
    setCreateMessage("");
    setOnboardingStep(1);
    setCreatedTag(null);
    setCreatedName("");
    setIconUploaded(false);
    setIconUrl("");
    setBannerSet(false);
    setBannerUrl("");
    setEntryFee("0");
    setEntryFeeSet(false);
    setWizardMessage(null);
    setTagStatus("idle");
  }

  async function setOnboardingEntryFee() {
    if (!createdTag) return;
    const fee = parseFloat(entryFee);
    if (entryFee.trim() && (isNaN(fee) || fee < 0)) {
      setWizardMessage({
        text: t("groups.entryFeeNonNegative"),
        type: "error",
      });
      return;
    }
    setEntryFeeBusy(true);
    setWizardMessage(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(createdTag)}?${authQs().slice(1)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entry_fee: fee, join_policy: createPolicy }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setEntryFeeSet(true);
        setWizardMessage({
          text: t("groups.policySaved"),
          type: "success",
        });
      } else {
        setWizardMessage({
          text: data.error || t("groups.failedSave"),
          type: "error",
        });
      }
    } catch {
      setWizardMessage({ text: t("groups.networkErrorShort"), type: "error" });
    }
    setEntryFeeBusy(false);
  }

  async function createGroup() {
    if (!createTag.trim()) {
      setCreateMessage(t("groups.tagRequired"));
      setCreateMessageType("error");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(createTag.trim())) {
      setCreateMessage(t("groups.tagAlphanumeric"));
      setCreateMessageType("error");
      return;
    }
    if (!createName.trim()) {
      setCreateMessage(t("groups.nameRequired"));
      setCreateMessageType("error");
      return;
    }
    const balance = (user?.["sys.currency"] ?? 0) as number;
    if (balance < 50) {
      setCreateMessage(
        t("groups.insufficientCredits", {
          balance: balance.toLocaleString(),
        }),
      );
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
      params.set("public", String(createPublic));

      const res = await fetch(
        `${API_BASE_URL}/groups/create?${params.toString()}&${authQs().slice(1)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        setCreateMessage(t("groups.groupCreated"));
        setCreateMessageType("success");
        setCreatedTag(data.tag || createTag.trim());
        setCreatedName(data.name || createName.trim());
        setIconUrl(data.icon_url || "");
        setEntryFee(String(data.entry_fee || 0));
        setOnboardingStep(3);
        loadMyGroups();
        if (reloadUser) await reloadUser();
      } else {
        setCreateMessage(data.error || t("groups.createFailed"));
        setCreateMessageType("error");
      }
    } catch {
      setCreateMessage(t("groups.networkError"));
      setCreateMessageType("error");
    }
    setCreateBusy(false);
  }

  async function uploadOnboardingIcon(file: File) {
    if (!createdTag) return;
    if (file.size > 5 * 1024 * 1024) {
      setWizardMessage({ text: t("groups.imageTooLarge"), type: "error" });
      return;
    }
    setIconUploading(true);
    setWizardMessage(null);
    try {
      const fd = new FormData();
      fd.append("icon", file);
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(createdTag)}/icon?${authQs().slice(1)}`,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (res.ok) {
        setIconUploaded(true);
        setIconUrl(data.icon_url || iconUrl);
        setWizardMessage({ text: t("groups.iconUploaded"), type: "success" });
      } else {
        setWizardMessage({
          text: data.error || t("groups.iconUploadFailed"),
          type: "error",
        });
      }
    } catch {
      setWizardMessage({ text: t("groups.networkErrorShort"), type: "error" });
    }
    setIconUploading(false);
  }

  async function uploadOnboardingBanner(file: File) {
    if (!createdTag) return;
    if (file.size > 5 * 1024 * 1024) {
      setWizardMessage({ text: t("groups.imageTooLarge"), type: "error" });
      return;
    }
    setBannerSetting(true);
    setWizardMessage(null);
    try {
      const fd = new FormData();
      fd.append("banner", file);
      const res = await fetch(
        `${API_BASE_URL}/groups/${encodeURIComponent(createdTag)}/banner?${authQs().slice(1)}`,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (res.ok) {
        setBannerSet(true);
        setBannerUrl(data.banner_url || bannerUrl);
        setWizardMessage({ text: t("groups.bannerUploaded"), type: "success" });
        if (reloadUser) await reloadUser();
      } else {
        setWizardMessage({
          text: data.error || t("groups.bannerUploadFailed"),
          type: "error",
        });
      }
    } catch {
      setWizardMessage({ text: t("groups.networkErrorShort"), type: "error" });
    }
    setBannerSetting(false);
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
      <AuthRequired
        icon={<Users size={32} />}
        title={t("groups.signInToView")}
        text={t("groups.signInText")}
        href={`/auth?return_to=${encodeURIComponent(
          window.location.origin +
            window.location.pathname +
            window.location.search,
        )}`}
      />
    );
  }

  return (
    <AccountPage layoutClassName={s.wideLayout}>
      <AccountPageHeader
        title={t("groups.titleLabel")}
        subtitle={t("groups.titleSubLabel")}
        actions={
          user && (
            <div class={s.balance}>
              <Coins size={16} />
              <span>
                {(user["sys.currency"] ?? 0).toLocaleString()} {t("groups.balanceLabel")}
              </span>
            </div>
          )
        }
      />

      <AccountTabs
        tabs={HUB_TABS.map((tab) => ({ ...tab, label: t(tab.labelKey) }))}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel={t("groups.title")}
      />

      <AccountTabPanel>
        {activeTab === "my-groups" && (
          <AccountSection
            icon={<Users size={18} />}
            title={t("groups.myGroups")}
            subtitle={`${myGroups.length} ${plural(myGroups.length, t("groups.member"))}`}
          >
            {myGroupsLoading && (
              <div class={s.loading}>{t("groups.loading")}</div>
            )}
            {!myGroupsLoading && myGroups.length === 0 && (
              <EmptyState
                icon={<Users size={24} />}
                title={t("groups.noGroups")}
                text={t("groups.noGroupsText")}
              />
            )}
            <div class={s.groupGrid}>
              {myGroups.map((g) => (
                <GroupCard key={g.tag} group={g} isMember />
              ))}
            </div>
          </AccountSection>
        )}

        {activeTab === "browse" && (
          <AccountSection
            icon={<Search size={18} />}
            title={t("groups.browse")}
            subtitle={`${browseResults.length} ${plural(
              browseResults.length,
              t("groups.resultLabel"),
            )}`}
          >
            <form class={s.searchRow} onSubmit={onSearchSubmit}>
              <input
                type="text"
                class={s.searchInput}
                placeholder={t("groups.search")}
                aria-label={t("groups.search")}
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
                <Search size={14} /> {t("groups.search")}
              </button>
            </form>

            {browseLoading && <div class={s.loading}>{t("groups.loading")}</div>}
            {!browseLoading && browseError && (
              <EmptyState
                icon={<Search size={24} />}
                title={t("groups.couldNotLoad")}
                text={browseError}
              >
                <button class={s.btnSecondary} onClick={loadBrowse}>
                  {t("groups.retry")}
                </button>
              </EmptyState>
            )}
            {!browseLoading && !browseError && browseResults.length === 0 && (
              <EmptyState
                icon={<Search size={24} />}
                title={t("groups.noGroupsFound")}
                text={
                  searchQuery.trim()
                    ? t("groups.tryDifferentSearch")
                    : t("groups.noBrowseGroups")
                }
              />
            )}
            {!browseLoading &&
              !browseError &&
              browseResults.length > 0 &&
              filteredBrowse.length === 0 && (
                <EmptyState
                  icon={<Search size={24} />}
                  title={t("groups.noMatches")}
                  text={t("groups.noMatchesFilter")}
                />
              )}
            <div class={s.groupGrid}>
              {filteredBrowse.map((g) => (
                <GroupCard key={g.tag} group={g} />
              ))}
            </div>
          </AccountSection>
        )}

        {activeTab === "top" && (
          <AccountSection
            icon={<Trophy size={18} />}
            title={t("groups.top")}
            subtitle={`${topGroups.length} ${plural(
              topGroups.length,
              t("groups.member"),
            )} ${t("groups.rankedByMembers")}`}
          >
            {topLoading && <div class={s.loading}>{t("groups.loading")}</div>}
            {!topLoading && topGroups.length === 0 && (
              <EmptyState
                icon={<Trophy size={24} />}
                title={t("groups.noTopGroups")}
                text={t("groups.topGroupsDesc")}
              />
            )}
            <div class={s.groupGrid}>
              {topGroups.map((g, i) => (
                <a
                  class={s.groupCard}
                  href={`/groups/${encodeURIComponent(g.tag)}`}
                  key={g.tag}
                >
                  {i < 3 && (
                    <div class={s.rankBadge}>
                      <Sparkles size={10} /> #{i + 1}
                    </div>
                  )}
                  {g.banner_url ? (
                    <div
                      class={s.groupBanner}
                      style={{ backgroundImage: `url(${g.banner_url})` }}
                    />
                  ) : (
                    <div class={s.groupBannerPlaceholder}>
                      <Megaphone size={28} />
                    </div>
                  )}
                  <div class={s.groupCardBody}>
                    <div class={s.groupCardHeader}>
                      {g.icon_url ? (
                        <img
                          src={g.icon_url}
                          alt={g.name}
                          class={s.groupCardIcon}
                        />
                      ) : (
                        <div class={s.groupCardIconPlaceholder}>
                          <Users size={18} />
                        </div>
                      )}
                      <div class={s.groupCardTitles}>
                        <div class={s.groupCardName}>{g.name}</div>
                        <div class={s.groupCardTag}>@{g.tag}</div>
                      </div>
                    </div>
                    {g.description && (
                      <div class={s.groupCardDescription}>{g.description}</div>
                    )}
                    <div class={s.groupCardMeta}>
                      <span class={s.metaChip}>
                        <Users size={11} /> {g.member_count}
                      </span>
                      {g.public ? (
                        <span class={s.metaChip}>
                          <Globe size={11} /> {t("groups.publicLabel")}
                        </span>
                      ) : (
                        <span class={s.metaChip}>
                          <Lock size={11} /> {t("groups.privateLabel")}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </AccountSection>
        )}

        {activeTab === "create" && (
          <OnboardingWizard
            step={onboardingStep}
            setStep={setOnboardingStep}
            createdTag={createdTag}
            createdName={createdName}
            iconUrl={iconUrl}
            iconUploaded={iconUploaded}
            iconUploading={iconUploading}
            bannerSet={bannerSet}
            bannerSetting={bannerSetting}
            bannerUrl={bannerUrl}
            setBannerUrl={setBannerUrl}
            entryFee={entryFee}
            setEntryFee={setEntryFee}
            entryFeeBusy={entryFeeBusy}
            entryFeeSet={entryFeeSet}
            wizardMessage={wizardMessage}
            setWizardMessage={setWizardMessage}
            createTag={createTag}
            setCreateTag={setCreateTag}
            createName={createName}
            setCreateName={setCreateName}
            createDescription={createDescription}
            setCreateDescription={setCreateDescription}
            createPublic={createPublic}
            setCreatePublic={setCreatePublic}
            createPolicy={createPolicy}
            setCreatePolicy={setCreatePolicy}
            createMessage={createMessage}
            createMessageType={createMessageType}
            createBusy={createBusy}
            tagStatus={tagStatus}
            onCreate={createGroup}
            onUploadIcon={uploadOnboardingIcon}
            onUploadBanner={uploadOnboardingBanner}
            onSetEntryFee={setOnboardingEntryFee}
            onReset={resetOnboarding}
            balance={(user?.["sys.currency"] ?? 0) as number}
          />
        )}
      </AccountTabPanel>
    </AccountPage>
  );
}

const ONBOARDING_STEPS = [
  { id: 1, labelKey: "groups.basicsStepLabel" },
  { id: 2, labelKey: "groups.createStepLabel" },
  { id: 3, labelKey: "groups.brandingStepLabel" },
  { id: 4, labelKey: "groups.joiningStepLabel" },
  { id: 5, labelKey: "groups.doneStepLabel" },
] as const;

function OnboardingWizard({
  step,
  setStep,
  createdTag,
  createdName,
  iconUrl,
  iconUploaded,
  iconUploading,
  bannerSet,
  bannerSetting,
  bannerUrl,
  entryFee,
  setEntryFee,
  entryFeeBusy,
  entryFeeSet,
  wizardMessage,
  setWizardMessage,
  createTag,
  setCreateTag,
  createName,
  setCreateName,
  createDescription,
  setCreateDescription,
  createPublic,
  setCreatePublic,
  createPolicy,
  setCreatePolicy,
  createMessage,
  createMessageType,
  createBusy,
  tagStatus,
  onCreate,
  onUploadIcon,
  onUploadBanner,
  onSetEntryFee,
  onReset,
  balance,
}: {
  step: 1 | 2 | 3 | 4 | 5;
  setStep: (s: 1 | 2 | 3 | 4 | 5) => void;
  createdTag: string | null;
  createdName: string;
  iconUrl: string;
  iconUploaded: boolean;
  iconUploading: boolean;
  bannerSet: boolean;
  bannerSetting: boolean;
  bannerUrl: string;
  setBannerUrl: (v: string) => void;
  entryFee: string;
  setEntryFee: (v: string) => void;
  entryFeeBusy: boolean;
  entryFeeSet: boolean;
  wizardMessage: { text: string; type: "success" | "error" } | null;
  setWizardMessage: (
    m: { text: string; type: "success" | "error" } | null,
  ) => void;
  createTag: string;
  setCreateTag: (v: string) => void;
  createName: string;
  setCreateName: (v: string) => void;
  createDescription: string;
  setCreateDescription: (v: string) => void;
  createPublic: boolean;
  setCreatePublic: (v: boolean) => void;
  createPolicy: JoinPolicy;
  setCreatePolicy: (v: JoinPolicy) => void;
  createMessage: string;
  createMessageType: "success" | "error";
  createBusy: boolean;
  tagStatus: "idle" | "checking" | "available" | "taken" | "invalid";
  onCreate: () => void;
  onUploadIcon: (f: File) => void;
  onUploadBanner: (f: File) => void;
  onSetEntryFee: () => void;
  onReset: () => void;
  balance: number;
}) {
  const gt = useI18n().t;
  const totalSteps = ONBOARDING_STEPS.length;
  const currentStep = ONBOARDING_STEPS.find((st) => st.id === step)!;
  const currentStepLabel = gt(currentStep.labelKey);
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <AccountSection
      icon={<PlusCircle size={18} />}
      title={gt("groups.createGroupTitle")}
      subtitle={gt("groups.stepLabel", { step, total: totalSteps, label: currentStepLabel })}
    >
      <div class={s.stepper}>
        <div class={s.stepperProgress}>
          <div class={s.stepperProgressBar} style={{ width: `${progress}%` }} />
        </div>
        <div class={s.stepperDots}>
          {ONBOARDING_STEPS.map((st) => (
            <button
              key={st.id}
              type="button"
              class={`${s.stepDot} ${
                step >= st.id ? s.stepDotActive : ""
              } ${step === st.id ? s.stepDotCurrent : ""}`}
              onClick={() => {
                if (st.id < step) setStep(st.id as 1 | 2 | 3 | 4 | 5);
              }}
              disabled={st.id >= step}
            >
              <span class={s.stepDotNum}>
                {step > st.id ? <Check size={11} /> : st.id}
              </span>
              <span class={s.stepDotLabel}>{gt(st.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div class={s.wizardStep}>
          <div class={s.wizardHeader}>
            <h3 class={s.wizardTitle}>{gt("groups.tellAboutTitle")}</h3>
            <p class={s.wizardLead}>
              {gt("groups.tellAboutDesc")}
            </p>
          </div>

          <div class={s.wizardCard}>
            <div class={s.formGroup}>
              <label for="group-tag">{gt("groups.tagLabel")}</label>
              <div class={s.tagField}>
                <input
                  id="group-tag"
                  type="text"
                  class={`${s.formInput} ${s.tagInput} ${
                    tagStatus === "available"
                      ? s.tagInputOk
                      : tagStatus === "taken" || tagStatus === "invalid"
                        ? s.tagInputBad
                        : ""
                  }`}
                  placeholder={gt("groups.tagPlaceholder")}
                  maxlength={20}
                  value={createTag}
                  onInput={(e) =>
                    setCreateTag(
                      (e.target as HTMLInputElement).value.toLowerCase(),
                    )
                  }
                />
                {tagStatus === "checking" && (
                  <span class={s.tagStatus} title={gt("groups.tagChecking")}>
                    <span class={s.tagSpinner} />
                  </span>
                )}
                {tagStatus === "available" && (
                  <span
                    class={`${s.tagStatus} ${s.tagStatusOk}`}
                    title={gt("groups.tagAvailable")}
                  >
                    <Check size={13} />
                  </span>
                )}
                {(tagStatus === "taken" || tagStatus === "invalid") && (
                  <span
                    class={`${s.tagStatus} ${s.tagStatusBad}`}
                    title={
                      tagStatus === "taken"
                        ? gt("groups.tagInUse")
                        : gt("groups.tagInvalid")
                    }
                  >
                    <XCircle size={13} />
                  </span>
                )}
              </div>
              <small
                class={`${s.formHint} ${
                  tagStatus === "available"
                    ? s.formHintOk
                    : tagStatus === "taken" || tagStatus === "invalid"
                      ? s.formHintBad
                      : ""
                }`}
              >
                {tagStatus === "available" && gt("groups.tagAvailableHint")}
                {tagStatus === "taken" && gt("groups.tagTakenHint")}
                {tagStatus === "invalid" && gt("groups.tagInvalidHint")}
                {gt("groups.urlLabelPrefix")}{" "}
                <code>accounts.bilup.org/groups/{createTag || "tag"}</code>
              </small>
            </div>

            <div class={s.formGroup}>
              <label for="group-name">{gt("groups.displayNameLabel")}</label>
              <input
                id="group-name"
                type="text"
                class={s.formInput}
                placeholder={gt("groups.displayNamePlaceholder")}
                maxlength={50}
                value={createName}
                onInput={(e) =>
                  setCreateName((e.target as HTMLInputElement).value)
                }
              />
            </div>

            <div class={s.formGroup}>
              <label for="group-description">
                {gt("groups.descriptionOptionalLabel")}
              </label>
              <textarea
                id="group-description"
                class={s.formInput}
                placeholder={gt("groups.descriptionPlaceholder")}
                maxlength={500}
                rows={3}
                value={createDescription}
                onInput={(e) =>
                  setCreateDescription((e.target as HTMLTextAreaElement).value)
                }
              />
              <small class={s.formHint}>
                {gt("groups.charactersCount", {
                  count: createDescription.length,
                })}
              </small>
            </div>

            <div class={s.formGroup}>
              <div class={s.toggleRow}>
                <div>
                  <div class={s.toggleLabel}>{gt("groups.publicGroupLabel")}</div>
                  <div class={s.toggleDesc}>
                    {gt("groups.publicGroupDesc")}
                  </div>
                </div>
                <label class={s.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={createPublic}
                    onChange={(e) =>
                      setCreatePublic((e.target as HTMLInputElement).checked)
                    }
                  />
                  <span class={s.toggleTrack}>
                    <span class={s.toggleThumb} />
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div class={s.wizardFooter}>
            {wizardMessage && (
              <div
                class={wizardMessage.type === "success" ? s.success : s.error}
              >
                {wizardMessage.text}
              </div>
            )}
            <div class={s.wizardFooterActions}>
              <button
                class={s.btnPrimary}
                type="button"
                onClick={() => {
                  if (
                    !createTag.trim() ||
                    !/^[a-zA-Z0-9]+$/.test(createTag.trim())
                  ) {
                    setWizardMessage({
                      text: gt("groups.tagRequiredAlphanumeric"),
                      type: "error",
                    });
                    return;
                  }
                  if (tagStatus === "taken") {
                    setWizardMessage({
                      text: gt("groups.tagTakenError"),
                      type: "error",
                    });
                    return;
                  }
                  if (!createName.trim()) {
                    setWizardMessage({
                      text: gt("groups.nameRequired"),
                      type: "error",
                    });
                    return;
                  }
                  setWizardMessage(null);
                  setStep(2);
                }}
                disabled={tagStatus === "taken" || tagStatus === "checking"}
              >
                {gt("groups.continueBtn")} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div class={s.wizardStep}>
          <div class={s.wizardHeader}>
            <h3 class={s.wizardTitle}>{gt("groups.reviewCreateTitle")}</h3>
            <p class={s.wizardLead}>{gt("groups.reviewChargeLead")}</p>
          </div>

          <div class={s.reviewCard}>
            <div class={s.reviewHeader}>
              <div class={s.reviewAvatar}>
                <Users size={20} />
              </div>
              <div>
                <div class={s.reviewName}>{createName.trim()}</div>
                <div class={s.reviewTag}>@{createTag.trim()}</div>
              </div>
            </div>
            {createDescription.trim() && (
              <div class={s.reviewDescription}>{createDescription.trim()}</div>
            )}
            <div class={s.reviewMeta}>
              <span class={s.metaChip}>
                {createPublic ? <Globe size={11} /> : <Lock size={11} />}{" "}
                {createPublic
                  ? gt("groups.publicLabel")
                  : gt("groups.privateLabel")}
              </span>
            </div>
          </div>

          <div class={s.costBanner}>
            <Coins size={16} />
            <div>
              <div>{gt("groups.costBannerText")}</div>
              <small>
                {gt("groups.currentBalanceLabel", {
                  balance: balance.toLocaleString(),
                  after: (balance - 50).toLocaleString(),
                })}
              </small>
            </div>
          </div>

          <div class={s.wizardFooter}>
            {createMessage && (
              <div
                class={createMessageType === "success" ? s.success : s.error}
              >
                {createMessage}
              </div>
            )}
            <div class={s.wizardFooterActions}>
              <button
                class={s.btnSecondary}
                type="button"
                onClick={() => setStep(1)}
                disabled={createBusy}
              >
                <ArrowLeft size={14} /> {gt("groups.backBtn")}
              </button>
              <button
                class={s.btnPrimary}
                type="button"
                onClick={onCreate}
                disabled={createBusy || balance < 50}
              >
                <Coins size={14} />
                {createBusy ? gt("groups.creatingBtn") : gt("groups.createGroupBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && createdTag && (
        <div class={s.wizardStep}>
          <div class={s.wizardHeader}>
            <h3 class={s.wizardTitle}>{gt("groups.brandingTitle")}</h3>
            <p class={s.wizardLead}>{gt("groups.brandingLead")}</p>
          </div>

          <div class={s.brandingGrid}>
            <div class={s.brandCard}>
              <div class={s.brandCardHeader}>
                <div class={s.brandCardTitle}>
                  <ImagePlus size={15} /> {gt("groups.iconLabel")}
                </div>
                {iconUploaded && (
                  <span class={s.brandCardDone}>
                    <Check size={10} /> {gt("groups.doneBadge")}
                  </span>
                )}
              </div>
              <div class={s.brandCardBody}>
                <div class={s.iconPreview}>
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={createdName}
                      class={s.iconPreviewImg}
                    />
                  ) : (
                    <div class={s.iconPreviewPlaceholder}>
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <label class={s.fileDrop}>
                  <ImagePlus size={14} />
                  <span>
                    {iconUploading
                      ? gt("groups.uploadingBtn")
                      : iconUploaded
                        ? gt("groups.replaceBtn")
                        : gt("groups.uploadImageBtn")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={iconUploading}
                    onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) onUploadIcon(f);
                    }}
                  />
                </label>
                <small class={s.formHint}>{gt("groups.iconSizeHint")}</small>
              </div>
            </div>
            <div class={s.brandCard}>
              <div class={s.brandCardHeader}>
                <div class={s.brandCardTitle}>
                  <ImageIcon size={15} /> {gt("groups.bannerLabel")}
                </div>
                {bannerSet && (
                  <span class={s.brandCardDone}>
                    <Check size={10} /> {gt("groups.doneBadge")}
                  </span>
                )}
              </div>
              <div class={s.brandCardBody}>
                <div class={s.bannerPreview}>
                  {bannerSet ? (
                    <div
                      class={s.bannerPreviewImg}
                      style={{
                        backgroundImage: `url(${bannerUrl})`,
                      }}
                    />
                  ) : (
                    <div class={s.bannerPreviewPlaceholder}>
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>
                <label class={s.fileDrop}>
                  <ImagePlus size={14} />
                  <span>
                    {bannerSetting
                      ? gt("groups.uploadingBtn")
                      : bannerSet
                        ? gt("groups.replaceBannerBtn")
                        : gt("groups.uploadBannerBtn")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={bannerSetting}
                    onChange={(e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) onUploadBanner(f);
                    }}
                  />
                </label>
                <small class={s.formHint}>{gt("groups.bannerSizeHint")}</small>
                </small>
              </div>
            </div>
          </div>

          {wizardMessage && (
            <div class={wizardMessage.type === "success" ? s.success : s.error}>
              {wizardMessage.text}
            </div>
          )}

          <div class={s.wizardFooter}>
            <div class={s.wizardFooterActions}>
              <button
                class={s.btnSecondary}
                type="button"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={14} /> {gt("groups.backBtn")}
              </button>
              <button
                class={s.btnPrimary}
                type="button"
                onClick={() => setStep(4)}
              >
                {gt("groups.continueBtn")} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && createdTag && (
        <div class={s.wizardStep}>
          <div class={s.wizardHeader}>
            <h3 class={s.wizardTitle}>{gt("groups.howJoinTitle")}</h3>
            <p class={s.wizardLead}>{gt("groups.howJoinDesc")}</p>
          </div>

          <div class={s.wizardCard}>
            <div class={s.formGroup}>
              <label>{gt("groups.joinPolicyLabel")}</label>
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
                    <div class={s.policyCardName}>{gt(opt.labelKey)}</div>
                    <div class={s.policyCardDesc}>{gt(opt.descKey)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div class={s.formGroup}>
              <label for="group-onboard-fee">{gt("groups.entryFeeLabel")}</label>
              <input
                id="group-onboard-fee"
                type="number"
                class={s.formInput}
                placeholder={gt("groups.entryFeePlaceholder")}
                min={0}
                step="0.01"
                value={entryFee}
                onInput={(e) =>
                  setEntryFee((e.target as HTMLInputElement).value)
                }
              />
              <small class={s.formHint}>{gt("groups.entryFeeHint")}</small>
            </div>

            {wizardMessage && (
              <div
                class={wizardMessage.type === "success" ? s.success : s.error}
              >
                {wizardMessage.text}
              </div>
            )}
          </div>

          <div class={s.wizardFooter}>
            <div class={s.wizardFooterActions}>
              <button
                class={s.btnSecondary}
                type="button"
                onClick={() => setStep(3)}
              >
                <ArrowLeft size={14} /> {gt("groups.backBtn")}
              </button>
              <button
                class={s.btnSecondary}
                type="button"
                onClick={onSetEntryFee}
                disabled={entryFeeBusy}
              >
                <Save size={14} />
                {entryFeeBusy ? gt("groups.savingBtn") : gt("groups.saveBtn")}
              </button>
              <button
                class={s.btnPrimary}
                type="button"
                onClick={() => setStep(5)}
              >
                {gt("groups.finishBtn")} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && createdTag && (
        <div class={s.wizardStep}>
          <div class={s.donePanel}>
            <div class={s.doneIcon}>
              <PartyPopper size={36} />
            </div>
            <h3 class={s.doneTitle}>{gt("groups.doneTitle", { tag: createdTag })}</h3>
            <p class={s.doneText}>{gt("groups.doneDesc")}</p>
            <div class={s.doneSummary}>
              {iconUploaded && (
                <span class={s.metaChip}>
                  <Check size={10} /> {gt("groups.iconLabel")}
                </span>
              )}
              {bannerSet && (
                <span class={s.metaChip}>
                  <Check size={10} /> {gt("groups.bannerLabel")}
                </span>
              )}
              {entryFeeSet && parseFloat(entryFee) > 0 && (
                <span class={s.metaChip}>
                  <Coins size={10} />{" "}
                  {gt("groups.feeChip", { fee: entryFee })}
                </span>
              )}
              {createPolicy && (
                <span class={s.metaChip}>
                  <Check size={10} /> {createPolicy}
                </span>
              )}
            </div>
            <div class={s.wizardFooterActions}>
              <a
                class={s.btnPrimary}
                href={`/groups/${encodeURIComponent(createdTag)}`}
              >
                {gt("groups.openYourGroup")} <ArrowRight size={14} />
              </a>
              <button class={s.btnSecondary} type="button" onClick={onReset}>
                {gt("groups.createAnotherBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountSection>
  );
}

function GroupCard({
  group,
  isMember,
}: {
  group: GroupNet | GroupPublic;
  isMember?: boolean;
}) {
  const { t } = useI18n();
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
            <div class={s.groupCardName}>{group.name}</div>
            <div class={s.groupCardTag}>@{group.tag}</div>
          </div>
        </div>
        {group.description && (
          <div class={s.groupCardDescription}>{group.description}</div>
        )}
        <div class={s.groupCardMeta}>
          <span class={s.metaChip}>
            <Users size={11} /> {group.member_count}
          </span>
          <span class={s.metaChip}>
            {group.public ? <Globe size={11} /> : <Lock size={11} />}{" "}
            {group.public ? t("groups.publicLabel") : t("groups.privateLabel")}
          </span>
          <span class={s.metaChip}>
            <Crown size={11} /> {group.owner_user_id}
          </span>
          <span class={s.metaChip}>
            <Calendar size={11} /> {formatDate(group.created_at)}
          </span>
        </div>
        {isMember && (
          <div class={s.memberBadge}>
            <Eye size={11} /> {t("groups.view")}
          </div>
        )}
      </div>
    </a>
  );
}
