const USER_SCOPE_SEPARATOR = '__u_';

function normalizeReceiptId(rawId) {
  const value = `${rawId ?? ''}`.trim();
  return value || Date.now().toString();
}

export function toUserScopedReceiptId(rawId, userId) {
  const baseId = normalizeReceiptId(rawId);
  if (!userId) return baseId;

  const suffix = `${USER_SCOPE_SEPARATOR}${userId}`;
  if (baseId.endsWith(suffix)) return baseId;
  return `${baseId}${suffix}`;
}

export function getReceiptIdCandidates(rawId, userId) {
  const baseId = normalizeReceiptId(rawId);
  const scopedId = toUserScopedReceiptId(baseId, userId);
  return [...new Set([scopedId, baseId])];
}
