import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import s from "./Auth.module.css";
import { AuthTosLinks } from "./Shell";
import { plural } from "../../lib/format";
import {
  describePerm,
  permIcon,
  FORBIDDEN_PERMISSIONS,
  type BtnState,
  type PermissionSchema,
  type SubToken,
} from "./lib";

interface Props {
  requestor: string;
  username: string;
  requiresFull: boolean;
  defaultAll: boolean;
  requiredPerms: string[];
  permSchema: PermissionSchema | null;
  siteTokens: SubToken[];
  scopeBtn: BtnState;
  scopeError: string;
  deletingTokenId: string | null;
  onUseSubToken: (t: SubToken) => void;
  onDeleteToken: (t: SubToken) => void;
  onCreateToken: (perms: string[]) => void;
  onUseMainToken: () => void;
  onSwitchAccount: () => void;
  onCancel: () => void;
}

export function PermissionsView({
  requestor,
  username,
  requiresFull,
  defaultAll,
  requiredPerms,
  permSchema,
  siteTokens,
  scopeBtn,
  scopeError,
  deletingTokenId,
  onUseSubToken,
  onDeleteToken,
  onCreateToken,
  onUseMainToken,
  onSwitchAccount,
  onCancel,
}: Props) {
  const requiredSet = useMemo(() => new Set(requiredPerms), [requiredPerms]);
  const hasRequiredPerms = requiredPerms.length > 0;
  const allowFullAccess = !hasRequiredPerms || requiresFull;

  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(() =>
    defaultAll ? new Set() : new Set(requiredPerms),
  );
  const [useFullAccess, setUseFullAccess] = useState(requiresFull);
  const [showAllPerms, setShowAllPerms] = useState(false);
  const [showMissingWarn, setShowMissingWarn] = useState(false);
  const [createNewToken, setCreateNewToken] = useState(false);

  const defaultedAll = useRef(false);
  useEffect(() => {
    if (!defaultAll || !permSchema || defaultedAll.current) return;
    defaultedAll.current = true;
    const all = new Set<string>();
    for (const p of permSchema.permissions) {
      if (!FORBIDDEN_PERMISSIONS.has(p)) all.add(p);
    }
    setSelectedPerms(all);
  }, [defaultAll, permSchema]);

  const togglePerm = (p: string) => {
    if (FORBIDDEN_PERMISSIONS.has(p)) return;
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const groupedVisible = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const p of permSchema?.permissions || []) {
      const cat = p.split(":")[0];
      (groups[cat] ||= []).push(p);
    }
    return groups;
  }, [permSchema]);

  const requiredGrouped = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const p of permSchema?.permissions || []) {
      if (!requiredSet.has(p)) continue;
      const cat = p.split(":")[0];
      (groups[cat] ||= []).push(p);
    }
    return groups;
  }, [permSchema, requiredSet]);

  const showAllPermsEffective = showAllPerms || !hasRequiredPerms;
  const displayedGroups = showAllPermsEffective ? groupedVisible : requiredGrouped;

  const matchingSubTokens = useMemo(
    () => siteTokens.filter((t) => requiredPerms.every((p) => t.permissions.includes(p))),
    [siteTokens, requiredPerms],
  );
  const hasExistingTokens = matchingSubTokens.length > 0;
  const showGrantPanel = !hasExistingTokens || createNewToken;

  const missingRequired = useMemo(
    () => requiredPerms.filter((p) => !selectedPerms.has(p)),
    [requiredPerms, selectedPerms],
  );

  useEffect(() => {
    if (showMissingWarn && missingRequired.length === 0) setShowMissingWarn(false);
  }, [showMissingWarn, missingRequired]);

  const attemptSubmit = () => {
    if (missingRequired.length > 0) {
      setShowMissingWarn(true);
      return;
    }
    onCreateToken(Array.from(selectedPerms));
  };

  return (
    <div class={s.permView}>
      <div class={s.dpermHead}>
        <div class={s.dpermIcons}>
          <div class={s.dpermIconBox}>
            <i class="fas fa-globe" />
          </div>
          <i class={`fas fa-ellipsis ${s.dpermDots}`} />
          <div class={s.dpermIconBox}>
            <img src="/logo.png" alt="Bilup Accounts" draggable={false} />
          </div>
        </div>
        <h1 class={s.dpermTitle}>{requestor}</h1>
        <p class={s.dpermSub}>wants to access your Bilup account</p>
        <p class={s.dpermSignedIn}>
          Signed in as <strong>{username}</strong>
          <button type="button" class={s.dpermSwitch} onClick={onSwitchAccount}>
            Not you?
          </button>
        </p>
      </div>

      {requiresFull && !useFullAccess && (
        <div class={s.permMissingWarn}>
          <div class={s.permMissingWarnHead}>
            <i class="fas fa-triangle-exclamation" />
            <strong>{requestor} asked for full access</strong>
          </div>
          <p class={s.permMissingWarnText}>
            You're only granting some permissions. Some features on this app may
            not work as expected. Re-enable <strong>Full account access</strong>{" "}
            below to grant everything.
          </p>
        </div>
      )}

      <div class={s.permViewActions}>
        {hasExistingTokens && (
          <div class={s.existingBlock}>
            <div class={s.existingHead}>
              <i class="fas fa-circle-check" />
              <div>
                <h2 class={s.existingTitle}>
                  You already have access for {requestor}
                </h2>
                <p class={s.existingSub}>
                  Reuse it — nothing new is granted, and there's no extra token
                  to revoke later.
                </p>
              </div>
            </div>

            {matchingSubTokens.map((sub) => {
              const deleting = deletingTokenId === sub.id;
              return (
                <div key={sub.id} class={s.tokenRow}>
                  <button
                    class={`${s.existingPrimary} ${s.tokenMain}`}
                    disabled={deleting}
                    onClick={() => onUseSubToken(sub)}
                  >
                    <i class="fas fa-key" />
                    <span class={s.existingPrimaryBody}>
                      <span class={s.existingPrimaryTitle}>
                        Continue to {requestor}
                      </span>
                      <span class={s.existingPrimarySub}>
                        {sub.name || "Unnamed token"} · {sub.permissions.length}{" "}
                        {plural(sub.permissions.length, "permission")}
                      </span>
                    </span>
                    <i class={`fas fa-arrow-right ${s.existingPrimaryArrow}`} />
                  </button>
                  <button
                    type="button"
                    class={s.tokenDelete}
                    title="Delete this token"
                    aria-label="Delete this token"
                    disabled={deleting}
                    onClick={() => onDeleteToken(sub)}
                  >
                    <i class={`fas ${deleting ? "fa-spinner fa-spin" : "fa-trash"}`} />
                  </button>
                </div>
              );
            })}

            {!createNewToken && (
              <button
                type="button"
                class={s.existingCreateNew}
                onClick={() => setCreateNewToken(true)}
              >
                Create another token instead
              </button>
            )}
          </div>
        )}

        {hasExistingTokens && createNewToken && (
          <div class={s.duplicateWarn}>
            <div class={s.duplicateWarnHead}>
              <i class="fas fa-triangle-exclamation" />
              <strong>You already have a token for {requestor}</strong>
            </div>
            <p class={s.duplicateWarnText}>
              Creating another one doesn't grant you anything new — it just
              leaves two credentials to keep track of and revoke. Reusing the
              existing token is almost always the better choice.
            </p>
            <button
              type="button"
              class={s.duplicateWarnBack}
              onClick={() => setCreateNewToken(false)}
            >
              <i class="fas fa-arrow-left" /> Use my existing token
            </button>
          </div>
        )}

        {showGrantPanel && (
          <>
            <div class={s.dpermPanel}>
              <p class={s.dpermConfirm}>
                Confirm that you want to grant <strong>{requestor}</strong> the
                following permissions:
              </p>
              <div class={`${s.dpermList} ${useFullAccess ? s.dpermListOff : ""}`}>
                {!permSchema ? (
                  <div class={s.permLoading}>Loading permissions…</div>
                ) : (
                  Object.entries(displayedGroups).map(([cat, perms]) => (
                    <div key={cat} class={s.dpermCat}>
                      <div class={s.dpermCatLabel}>
                        <i class={`fas ${permIcon(perms[0])}`} /> {cat}
                      </div>
                      {perms.map((p) => {
                        const forbidden = FORBIDDEN_PERMISSIONS.has(p);
                        const checked = selectedPerms.has(p) && !forbidden;
                        const requested = requiredSet.has(p);
                        return (
                          <label
                            key={p}
                            class={`${s.dpermRow} ${checked ? s.dpermRowOn : ""} ${forbidden ? s.dpermRowDisabled : ""}`}
                            title={p}
                          >
                            <input
                              type="checkbox"
                              class={s.dpermInput}
                              checked={checked}
                              disabled={forbidden || useFullAccess}
                              onChange={() => togglePerm(p)}
                            />
                            <span class={s.dpermBox}>
                              {checked && <i class="fas fa-check" />}
                            </span>
                            <span class={s.dpermName}>{describePerm(p)}</span>
                            {requested && <span class={s.dpermReq}>requested</span>}
                            {forbidden && (
                              <span class={s.dpermForbidden}>not allowed</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              {hasRequiredPerms && (
                <button
                  type="button"
                  class={s.dpermToggleAll}
                  onClick={() => setShowAllPerms((v) => !v)}
                >
                  <i class={`fas fa-chevron-${showAllPermsEffective ? "up" : "down"}`} />
                  {showAllPermsEffective
                    ? "Show only requested permissions"
                    : "Show all permissions"}
                </button>
              )}
            </div>

            {allowFullAccess && (
              <label
                class={`${s.permFullAccessToggle} ${useFullAccess ? s.permFullAccessToggleActive : ""} ${useFullAccess ? s.permFullAccessToggleDanger : ""}`}
              >
                <input
                  type="checkbox"
                  checked={useFullAccess}
                  onChange={(e: any) => {
                    setUseFullAccess(e.target.checked);
                    setShowMissingWarn(false);
                  }}
                  class={s.permFullAccessCheckbox}
                />
                <div class={s.permFullAccessCheck}>
                  {useFullAccess && <i class="fas fa-check" />}
                </div>
                <div class={s.permFullAccessBody}>
                  <span class={s.permFullAccessTitle}>
                    <i class="fas fa-bolt" /> Full account access
                  </span>
                  <span class={s.permFullAccessSub}>
                    Send your main account token instead of a limited sub-token
                  </span>
                </div>
              </label>
            )}

            {useFullAccess && (
              <div class={s.permDangerWarning}>
                <div class={s.permDangerWarningHead}>
                  <i class="fas fa-triangle-exclamation" />
                  <strong>
                    {requestor} will be able to do anything you can. That
                    includes:
                  </strong>
                </div>
                <ul class={s.permDangerList}>
                  <li>
                    <i class="fas fa-id-card" /> Read and change everything in
                    your account
                  </li>
                  <li>
                    <i class="fas fa-coins" /> Spend and transfer your credits
                  </li>
                  <li>
                    <i class="fas fa-folder-open" /> Read, upload, and delete
                    your files
                  </li>
                  <li>
                    <i class="fas fa-key" /> View and manage your keys and tokens
                  </li>
                </ul>
                <p class={s.permDangerWarningNote}>
                  Only enable this if you fully trust {requestor}. Otherwise turn
                  it off and grant just the permissions above. A scoped token is
                  almost always the safer choice.
                </p>
              </div>
            )}

            <div class={s.dpermFooter}>
              <span class={s.dpermCount}>
                {useFullAccess ? (
                  "Full account access"
                ) : (
                  <>
                    <strong>{selectedPerms.size}</strong>{" "}
                    {plural(selectedPerms.size, "permission")} selected
                  </>
                )}
              </span>
              <div class={s.dpermFooterActions}>
                <button type="button" class={s.dpermBack} onClick={onCancel}>
                  Back
                </button>
                <button
                  type="button"
                  class={`${s.dpermAuthorize} ${useFullAccess ? s.dpermAuthorizeDanger : ""}`}
                  onClick={useFullAccess ? onUseMainToken : attemptSubmit}
                  disabled={
                    scopeBtn.disabled || (!useFullAccess && selectedPerms.size === 0)
                  }
                  style={
                    scopeBtn.color
                      ? { background: scopeBtn.color, color: "var(--void)" }
                      : undefined
                  }
                >
                  {scopeBtn.color ? scopeBtn.text : "Authorize"}
                </button>
              </div>
            </div>

            {showMissingWarn && missingRequired.length > 0 && (
              <div class={s.permMissingWarn}>
                <div class={s.permMissingWarnHead}>
                  <i class="fas fa-triangle-exclamation" />
                  <strong>{requestor} may not work as expected</strong>
                </div>
                <p class={s.permMissingWarnText}>
                  You removed {missingRequired.length} requested{" "}
                  {plural(missingRequired.length, "permission")}:
                </p>
                <div class={s.permRequiredTags}>
                  {missingRequired.map((p) => (
                    <span
                      key={p}
                      class={`${s.permRequiredTag} ${s.permRequiredTagMissing}`}
                    >
                      <i class="fas fa-xmark" />
                      {p}
                    </span>
                  ))}
                </div>
                <div class={s.permMissingWarnActions}>
                  <button
                    type="button"
                    class={s.permCancelBtn}
                    onClick={() => setShowMissingWarn(false)}
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    class={s.permAllowBtn}
                    onClick={() => {
                      setShowMissingWarn(false);
                      onCreateToken(Array.from(selectedPerms));
                    }}
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            )}
            {scopeError && <div class={s.permError}>{scopeError}</div>}
          </>
        )}
      </div>

      <AuthTosLinks>
        <p>
          <a href="/privacy-policy?from=auth">Privacy Policy</a> •{" "}
          <a href="/terms-of-service?from=auth">Terms of Service</a>
        </p>
      </AuthTosLinks>
    </div>
  );
}
