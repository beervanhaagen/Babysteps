/**
 * Dutch possessive of a first name, the same rule as packages/core/src/names.ts (the app):
 * "Lottes", "Sams", but "Noa's", "Timo's", "Max'". Keep the two in step.
 */
export function possessive(name: string): string {
  const trimmed = name.trim();
  if (/[sxz]$/i.test(trimmed)) return `${trimmed}'`;
  if (/[aiouyáíóúé]$/i.test(trimmed)) return `${trimmed}'s`;
  return `${trimmed}s`;
}

/** "Week 31", or from week 53 "1 jaar en 4 weken": the same as weekName in packages/core/src/weeks.ts. */
export function weekName(week: number): string {
  if (week <= 52) return `Week ${week}`;
  const years = Math.floor((week - 1) / 52);
  const weeks = (week - 1) % 52;
  return weeks ? `${years} jaar en ${weeks} ${weeks === 1 ? 'week' : 'weken'}` : `${years} jaar`;
}
