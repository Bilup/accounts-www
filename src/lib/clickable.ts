/**
 * Props that make a non-button element behave like one: focusable, activated by
 * Enter/Space, and announced as a button. Spread onto clickable card divs.
 */
export function clickable(onActivate: () => void, label?: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
