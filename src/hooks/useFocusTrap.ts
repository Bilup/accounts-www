import { useEffect, useRef } from "preact/hooks";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside an open modal and restores it to whatever was
 * focused before. Without this, Tab walks off into the page behind the modal.
 *
 * Returns a ref to spread onto the dialog element.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first thing in the dialog so the keyboard starts inside it.
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
    (focusables()[0] ?? node).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    }

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
