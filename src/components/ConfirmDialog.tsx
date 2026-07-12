import { useState, useCallback, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import { X } from "lucide-preact";
import { useFocusTrap } from "../hooks/useFocusTrap";
import s from "./ConfirmDialog.module.css";

export interface ConfirmOptions {
  title: string;
  /** Body text. Long content (e.g. group rules) scrolls rather than truncating. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (delete, kick, ban). */
  danger?: boolean;
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

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
        <div class={s.actions}>
          <button
            class={danger ? s.confirmDanger : s.confirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button class={s.cancel} onClick={onCancel}>
            {cancelLabel}
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
 */
export function useConfirm() {
  const [pending, setPending] = useState<{
    opts: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const settle = useCallback(
    (ok: boolean) => {
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
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />,
        document.body,
      )
    : null;

  return [confirm, node] as const;
}
