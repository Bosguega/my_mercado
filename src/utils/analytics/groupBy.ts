export function groupBy(
  array: any[], // TODO: type
  keyFn: (item: any) => string, // TODO: type
): Record<string, any[]> { // TODO: type
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
