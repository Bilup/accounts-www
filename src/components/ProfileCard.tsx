import { useState, useRef, useEffect } from "preact/hooks";
import {
  Camera,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
  Monitor,
  UserPlus,
  UserCheck,
  Calendar,
  Coins,
  Users,
  UserMinus,
  Send,
  StickyNote,
  Trash2,
  ExternalLink,
  Ban,
  ShieldOff,
  type LucideIcon,
} from "lucide-preact";
import s from "./ProfileCard.module.css";
import { bannerUrl as buildBannerUrl } from "../lib/avatar";
import { plural } from "../lib/format";
import { clickable } from "../lib/clickable";
import { useI18n } from "../i18n/i18n";
import {
  type AuthUser,
  type PublicProfile,
  type Benefits,
  getToken,
} from "../lib/auth";
import { UserAvatar } from "./UserAvatar";
import { ImageCropper, type CropperKind } from "./ImageCropper";

const API = "https://api.accounts.bilup.org";

type FriendState = "self" | "friend" | "pending" | "blocked" | "none";

interface ProfileCardProps {
  user: AuthUser | PublicProfile;
  editable?: boolean;
  showActions?: boolean;
  isSelf?: boolean;
  isFollowing?: boolean;
  isBlocked?: boolean;
  friendState?: FriendState;
  followerCount?: number;
  followingCount?: number;
  viewerBalance?: number | null;
  benefits?: Benefits | null;
  viewerNotes?: Record<string, string>;
  actionError?: string | null;
  onFollowToggle?: () => void;
  onFriendAction?: (action: "add" | "remove" | "accept" | "reject") => void;
  onBlockToggle?: () => void;
  onTransferComplete?: (debited: number) => void;
  onNoteUpdate?: (username: string, note: string) => void;
  onEdit?: (changes: Record<string, unknown>) => Promise<void> | void;
}

