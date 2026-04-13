/**
 * Download an array of row objects as a CSV file.
 * Column order is derived from the union of all keys across all rows.
 * Values are properly escaped (quoted if they contain commas, quotes, or newlines).
 */
export function downloadCsv(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return;

  // Collect all column keys in stable insertion order
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const escape = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    // Quote if the value contains a comma, double-quote, or newline
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    keys.map(escape).join(","),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Returns a YYYY-MM-DD date string for use in filenames. */
export function todaySlug(): string {
  return new Date().toISOString().slice(0, 10);
}
