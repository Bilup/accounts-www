import { useState, useEffect, useCallback } from "preact/hooks";
import { useI18n } from "../../i18n/i18n";
import {
  AuthShell,
  AuthMain,
  AuthLogo,
  AuthHeading,
  AuthSubheading,
  AuthFormGroup,
  AuthInput,
  AuthBtnPrimary,
  AuthTosLinks,
  AuthTosLinkBtn,
  AuthNotice,
} from "./Shell";

const API = "https://api.accounts.bilup.org";

type BtnState = { text: string; disabled: boolean; color: string };

const defaultBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "",
});
const loadingBtn = (text: string): BtnState => ({
  text,
  disabled: true,
  color: "",
});
const errorBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "var(--auth-danger, #f87171)",
});
const successBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "var(--auth-success, #4ade80)",
});

function flashBtn(
  setter: (b: BtnState) => void,
  original: string,
  btn: BtnState,
  ms = 2000,
) {
  setter(btn);
  setTimeout(() => setter(defaultBtn(original)), ms);
}

export function ResetPassword() {
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [btn, setBtn] = useState<BtnState>(defaultBtn(t("auth.resetPassword")));
  const [msg, setMsg] = useState("");
  const [msgVariant, setMsgVariant] = useState<"error" | "success">("error");
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setNoToken(true);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (!token.trim()) {
        flashBtn(setBtn, t("auth.resetPassword"), errorBtn(t("auth.resetCodeRequired")));
        setMsgVariant("error");
        setMsg(t("auth.resetCodeRequired"));
        return;
      }
      if (newPw.length < 8) {
        flashBtn(
          setBtn,
          t("auth.resetPassword"),
          errorBtn(t("auth.password8Chars")),
        );
        setMsgVariant("error");
        setMsg(t("auth.passwordLengthError"));
        return;
      }
      if (newPw !== confirm) {
        flashBtn(setBtn, t("auth.resetPassword"), errorBtn(t("auth.passwordsDoNotMatch")));
        setMsgVariant("error");
        setMsg(t("auth.passwordsDontMatch"));
        return;
      }
      setMsg("");
      setBtn(loadingBtn(t("auth.resetting")));
      try {
        const res = await fetch(`${API}/auth/reset_password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token.trim(),
            new_password: newPw,
          }),
        });
        const data = await res.json().catch(() => ({}) as any);
        if (!res.ok) {
          setMsgVariant("error");
          flashBtn(
            setBtn,
            t("auth.resetPassword"),
            errorBtn(data.error || t("auth.failedToReset")),
          );
          setMsg(data.error || t("auth.failedToReset"));
          return;
        }
        setBtn(successBtn(t("auth.passwordReset")));
        setMsgVariant("success");
        setMsg(data.message || t("auth.passwordResetMsg"));
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1500);
      } catch {
        setMsgVariant("error");
        flashBtn(
          setBtn,
          t("auth.resetPassword"),
          errorBtn(t("auth.networkError")),
        );
        setMsg(t("auth.networkError"));
      }
    },
    [token, newPw, confirm],
  );

  if (noToken) {
    return (
      <AuthShell>
        <AuthMain>
          <AuthLogo />
          <AuthHeading>{t("auth.invalidResetLink")}</AuthHeading>
          <AuthSubheading>{t("auth.invalidResetLinkSub")}</AuthSubheading>
          <AuthTosLinks>
            <p>
              <AuthTosLinkBtn onClick={() => (window.location.href = "/auth")}>
                {t("auth.goToSignIn")}
              </AuthTosLinkBtn>
            </p>
          </AuthTosLinks>
        </AuthMain>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthMain>
        <AuthLogo />
        <AuthHeading>{t("auth.setNewPassword")}</AuthHeading>
        <AuthSubheading>{t("auth.setNewPasswordSub")}</AuthSubheading>
        <form onSubmit={handleSubmit} style={{ maxWidth: 480, width: "100%" }}>
          <AuthFormGroup>
            <AuthInput
              type="password"
              name="new-password"
              placeholder={t("auth.newPasswordPlaceholder")}
              required
              minlength={8}
              value={newPw}
              onInput={(e: any) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </AuthFormGroup>
          <AuthFormGroup>
            <AuthInput
              type="password"
              name="confirm-password"
              placeholder={t("auth.confirmNewPasswordPlaceholder")}
              required
              minlength={8}
              value={confirm}
              onInput={(e: any) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </AuthFormGroup>
          <AuthBtnPrimary
            type="submit"
            disabled={btn.disabled}
            style={btn.color ? { background: btn.color } : undefined}
          >
            {btn.text}
          </AuthBtnPrimary>
        </form>
        {msg && (
          <AuthNotice
            variant={msgVariant}
            icon={
              msgVariant === "success"
                ? "fas fa-circle-check"
                : "fas fa-circle-info"
            }
          >
            {msg}
          </AuthNotice>
        )}
        <AuthTosLinks>
          <p>
            <AuthTosLinkBtn onClick={() => (window.location.href = "/auth")}>
              {t("auth.backToSignIn")}
            </AuthTosLinkBtn>
          </p>
        </AuthTosLinks>
      </AuthMain>
    </AuthShell>
  );
}
