const USER_SCOPE_SEPARATOR = '__u_';

function normalizeReceiptId(rawId: string | number | null | undefined): string {
  const value = `${rawId ?? ''}`.trim();
  return value || Date.now().toString();
}

export function toUserScopedReceiptId(
  rawId: string | number | null | undefined,
  userId: string | null | undefined,
): string {
  const baseId = normalizeReceiptId(rawId);
  if (!userId) return baseId;

  const suffix = `${USER_SCOPE_SEPARATOR}${userId}`;
  if (baseId.endsWith(suffix)) return baseId;
  return `${baseId}${suffix}`;
}

export function getReceiptIdCandidates(
  rawId: string | number | null | undefined,
  userId: string | null | undefined,
): string[] {
  const baseId = normalizeReceiptId(rawId);
  const scopedId = toUserScopedReceiptId(baseId, userId);
  return [...new Set([scopedId, baseId])];
}
