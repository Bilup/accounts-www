import { useState, useEffect, useCallback } from "preact/hooks";
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

const API = "https://api.rotur.dev";

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
  const [token, setToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [btn, setBtn] = useState<BtnState>(defaultBtn("Reset password"));
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
        flashBtn(setBtn, "Reset password", errorBtn("Reset code is required"));
        return;
      }
      if (newPw.length < 8) {
        flashBtn(
          setBtn,
          "Reset password",
          errorBtn("Password must be 8+ characters"),
        );
        return;
      }
      if (newPw !== confirm) {
        flashBtn(
          setBtn,
          "Reset password",
          errorBtn("Passwords do not match"),
        );
        return;
      }
      setMsg("");
      setBtn(loadingBtn("Resetting..."));
      try {
        const res = await fetch(`${API}/auth/reset_password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token.trim(),
            new_password: newPw,
          }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          setMsgVariant("error");
          flashBtn(
            setBtn,
            "Reset password",
            errorBtn(data.error || "Failed to reset password"),
          );
          setMsg(data.error || "Failed to reset password");
          return;
        }
        setBtn(successBtn("Password reset!"));
        setMsgVariant("success");
        setMsg(data.message || "Your password has been reset. Please sign in.");
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1500);
      } catch {
        setMsgVariant("error");
        flashBtn(
          setBtn,
          "Reset password",
          errorBtn("Network error - try again"),
        );
        setMsg("Network error - try again");
      }
    },
    [token, newPw, confirm],
  );

  if (noToken) {
    return (
      <AuthShell>
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Invalid reset link</AuthHeading>
          <AuthSubheading>
            This password reset link is invalid or missing a token. Please
            request a new one from the forgot password page.
          </AuthSubheading>
          <AuthTosLinks>
            <p>
              <AuthTosLinkBtn
                onClick={() => (window.location.href = "/auth")}
              >
                Go to sign in
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
        <AuthHeading>Set a new password</AuthHeading>
        <AuthSubheading>
          Enter a new password for your account.
        </AuthSubheading>
        <form onSubmit={handleSubmit} style={{ maxWidth: 480, width: "100%" }}>
          <AuthFormGroup>
            <AuthInput
              type="password"
              name="new-password"
              placeholder="New password (8+ characters)"
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
              placeholder="Confirm new password"
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
              Back to sign in
            </AuthTosLinkBtn>
          </p>
        </AuthTosLinks>
      </AuthMain>
    </AuthShell>
  );
}
