export function filterBySearch(
  items: any[], // TODO: type
  query: string,
  fields: string[],
): any[] { // TODO: type
  if (!query) return items;

  const q = query.toLowerCase();

  return items.filter((item) =>
    fields.some((field) => (item[field] || "").toLowerCase().includes(q))
  );
}

export function sortItems(
  items: any[], // TODO: type
  sortBy: string,
  direction: "asc" | "desc",
  customSorters: Record<string, (a: any, b: any) => number> = {}, // TODO: type
): any[] { // TODO: type
  const sorted = [...items];

  if (customSorters[sortBy]) {
    sorted.sort((a, b) =>
      direction === "asc"
        ? customSorters[sortBy](a, b)
        : customSorters[sortBy](b, a)
    );
    return sorted;
  }

  return sorted;
}