function formatJoinDate(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

function isPublicProfile(u: AuthUser | PublicProfile): u is PublicProfile {
  return (u as PublicProfile).index !== undefined;
}

export function ProfileCard({
  user,
  editable = false,
  showActions = true,
  isSelf = false,
  isFollowing = false,
  isBlocked = false,
  friendState = "none",
  followerCount,
  followingCount,
  viewerBalance = null,
  benefits = null,
  viewerNotes,
  actionError = null,
  onFollowToggle,
  onFriendAction,
  onBlockToggle,
  onTransferComplete,
  onNoteUpdate,
  onEdit,
}: ProfileCardProps) {
  const { t } = useI18n();
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(user.bio || "");
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioSaving, setBioSaving] = useState(false);
  const [editingPronouns, setEditingPronouns] = useState(false);
  const [pronounsDraft, setPronounsDraft] = useState(user.pronouns || "");
  const [pronounsError, setPronounsError] = useState<string | null>(null);
  const [pronounsSaving, setPronounsSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    kind: CropperKind;
    file: File;
  } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendSending, setSendSending] = useState(false);
  const [sendConfirming, setSendConfirming] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const sendAmountRef = useRef<HTMLInputElement>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pronounsInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingBio) {
      setBioDraft(user.bio || "");
      setBioError(null);
    }
  }, [user.bio, editingBio]);

  useEffect(() => {
    if (!editingPronouns) {
      setPronounsDraft(user.pronouns || "");
      setPronounsError(null);
    } else {
      pronounsInputRef.current?.focus();
      pronounsInputRef.current?.select();
    }
  }, [user.pronouns, editingPronouns]);

  useEffect(() => {
    if (!editingUsername) {
      setUsernameDraft(user.username || "");
      setUsernameError(null);
    } else {
      usernameInputRef.current?.focus();
      usernameInputRef.current?.select();
    }
  }, [user.username, editingUsername]);

  const handleFileChosen = (event: Event, kind: CropperKind) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    setMediaError(null);
    if (!file) return;
    // Picking a non-image used to fail silently — say so.
    if (!file.type.startsWith("image/")) {
      setMediaError("That file isn't an image. Pick a PNG, JPG, GIF or WebP.");
      input.value = "";
      return;
    }
    const isAnimated =
      file.type === "image/gif" ||
      file.type === "image/webp" ||
      file.type === "image/apng";
    if (isAnimated && kind === "pfp" && !benefits?.animated_pfp) {
      setMediaError(
        "Animated profile pictures require a subscription — upgrade at ko-fi.com/mistium.",
      );
      input.value = "";
      return;
    }
    if (isAnimated && kind === "banner" && !benefits?.animated_banner) {
      setMediaError(
        "Animated banners require a subscription — upgrade at ko-fi.com/mistium.",
      );
      input.value = "";
      return;
    }
    setPendingFile({ kind, file });
    input.value = "";
  };

  // Throws on failure so the cropper can surface the reason (e.g. not enough
  // credits for a paid banner) instead of silently pretending it saved.
  const uploadImage = async (key: "pfp" | "banner", dataUrl: string) => {
    const token = getToken();
    if (!token) throw new Error("You must be signed in");
    const res = await fetch(`${API}/me/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, value: dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    if (onEdit) await onEdit({ [key]: dataUrl });
  };

  const saveBio = async () => {
    const val = bioDraft.trim();
    if (val === (user.bio || "").trim()) {
      setEditingBio(false);
      return;
    }
    setBioSaving(true);
    setBioError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("not authenticated");
      const res = await fetch(`${API}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "bio", value: val, auth: token }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (onEdit) await onEdit({ bio: val });
      setEditingBio(false);
    } catch (e) {
      setBioError((e as Error).message || "Failed to save");
    } finally {
      setBioSaving(false);
    }
  };

  const savePronouns = async () => {
    const val = pronounsDraft.trim();
    if (val === (user.pronouns || "").trim()) {
      setEditingPronouns(false);
      return;
    }
    if (val.length > 50) {
      setPronounsError("Pronouns must be 50 characters or fewer");
      return;
    }
    setPronounsSaving(true);
    setPronounsError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("not authenticated");
      const res = await fetch(`${API}/me/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: "pronouns", value: val }),
      });
      const result = await res.json();
      if (result?.error) throw new Error(result.error);
      if (onEdit) await onEdit({ pronouns: val });
      setEditingPronouns(false);
    } catch (e) {
      setPronounsError((e as Error).message || "Failed to save");
    } finally {
      setPronounsSaving(false);
    }
  };

  const saveUsername = async () => {
    const val = usernameDraft.trim();
    if (!val || val === user.username) {
      setEditingUsername(false);
      setUsernameError(null);
      return;
    }
    setUsernameSaving(true);
    setUsernameError(null);
    try {
      const token = getToken();
      if (!token) throw new Error("not authenticated");
      const res = await fetch(`${API}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "username", value: val, auth: token }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (onEdit) await onEdit({ username: val });
      setEditingUsername(false);
    } catch (e) {
      setUsernameError((e as Error).message || "Failed to save");
    } finally {
      setUsernameSaving(false);
    }
  };

  const publicProfile = isPublicProfile(user) ? user : null;

  const openSend = () => {
    setSendOpen(true);
    setSendError(null);
    setSendSuccess(null);
    setSendAmount("");
    setSendNote("");
    setCurrentBalance(viewerBalance);
    requestAnimationFrame(() => sendAmountRef.current?.focus());
  };

  const cancelSend = () => {
    setSendOpen(false);
    setSendError(null);
    setSendSuccess(null);
    setSendAmount("");
    setSendNote("");
    setSendSending(false);
    setSendConfirming(false);
  };

  const submitSend = async () => {
    setSendError(null);
    setSendSuccess(null);
    const trimmed = sendAmount.trim();
    if (!trimmed) {
      setSendError("Enter an amount");
      return;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0.01) {
      setSendError("Minimum amount is 0.01");
      return;
    }
    if (viewerBalance !== null && num > viewerBalance) {
      setSendError("You don't have enough credits");
      return;
    }
    if (sendNote.length > 200) {
      setSendError("Note must be 200 characters or fewer");
      return;
    }
    const token = getToken();
    if (!token) {
      setSendError("You must be signed in to send credits");
      return;
    }
    // Transfers are irreversible — make the user confirm the amount once it's valid.
    if (!sendConfirming) {
      setSendConfirming(true);
      return;
    }
    setSendSending(true);
    try {
      const res = await fetch(`${API}/me/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: user.username,
          amount: trimmed,
          note: sendNote.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data?.error || "Transfer failed");
        return;
      }
      const debited = Number(data?.debited ?? num);
      setCurrentBalance((b) => (b === null ? b : Math.max(0, b - debited)));
      setSendSuccess(
        `Sent ${debited.toLocaleString()} ${plural(debited, "credit")} to @${user.username}`,
      );
      setSendAmount("");
      setSendNote("");
      onTransferComplete?.(debited);
    } catch {
      setSendError("Network error");
    } finally {
      setSendSending(false);
      // Consume the confirmation: every send attempt must be confirmed afresh.
      setSendConfirming(false);
    }
  };

  const displayName = publicProfile
    ? publicProfile.username
    : (user as AuthUser).display_name || (user as AuthUser).username;
  const hasNickname = publicProfile
    ? false
    : (user as AuthUser).display_name !== (user as AuthUser).username &&
      !!(user as AuthUser).display_name;
  const index = publicProfile?.index;
  const joined = formatJoinDate(user.created);
  const credits = publicProfile
    ? publicProfile.currency
    : ((user as AuthUser)["sys.currency"] ?? 0);
  const finalFollowerCount = followerCount ?? publicProfile?.followers ?? 0;
  const finalFollowingCount = followingCount ?? publicProfile?.following ?? 0;
  const pronouns = user.pronouns;
  // What the meta row shows, so separators only appear between real items.
  const showHandle = editingUsername || editable || hasNickname;
  const showPronouns = editingPronouns || editable || !!pronouns;

  return (
    <div class={s.card}>
      <div class={s.banner}>
        {user.banner ? (
          <img src={user.banner} alt="" class={s.bannerImg} />
        ) : (
          <img
            src={buildBannerUrl(user.username)}
            alt=""
            class={s.bannerImg}
            onError={(e: any) => {
              e.target.style.display = "none";
            }}
          />
        )}
        {editable && (
          <>
            <div
              class={s.bannerEditOverlay}
              {...clickable(
                () => bannerInputRef.current?.click(),
                "Change banner",
              )}
            >
              <ImageIcon size={28} />
              {!benefits?.free_banner_uploads && (
                <span class={s.bannerEditCost}>
                  <Coins size={12} /> Cost: 10 credits
                </span>
              )}
              {benefits?.free_banner_uploads && (
                <span class={s.bannerEditCost}>
                  <Check size={12} /> Free with your plan
                </span>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept={
                benefits?.animated_banner
                  ? "image/*"
                  : "image/png,image/jpeg,image/webp"
              }
              class={s.hiddenFile}
              onChange={(e) => handleFileChosen(e, "banner")}
            />
          </>
        )}
      </div>

      <div class={s.avatarRow}>
        <div class={s.avatarWrap}>
          <UserAvatar
            username={user.username}
            pfp={user.pfp}
            className={s.avatar}
            alt={user.username}
          />
          {editable && (
            <>
              <div
                class={s.avatarEditOverlay}
                {...clickable(
                  () => avatarInputRef.current?.click(),
                  "Change profile picture",
                )}
              >
                <Camera size={22} />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept={
                  benefits?.animated_pfp
                    ? "image/*"
                    : "image/png,image/jpeg,image/webp"
                }
                class={s.hiddenFile}
                onChange={(e) => handleFileChosen(e, "pfp")}
              />
            </>
          )}
        </div>
      </div>

      <div class={s.body}>
        {mediaError && (
          <div class={s.sendError} role="alert">
            {mediaError}
          </div>
        )}
        <div class={s.nameRow}>
          <div class={s.displayName}>
            {displayName}
            {index !== undefined && index !== null && (
              <span class={s.index}>#{index}</span>
            )}
          </div>
          {user.system && (
            <span class={s.systemPill} title={user.system}>
              <Monitor size={11} />
              <span>{user.system}</span>
            </span>
          )}
        </div>

        <div class={s.metaRow}>
          {/* Handle — editable inline for self, plain @username otherwise */}
          {editingUsername ? (
            <span class={s.pronounsEditWrap}>
              <span class={s.usernameAt}>@</span>
              <input
                ref={usernameInputRef}
                class={s.pronounsInput}
                value={usernameDraft}
                onInput={(e: any) => setUsernameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveUsername();
                  else if (e.key === "Escape") {
                    setEditingUsername(false);
                    setUsernameDraft(user.username || "");
                    setUsernameError(null);
                  }
                }}
                placeholder="username"
                maxLength={20}
                disabled={usernameSaving}
              />
              <button
                class={`${s.pronounsIconBtn} ${s.pronounsIconBtnConfirm}`}
                onClick={saveUsername}
                disabled={usernameSaving}
                aria-label="Save username"
                title="Save"
              >
                <Check size={12} />
              </button>
              <button
                class={s.pronounsIconBtn}
                onClick={() => {
                  setEditingUsername(false);
                  setUsernameDraft(user.username || "");
                  setUsernameError(null);
                }}
                disabled={usernameSaving}
                aria-label="Cancel"
                title="Cancel"
              >
                <X size={12} />
              </button>
            </span>
          ) : (
            (editable || hasNickname) && (
              <span class={s.editableField}>
                <span class={s.username}>@{user.username}</span>
                {editable && (
                  <button
                    class={s.fieldEditBtn}
                    onClick={() => setEditingUsername(true)}
                    aria-label="Change username"
                    title="Change username"
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </span>
            )
          )}

          {showHandle && showPronouns && (
            <span class={s.separator}>•</span>
          )}

          {/* Pronouns */}
          {editingPronouns ? (
            <span class={s.pronounsEditWrap}>
              <input
                ref={pronounsInputRef}
                class={s.pronounsInput}
                value={pronounsDraft}
                onInput={(e: any) => setPronounsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") savePronouns();
                  else if (e.key === "Escape") {
                    setEditingPronouns(false);
                    setPronounsDraft(user.pronouns || "");
                    setPronounsError(null);
                  }
                }}
                placeholder="e.g. they/them"
                maxLength={50}
                disabled={pronounsSaving}
              />
              <button
                class={`${s.pronounsIconBtn} ${s.pronounsIconBtnConfirm}`}
                onClick={savePronouns}
                disabled={pronounsSaving}
                aria-label="Save pronouns"
                title="Save"
              >
                <Check size={12} />
              </button>
              <button
                class={s.pronounsIconBtn}
                onClick={() => {
                  setEditingPronouns(false);
                  setPronounsDraft(user.pronouns || "");
                  setPronounsError(null);
                }}
                disabled={pronounsSaving}
                aria-label="Cancel"
                title="Cancel"
              >
                <X size={12} />
              </button>
            </span>
          ) : pronouns ? (
            <span class={s.editableField}>
              <span class={s.pronouns}>{pronouns}</span>
              {editable && (
                <button
                  class={s.fieldEditBtn}
                  onClick={() => setEditingPronouns(true)}
                  aria-label="Edit pronouns"
                  title="Edit pronouns"
                >
                  <Pencil size={11} />
                </button>
              )}
            </span>
          ) : (
            editable && (
              <button
                class={s.addFieldBtn}
                onClick={() => setEditingPronouns(true)}
              >
                <Pencil size={11} /> Add pronouns
              </button>
            )
          )}

          {joined && (
            <>
              {(showHandle || showPronouns) && (
                <span class={s.separator}>•</span>
              )}
              <span class={s.metaItem}>
                <Calendar size={12} /> Joined {joined}
              </span>
            </>
          )}
        </div>
        {pronounsError && editingPronouns && (
          <div class={s.pronounsError}>{pronounsError}</div>
        )}
        {usernameError && editingUsername && (
          <div class={s.pronounsError}>{usernameError}</div>
        )}

        {editingBio ? (
          <div class={s.bioEditWrap}>
            <textarea
              class={s.bioTextarea}
              autoFocus
              aria-label="Bio"
              value={bioDraft}
              onInput={(e: any) => setBioDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingBio(false);
              }}
              placeholder="Tell people about yourself..."
              maxLength={1000}
            />
            {bioError && <div class={s.bioError}>{bioError}</div>}
            <div class={s.bioActions}>
              <button
                class={`${s.actionBtn} ${s.actionBtnPrimary}`}
                onClick={saveBio}
                disabled={bioSaving}
              >
                <Check size={14} /> {bioSaving ? "Saving..." : "Save"}
              </button>
              <button
                class={s.actionBtn}
                onClick={() => {
                  setEditingBio(false);
                  setBioDraft(user.bio || "");
                }}
                disabled={bioSaving}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : editable && !user.bio ? (
          <button class={s.addBioBtn} onClick={() => setEditingBio(true)}>
            <Pencil size={13} /> Add a bio
          </button>
        ) : (
          <div class={s.bioRow}>
            <div class={s.bioText}>
              {user.bio ? (
                user.bio
              ) : (
                <span class={s.bioPlaceholder}>No bio yet.</span>
              )}
            </div>
            {editable && (
              <button
                class={s.bioEditBtn}
                onClick={() => setEditingBio(true)}
                aria-label="Edit bio"
                title="Edit bio"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}

        {showActions && !isSelf && (
          <div class={s.actionBar}>
            <div class={s.actionBarRow}>
              {friendState === "friend" ? (
                <button
                  class={`${s.actionBtn} ${s.actionBtnDanger}`}
                  onClick={() => onFriendAction?.("remove")}
                  title="Remove friend"
                >
                  <UserMinus size={14} /> Friend
                </button>
              ) : friendState === "pending" ? (
                <>
                  <button
                    class={`${s.actionBtn} ${s.actionBtnSuccess}`}
                    onClick={() => onFriendAction?.("accept")}
                  >
                    <UserCheck size={14} /> Accept
                  </button>
                  <button
                    class={`${s.actionBtn} ${s.actionBtnDanger}`}
                    onClick={() => onFriendAction?.("reject")}
                  >
                    <X size={14} /> Reject
                  </button>
                </>
              ) : friendState !== "blocked" ? (
                <button
                  class={s.actionBtn}
                  onClick={() => onFriendAction?.("add")}
                >
                  <UserPlus size={14} /> Add friend
                </button>
              ) : null}
              <button
                class={`${s.actionBtn} ${isFollowing ? s.actionBtnSuccess : s.actionBtnPrimary}`}
                onClick={onFollowToggle}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={14} /> Following
                  </>
                ) : (
                  <>
                    <UserPlus size={14} /> Follow
                  </>
                )}
              </button>
              <button
                class={`${s.actionBtn} ${s.actionBtnAccent}`}
                onClick={sendOpen ? cancelSend : openSend}
                aria-expanded={sendOpen}
                aria-controls="send-credits-panel"
                title="Send credits"
              >
                <Coins size={14} /> Send credits
              </button>
              {onBlockToggle && (
                <button
                  class={`${s.actionBtn} ${isBlocked ? s.actionBtnSuccess : s.actionBtnDanger}`}
                  onClick={onBlockToggle}
                  title={isBlocked ? "Unblock this user" : "Block this user"}
                >
                  {isBlocked ? (
                    <>
                      <ShieldOff size={14} /> Unblock
                    </>
                  ) : (
                    <>
                      <Ban size={14} /> Block
                    </>
                  )}
                </button>
              )}
            </div>

            {actionError && (
              <div class={s.sendError} role="alert">
                {actionError}
              </div>
            )}

            {sendOpen && (
              <div class={s.sendPanel} id="send-credits-panel">
                <div class={s.sendHeader}>
                  <span class={s.sendTitle}>
                    Send credits to @{user.username}
                  </span>
                  {currentBalance !== null && (
                    <span class={s.sendBalance}>
                      <Coins size={12} /> Balance:{" "}
                      {currentBalance.toLocaleString()}
                    </span>
                  )}
                </div>
                <div class={s.sendField}>
                  <label class={s.sendLabel} for="send-amount">
                    Amount
                  </label>
                  <input
                    id="send-amount"
                    ref={sendAmountRef}
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    max={currentBalance ?? undefined}
                    class={s.sendInput}
                    placeholder="0.00"
                    value={sendAmount}
                    disabled={sendSending}
                    onInput={(e: any) => {
                      setSendAmount(e.target.value);
                      setSendSuccess(null);
                      setSendConfirming(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSend();
                      else if (e.key === "Escape") cancelSend();
                    }}
                  />
                </div>
                <div class={s.sendField}>
                  <label class={s.sendLabel} for="send-note">
                    Note (optional)
                  </label>
                  <input
                    id="send-note"
                    type="text"
                    maxLength={200}
                    class={s.sendInput}
                    placeholder="Say something nice…"
                    value={sendNote}
                    disabled={sendSending}
                    onInput={(e: any) => {
                      setSendNote(e.target.value);
                      setSendSuccess(null);
                      setSendConfirming(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSend();
                      else if (e.key === "Escape") cancelSend();
                    }}
                  />
                </div>
                {sendError && <div class={s.sendError}>{sendError}</div>}
                {sendSuccess && <div class={s.sendSuccess}>{sendSuccess}</div>}
                {sendConfirming && !sendSending && (
                  <div class={s.sendConfirm}>
                    Send <strong>{Number(sendAmount).toLocaleString()}</strong>{" "}
                    credits to <strong>@{user.username}</strong>? This can't be
                    undone.
                  </div>
                )}
                <div class={s.sendActions}>
                  <button
                    class={`${s.actionBtn} ${s.actionBtnPrimary}`}
                    onClick={submitSend}
                    disabled={sendSending}
                  >
                    <Send size={14} />{" "}
                    {sendSending
                      ? "Sending…"
                      : sendConfirming
                        ? "Confirm send"
                        : "Send"}
                  </button>
                  <button
                    class={s.actionBtn}
                    onClick={cancelSend}
                    disabled={sendSending}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showActions && !isSelf && benefits?.profile_notes && (
          <div class={s.noteSection}>
            <div class={s.noteHeader}>
              <StickyNote size={14} />
              <span class={s.noteTitle}>Profile Note</span>
              <span class={s.notePrivate}>Only visible to you</span>
            </div>
            {editingNote ? (
              <div class={s.noteEditWrap}>
                <textarea
                  class={s.noteTextarea}
                  autoFocus
                  value={noteDraft}
                  onInput={(e: any) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingNote(false);
                  }}
                  placeholder={`Add a note about @${user.username}...`}
                  maxLength={300}
                  disabled={noteSaving}
                />
                <div class={s.noteActions}>
                  <button
                    class={`${s.actionBtn} ${s.actionBtnPrimary}`}
                    onClick={async () => {
                      if (noteSaving) return;
                      setNoteSaving(true);
                      try {
                        await onNoteUpdate?.(user.username, noteDraft.trim());
                        setEditingNote(false);
                      } finally {
                        setNoteSaving(false);
                      }
                    }}
                    disabled={noteSaving}
                  >
                    <Check size={14} /> {noteSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    class={s.actionBtn}
                    onClick={() => setEditingNote(false)}
                    disabled={noteSaving}
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div class={s.noteDisplay}>
                {viewerNotes?.[user.username] ? (
                  <div class={s.noteText}>{viewerNotes[user.username]}</div>
                ) : (
                  <div class={s.notePlaceholder}>No note set</div>
                )}
                <button
                  class={s.noteEditBtn}
                  onClick={() => {
                    setNoteDraft(viewerNotes?.[user.username] || "");
                    setEditingNote(true);
                  }}
                  aria-label={
                    viewerNotes?.[user.username] ? "Edit note" : "Add note"
                  }
                  title={
                    viewerNotes?.[user.username] ? "Edit note" : "Add note"
                  }
                >
                  <Pencil size={12} />
                </button>
                {viewerNotes?.[user.username] && (
                  <button
                    class={s.noteDeleteBtn}
                    onClick={async () => {
                      if (noteSaving) return;
                      setNoteSaving(true);
                      try {
                        const token = getToken();
                        if (token) {
                          await fetch(
                            `${API}/me/note/${encodeURIComponent(user.username)}?auth=${encodeURIComponent(token)}`,
                            { method: "DELETE" },
                          );
                        }
                        onNoteUpdate?.(user.username, "");
                      } finally {
                        setNoteSaving(false);
                      }
                    }}
                    disabled={noteSaving}
                    aria-label="Delete note"
                    title="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {showActions && !isSelf && !benefits?.profile_notes && (
          <div class={s.noteUpsell}>
            <StickyNote size={14} />
            <span class={s.noteUpsellText}>
              Profile Notes let you privately remember things about other users.
            </span>
            <a
              href="https://ko-fi.com/mistium"
              target="_blank"
              rel="noopener noreferrer"
              class={s.noteUpsellLink}
            >
              Upgrade <ExternalLink size={12} />
            </a>
          </div>
        )}

        <div class={s.statsRow}>
          <Stat icon={Coins} value={credits.toLocaleString()} label="Credits" />
          <Stat
            icon={Users}
            value={finalFollowerCount.toLocaleString()}
            label="Followers"
          />
          <Stat
            icon={UserPlus}
            value={finalFollowingCount.toLocaleString()}
            label="Following"
          />
        </div>
      </div>

      {pendingFile && (
        <ImageCropper
          kind={pendingFile.kind}
          file={pendingFile.file}
          freeBannerUploads={!!benefits?.free_banner_uploads}
          onCancel={() => setPendingFile(null)}
          onSave={async (dataUrl) => {
            await uploadImage(pendingFile.kind, dataUrl);
            setPendingFile(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div class={s.stat}>
      <Icon size={16} />
      <div class={s.statValue}>{value}</div>
      <div class={s.statLabel}>{label}</div>
    </div>
  );
}
