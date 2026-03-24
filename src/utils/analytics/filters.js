export function filterBySearch(items, query, fields) {
  if (!query) return items;

  const q = query.toLowerCase();

  return items.filter((item) =>
    fields.some((field) => (item[field] || "").toLowerCase().includes(q))
  );
}

export function sortItems(items, sortBy, direction, customSorters = {}) {
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
