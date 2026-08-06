/**
 * Pluralize an English word by count. All words used here are regular, so the
 * default just appends "s"; pass an explicit plural for irregulars ("entry",
 * "entries"). Does NOT include the number — compose it: `${n} ${plural(n, "device")}`.
 *
 * `singular` is usually a translated string. Languages without English-style
 * plural morphology (e.g. Chinese: "成员" stays "成员" for any count) never take
 * a trailing "s", so when the word contains CJK characters we return it as-is —
 * otherwise we'd produce "成员s".
 */
export function plural(count: number, singular: string, pluralForm?: string) {
  if (count === 1) return singular;
  // CJK ideographs => not an English word, so don't apply an English plural "s".
  if (/[\u4e00-\u9fff]/.test(singular)) return singular;
  return pluralForm ?? `${singular}s`;
}

// ponytail: local helper over a `pluralize` dep — every word here is regular.
