export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildRegexSearchFilter(searchFields: readonly string[], query: string) {
  const trimmed = query.trim();
  if (!trimmed || !searchFields.length) {
    return {};
  }

  const regex = new RegExp(escapeRegExp(trimmed), "i");
  return {
    $or: searchFields.map((field) => ({ [field]: regex }))
  };
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}
