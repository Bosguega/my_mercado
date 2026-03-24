export function sumBy(array, fn) {
  return array.reduce((acc, item) => acc + fn(item), 0);
}

export function calculateItemTotal(item, parseBRL) {
  return parseBRL(item.price) * parseBRL(item.quantity || 1);
}

export function calculateReceiptTotal(receipt, parseBRL) {
  if (!receipt || !Array.isArray(receipt.items)) return 0;
  return receipt.items.reduce(
    (acc, item) => acc + calculateItemTotal(item, parseBRL),
    0
  );
}

export function calculateTotalSpent(receipts, parseBRL) {
  if (!Array.isArray(receipts)) return 0;
  return receipts.reduce(
    (acc, r) => acc + calculateReceiptTotal(r, parseBRL),
    0
  );
}
