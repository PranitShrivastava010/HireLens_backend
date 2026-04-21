export function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9. ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}