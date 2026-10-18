/**
 * Dutch possessive of a first name: "Lottes", "Sams", but "Noa's", "Timo's", "Max'"
 * (CLAUDE.md, product rules). An apostrophe after a/i/o/u/y (the sound would change
 * otherwise) and only an apostrophe after s, x and z.
 */
export function possessive(name: string): string {
  const trimmed = name.trim();
  if (/[sxz]$/i.test(trimmed)) return `${trimmed}'`;
  if (/[aiouyáíóúé]$/i.test(trimmed)) return `${trimmed}'s`;
  return `${trimmed}s`;
}
