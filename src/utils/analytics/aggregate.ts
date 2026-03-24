export function sumBy(array: any[], fn: (item: any) => number): number { // TODO: type
  return array.reduce((acc, item) => acc + fn(item), 0);
}

export function calculateItemTotal(
  item: any, // TODO: type
  parseBRL: (value: any) => number, // TODO: type
): number {
  return parseBRL(item.price) * parseBRL(item.quantity || 1);
}

export function calculateReceiptTotal(
  receipt: any, // TODO: type
  parseBRL: (value: any) => number, // TODO: type
): number {
  if (!receipt || !Array.isArray(receipt.items)) return 0;
  return receipt.items.reduce(
    (acc: number, item: any) => acc + calculateItemTotal(item, parseBRL), // TODO: type
    0
  );
}

export function calculateTotalSpent(
  receipts: any, // TODO: type
  parseBRL: (value: any) => number, // TODO: type
): number {
  if (!Array.isArray(receipts)) return 0;
  return receipts.reduce(
    (acc, r) => acc + calculateReceiptTotal(r, parseBRL),
    0
  );
}
