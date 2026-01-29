import fs from "node:fs";
import path from "node:path";
import * as XLSXNS from "xlsx";
const XLSX: any = (XLSXNS as any).default ?? XLSXNS;

type Row = Record<string, unknown>;

function normalizeHeader(h: string) {
  return h.trim().replace(/\s+/g, " ");
}

function toStringSafe(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return String(v);
}

// For our year sliders
function parseIntSafe(v: unknown): number | null {
  const s = toStringSafe(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
// for our money/funding sliders
function parseMoneySafe(v: unknown): number | null {
  const s = toStringSafe(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitOutsideParens(s: string, delims: Set<string>): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;

  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);

    const isDelim = depth === 0 && delims.has(ch);
    if (isDelim) {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
    } else {
      cur += ch;
    }
  }

  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

/**
 * Split a cell that might contain:
 * - JSON array string: ["A","B"]
 * - multi-valued categorical strings
 * - single value
 */
function explodeCell(v: unknown, column: string): string[] {
  const s = toStringSafe(v).trim();
  if (!s) return [];

  // Try JSON array
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr.map((x) => toStringSafe(x).trim()).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  // If it looks like a number/currency (often contains thousands separators), treat as a single value.
  // This prevents "$123,456" from being split into "123" and "456".
  const numericLike = /^[\$€£]?\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*$|^\s*\d+(?:\.\d+)?\s*$/;
  if (numericLike.test(s)) return [s];

  const col = column.toLowerCase();

  // Default: safe delimiters only (do NOT split on commas by default)
  // This keeps values like `Clinical (Phase I, II, FS)` intact.
  let delims = new Set([";", "|", "\n"]);

  // Columns that intentionally use comma-separated lists
  if (col.includes("agency ic") || col.includes("objective") || col.includes("intervention")) {
    delims = new Set([",", ";", "|", "\n"]);
  }

  return splitOutsideParens(s, delims);
}

/**
 * Normalize for dedupe: trim, collapse spaces. Optional: case-insensitive.
 */
function normForSet(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function extractUniqueOptions(rows: Row[], column: string): string[] {
  const set = new Set<string>();

  for (const r of rows) {
    const raw = r[column];
    for (const part of explodeCell(raw, column)) {
      const n = normForSet(part);
      if (n) set.add(n);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

const FILTERABLE_COLUMNS = new Set([
  "Agency",
  "Agency IC",
  "Objective - General",
  "Objective - Specific",
  "Intervention",
  "Readiness",
  "State",
]);

function shouldIncludeOptionsColumn(_rows: Row[], column: string): boolean {
  return FILTERABLE_COLUMNS.has(column);
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: tsx scripts/build-data.ts <path-to-xlsx-or-csv>");
    process.exit(1);
  }

  const abs = path.resolve(input);
  const wb = XLSX.readFile(abs, { cellText: true, cellDates: true });

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Convert to JSON rows
  const rawRows = XLSX.utils.sheet_to_json(ws, {
    defval: "",
    raw: false,
  }) as Row[];

  // Normalize headers
  const rows: Row[] = rawRows.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) {
      out[normalizeHeader(k)] = v;
    }

    // overwrite the values used in the future range sliders to be numbers
    if ("Fiscal Year" in out) out["Fiscal Year"] = parseIntSafe(out["Fiscal Year"]) ?? out["Fiscal Year"];
    if ("Amount" in out) out["Amount"] = parseMoneySafe(out["Amount"]) ?? out["Amount"];

    return out;
  });

  // Columns present
  const columns = Array.from(
    rows.reduce((acc, r) => {
      for (const k of Object.keys(r)) acc.add(k);
      return acc;
    }, new Set<string>())
  ).sort();

  // Build options map for categorical columns only (skip money/free-text/high-cardinality columns)
  const options: Record<string, string[]> = {};
  for (const col of columns) {
    if (!shouldIncludeOptionsColumn(rows, col)) continue;
    options[col] = extractUniqueOptions(rows, col);
  }

  fs.writeFileSync("public/data/grants.json", JSON.stringify(rows, null, 2), "utf-8");
  fs.writeFileSync("public/data/options.json", JSON.stringify(options, null, 2), "utf-8");

  console.log(`Wrote ${rows.length} rows -> public/data/grants.json`);
  console.log(`Wrote options for ${columns.length} columns -> public/data/options.json`);
}

main();