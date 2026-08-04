import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { X } from "lucide-preact";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useI18n } from "../i18n/i18n";
import s from "./ConfirmDialog.module.css";

export interface ConfirmInput {
  label?: string;
  type?: "text" | "password";
  placeholder?: string;
  /** If set, confirm stays disabled until the typed value matches exactly. */
  requireValue?: string;
}

export interface ConfirmOptions {
  title: string;
  /** Body text. Long content (e.g. group rules) scrolls rather than truncating. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (delete, kick, ban). */
  danger?: boolean;
  /** Prompt for a value inside the modal; confirm resolves with the string. */
  input?: ConfirmInput;
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  input,
  onConfirm,
  onCancel,
}: ConfirmOptions & {
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const defaultConfirm = confirmLabel ?? t("confirmDialog.confirm");
  const defaultCancel = cancelLabel ?? t("confirmDialog.cancel");

  const ready =
    !input ||
    (input.requireValue ? value === input.requireValue : value.length > 0);

  useEffect(() => {
    if (input) inputRef.current?.focus();
  }, [input]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    if (ready) onConfirm(value);
  };

  return (
    <div class={s.backdrop} role="presentation" onClick={onCancel}>
      <div
        ref={trapRef}
        tabIndex={-1}
        class={s.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div class={s.header}>
          <h2 id="confirm-title" class={s.title}>
            {title}
          </h2>
          <button class={s.close} onClick={onCancel} aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
        {message && <div class={s.message}>{message}</div>}
        {input && (
          <div class={s.inputGroup}>
            {input.label && <label class={s.inputLabel}>{input.label}</label>}
            <input
              ref={inputRef}
              class={s.input}
              type={input.type ?? "text"}
              placeholder={input.placeholder}
              value={value}
              autoComplete={
                input.type === "password" ? "current-password" : "off"
              }
              onInput={(e: any) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        )}
        <div class={s.actions}>
          <button
            class={danger ? s.confirmDanger : s.confirm}
            onClick={submit}
            disabled={!ready}
          >
            {defaultConfirm}
          </button>
          <button class={s.cancel} onClick={onCancel}>
            {defaultCancel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Drop-in replacement for window.confirm(): returns a promise resolving to
 * true/false. Render the returned node somewhere in the component's tree.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title: "Delete?" , danger: true }))) return;
 *   ...
 *   return <div>{confirmDialog}...</div>;
 *
 * With `input`, it acts like window.prompt(): resolves to the typed string on
 * confirm, or false on cancel.
 *
 *   const pw = await confirm({ title: "Confirm", input: { type: "password" } });
 *   if (!pw) return;
 */
export function useConfirm() {
  const [pending, setPending] = useState<{
    opts: ConfirmOptions;
    resolve: (ok: boolean | string) => void;
  } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean | string>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const settle = useCallback(
    (ok: boolean | string) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  // Portal to <body>: callers render this inside modals and other stacking
  // contexts, which would otherwise paint over the confirm no matter its z-index.
  const node = pending
    ? createPortal(
        <ConfirmDialog
          {...pending.opts}
          onConfirm={(value) => settle(pending.opts.input ? value : true)}
          onCancel={() => settle(false)}
        />,
        document.body,
      )
    : null;

  return [confirm, node] as const;
}
