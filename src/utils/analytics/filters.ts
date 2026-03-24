export function filterBySearch<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  fields: string[],
): T[] {
  if (!query) return items;

  const q = query.toLowerCase();

  return items.filter((item) =>
    fields.some((field) =>
      String((item as Record<string, unknown>)[field] ?? "")
        .toLowerCase()
        .includes(q),
    )
  );
}

export function sortItems<T extends Record<string, unknown>>(
  items: T[],
  sortBy: string,
  direction: "asc" | "desc",
  customSorters: Record<string, (a: T, b: T) => number> = {},
): T[] {
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
