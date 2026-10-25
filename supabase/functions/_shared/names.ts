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
