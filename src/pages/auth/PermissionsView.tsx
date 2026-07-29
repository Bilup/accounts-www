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
import { useI18n } from "../../i18n/i18n";

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
  const { t } = useI18n();
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
      {/* Header */}
      <div class={s.permHeader}>
        <h2 class={s.permTitle}>{t("perms.title")}</h2>
        <p class={s.permSub}>{t("perms.subtitle", { name: requestor })}</p>
        <p class={s.permUser}>
          <i class="fas fa-user" /> {username}
        </p>
      </div>

      {/* Existing token prompt */}
      {hasExistingTokens && !createNewToken && (
        <div class={s.existingTokensBanner}>
          <p>
            <i class="fas fa-info-circle" /> You have existing tokens that cover
            the requested permissions.
          </p>
          {matchingSubTokens.map((st) => (
            <button
              key={st.id}
              class={s.existingTokenBtn}
              onClick={() => onUseSubToken(st)}
            >
              <i class="fas fa-key" /> Use {st.name || "token"} (created{" "}
              {new Date(st.created).toLocaleDateString()})
            </button>
          ))}
          <button
            class={s.newTokenLink}
            onClick={() => setCreateNewToken(true)}
          >
            <i class="fas fa-plus" /> Create new token instead
          </button>
        </div>
      )}

      {/* Grant panel */}
      {showGrantPanel && (
        <div class={s.permGrant}>
          {/* Full access option */}
          {allowFullAccess && (
            <label class={s.fullAccessToggle}>
              <input
                type="checkbox"
                checked={useFullAccess}
                onChange={(e) => setUseFullAccess((e.target as HTMLInputElement).checked)}
              />
              <div class={s.fullAccessContent}>
                <strong>{t("perms.fullAccess")}</strong>
                <p>{t("perms.fullAccessDesc")}</p>
              </div>
            </label>
          )}

          {/* Scoped access */}
          {permSchema && (
            <div class={s.scopedSection}>
              <div class={s.scopedHeader}>
                <strong>{t("perms.scopedAccess")}</strong>
                <p>{t("perms.scopedAccessDesc")}</p>
              </div>

              {/* Required permissions */}
              {hasRequiredPerms && (
                <div class={s.permGroup}>
                  <div class={s.permGroupTitle}>
                    <i class="fas fa-lock" /> {t("perms.requiredPerms")}
                  </div>
                  <div class={s.permList}>
                    {requiredPerms.map((p) => (
                      <div key={p} class={`${s.permItem} ${s.permRequired}`}>
                        <i class={`fas ${permIcon(p)}`} />
                        <span>{describePerm(p) || p}</span>
                        <span class={s.permRequiredBadge}>{t("perms.requiredPerms")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All permissions */}
              {permSchema.permissions.length > 0 && (
                <div class={s.permGroup}>
                  <div class={s.permGroupTitle}>
                    <button
                      class={s.permToggleBtn}
                      onClick={() => setShowAllPerms(!showAllPerms)}
                    >
                      {showAllPerms ? t("perms.hidePerms") : t("perms.viewAllPerms")}
                      <i class={`fas fa-chevron-${showAllPerms ? "up" : "down"}`} />
                    </button>
                  </div>
                  {showAllPermsEffective && (
                    <div class={s.permList}>
                      {permSchema.permissions
                        .filter((p) => !requiredSet.has(p))
                        .map((p) => (
                          <label key={p} class={s.permCheckItem}>
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(p)}
                              disabled={FORBIDDEN_PERMISSIONS.has(p)}
                              onChange={() => togglePerm(p)}
                            />
                            <i class={`fas ${permIcon(p)}`} />
                            <span>{describePerm(p) || p}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Missing warning */}
          {showMissingWarn && (
            <div class={s.permWarning}>
              <i class="fas fa-exclamation-triangle" />{" "}
              {t("perms.missingPerms")}
            </div>
          )}

          {/* Scope error */}
          {scopeError && (
            <div class={s.permError}>
              <i class="fas fa-times-circle" /> {scopeError}
            </div>
          )}

          {/* Actions */}
          <div class={s.permActions}>
            <button class={s.permBtnPrimary} onClick={attemptSubmit} disabled={scopeBtn.disabled}>
              {scopeBtn.text || t("perms.saveToken")}
            </button>
            <button class={s.permBtnSecondary} onClick={onCancel}>
              {t("perms.deny")}
            </button>
          </div>
        </div>
      )}

      {/* Main token info */}
      <div class={s.permTokenInfo}>
        <p>
          <i class="fas fa-shield-alt" /> {t("perms.tokenNotShared")}
        </p>
        <div class={s.permTokenActions}>
          <button class={s.permLink} onClick={onUseMainToken}>
            {t("perms.useMainToken")}
          </button>
          <button class={s.permLink} onClick={onSwitchAccount}>
            {t("perms.switchAccount")}
          </button>
        </div>
      </div>

      <AuthTosLinks>
        <p>
          <a href="/terms-of-service?from=auth">Terms of Service</a> &bull;{" "}
          <a href="/privacy-policy?from=auth">Privacy Policy</a>
        </p>
      </AuthTosLinks>
    </div>
  );
}
