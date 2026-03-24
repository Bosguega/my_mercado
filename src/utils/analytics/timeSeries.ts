export function groupByMonth(items) {
  return items.reduce((acc, item) => {
    if (!item.purchasedAt) return acc;

    const key = item.purchasedAt.slice(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);

    return acc;
  }, {});
}

export function buildTimeSeries(grouped, valueFn) {
  return Object.entries(grouped)
    .map(([date, items]) => ({
      date,
      value: items.reduce((acc, i) => acc + valueFn(i), 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
