import { useMemo, useState } from "preact/hooks";
import s from "./Auth.module.css";
import { AuthTosLinks } from "./Shell";
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
  isLocalhost: boolean;
  requiresFull: boolean;
  requiredPerms: string[];
  permSchema: PermissionSchema | null;
  siteTokens: SubToken[];
  scopeBtn: BtnState;
  scopeError: string;
  updatingTokenId: string | null;
  onUseSubToken: (t: SubToken) => void;
  onUpdateToken: (t: SubToken) => void;
  onCreateToken: (perms: string[]) => void;
  onUseMainToken: () => void;
  onSwitchAccount: () => void;
  onCancel: () => void;
}

export function PermissionsView({
  requestor,
  username,
  isLocalhost,
  requiresFull,
  requiredPerms,
  permSchema,
  siteTokens,
  scopeBtn,
  scopeError,
  updatingTokenId,
  onUseSubToken,
  onUpdateToken,
  onCreateToken,
  onUseMainToken,
  onSwitchAccount,
  onCancel,
}: Props) {
  const requiredSet = useMemo(() => new Set(requiredPerms), [requiredPerms]);

  const fullTokens = siteTokens.filter((t) =>
    requiredPerms.every((p) => t.permissions.includes(p)),
  );
  const partialTokens = siteTokens.filter(
    (t) => !requiredPerms.every((p) => t.permissions.includes(p)),
  );

  const hasRequiredPerms = requiredPerms.length > 0;
  const mainTokenPrimary = isLocalhost || requiresFull || !hasRequiredPerms;
  const canCreate = !requiresFull && hasRequiredPerms;

  const [customizing, setCustomizing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(requiredPerms),
  );

  const toggle = (p: string) => {
    if (FORBIDDEN_PERMISSIONS.has(p)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const p of permSchema?.permissions || []) {
      if (FORBIDDEN_PERMISSIONS.has(p)) continue;
      const cat = p.split(":")[0];
      (groups[cat] ||= []).push(p);
    }
    return groups;
  }, [permSchema]);

  const createPerms = customizing ? Array.from(selected) : requiredPerms;
  const mainTokenSub = isLocalhost
    ? "You're on localhost — quickest for local debugging. Full account access."
    : "Full account access. Only for apps you fully trust.";

  return (
    <div class={s.permView}>
      <div class={s.dpermHead}>
        <div class={s.dpermIcons}>
          <div class={s.dpermIconBox}>
            <i class="fas fa-globe" />
          </div>
          <i class={`fas fa-ellipsis ${s.dpermDots}`} />
          <div class={s.dpermIconBox}>
            <img src="/Rotur Logo.png" alt="Rotur" draggable={false} />
          </div>
        </div>
        <h1 class={s.dpermTitle}>{requestor}</h1>
        <p class={s.dpermSub}>wants to access your Rotur account</p>
        <p class={s.dpermSignedIn}>
          Signed in as <strong>{username}</strong>
          <button type="button" class={s.dpermSwitch} onClick={onSwitchAccount}>
            Not you?
          </button>
        </p>
      </div>

      <div class={s.permViewActions}>
        {mainTokenPrimary && (
          <button
            type="button"
            class={s.existingPrimary}
            onClick={onUseMainToken}
          >
            <i class={`fas ${isLocalhost ? "fa-bug" : "fa-bolt"}`} />
            <span class={s.existingPrimaryBody}>
              <span class={s.existingPrimaryTitle}>
                Use your main account token
              </span>
              <span class={s.existingPrimarySub}>{mainTokenSub}</span>
            </span>
            <i class={`fas fa-arrow-right ${s.existingPrimaryArrow}`} />
          </button>
        )}

        {fullTokens.map((sub) => (
          <button
            key={sub.id}
            class={s.existingPrimary}
            onClick={() => onUseSubToken(sub)}
          >
            <i class="fas fa-key" />
            <span class={s.existingPrimaryBody}>
              <span class={s.existingPrimaryTitle}>
                Continue to {requestor}
              </span>
              <span class={s.existingPrimarySub}>
                {sub.name || "Unnamed token"} · {sub.permissions.length}{" "}
                permission
                {sub.permissions.length !== 1 ? "s" : ""}
              </span>
            </span>
            <i class={`fas fa-arrow-right ${s.existingPrimaryArrow}`} />
          </button>
        ))}

        {partialTokens.map((sub) => {
          const missing = requiredPerms.filter(
            (p) => !sub.permissions.includes(p),
          );
          const busy = updatingTokenId === sub.id;
          return (
            <button
              key={sub.id}
              class={s.existingPrimary}
              disabled={busy}
              onClick={() => onUpdateToken(sub)}
            >
              <i class="fas fa-arrows-rotate" />
              <span class={s.existingPrimaryBody}>
                <span class={s.existingPrimaryTitle}>
                  {busy ? "Updating…" : `Update & continue to ${requestor}`}
                </span>
                <span class={s.existingPrimarySub}>
                  {sub.name || "Unnamed token"} · adds {missing.length} new
                  permission{missing.length !== 1 ? "s" : ""}
                </span>
              </span>
              <i class={`fas fa-arrow-right ${s.existingPrimaryArrow}`} />
            </button>
          );
        })}

        {canCreate && (
          <div class={s.dpermPanel}>
            <p class={s.dpermConfirm}>
              {fullTokens.length || partialTokens.length
                ? "Or make a new token that lets "
                : "Create a token that lets "}
              <strong>{requestor}</strong> do this:
            </p>

            {customizing ? (
              <div class={s.dpermList}>
                {Object.entries(grouped).map(([cat, perms]) => (
                  <div key={cat} class={s.dpermCat}>
                    <div class={s.dpermCatLabel}>
                      <i class={`fas ${permIcon(perms[0])}`} /> {cat}
                    </div>
                    {perms.map((p) => {
                      const checked = selected.has(p);
                      return (
                        <label
                          key={p}
                          class={`${s.dpermRow} ${checked ? s.dpermRowOn : ""}`}
                          title={p}
                        >
                          <input
                            type="checkbox"
                            class={s.dpermInput}
                            checked={checked}
                            onChange={() => toggle(p)}
                          />
                          <span class={s.dpermBox}>
                            {checked && <i class="fas fa-check" />}
                          </span>
                          <span class={s.dpermName}>{describePerm(p)}</span>
                          {requiredSet.has(p) && (
                            <span class={s.dpermReq}>requested</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div class={s.permRequiredTags}>
                {requiredPerms.map((p) => (
                  <span key={p} class={s.permRequiredTag}>
                    <i class="fas fa-check" /> {describePerm(p)}
                  </span>
                ))}
              </div>
            )}

            {permSchema && (
              <button
                type="button"
                class={s.dpermToggleAll}
                onClick={() => setCustomizing((v) => !v)}
              >
                <i class={`fas fa-chevron-${customizing ? "up" : "down"}`} />
                {customizing
                  ? "Use the requested permissions"
                  : "Choose permissions myself"}
              </button>
            )}

            <div class={s.dpermFooter}>
              <span class={s.dpermCount}>
                <strong>{createPerms.length}</strong> permission
                {createPerms.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                class={s.dpermAuthorize}
                disabled={scopeBtn.disabled || createPerms.length === 0}
                onClick={() => onCreateToken(createPerms)}
                style={
                  scopeBtn.color
                    ? { background: scopeBtn.color, color: "var(--void)" }
                    : undefined
                }
              >
                {scopeBtn.color ? scopeBtn.text : "Allow"}
              </button>
            </div>
          </div>
        )}

        {!mainTokenPrimary && (
          <button
            type="button"
            class={s.existingCreateNew}
            onClick={onUseMainToken}
          >
            Use my main account token instead (full access)
          </button>
        )}

        {scopeError && <div class={s.permError}>{scopeError}</div>}

        <button type="button" class={s.dpermBack} onClick={onCancel}>
          Cancel
        </button>
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
