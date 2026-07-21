/**
 * Pluralize an English word by count. All words used here are regular, so the
 * default just appends "s"; pass an explicit plural for irregulars ("entry",
 * "entries"). Does NOT include the number — compose it: `${n} ${plural(n, "device")}`.
 */
export function plural(count: number, singular: string, pluralForm?: string) {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

// ponytail: local helper over a `pluralize` dep — every word here is regular.
