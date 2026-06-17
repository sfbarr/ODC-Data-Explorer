/**
 * Resolve the (City, State) pairs in public/data/grants.json to real
 * [lng, lat] coordinates and write a compact lookup to
 * public/data/city-coords.json, keyed by "CITY|ST" (uppercased, space-collapsed).
 *
 * Coordinates come from the geonames-based `all-the-cities` dataset (a build-only
 * devDependency — only the small resolved JSON ships to the client). A short
 * manual alias table covers notable misses: NYC boroughs/neighborhoods, places
 * the dataset names differently (e.g. "Saint Louis" vs "St. Louis"), VA-hospital
 * towns, etc. Foreign cities are intentionally left unmapped — the Cure Map uses
 * a U.S.-only projection (geoAlbersUsa) and cannot plot them.
 *
 * Run: npm run build:cities
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cities: Array<{
  name: string;
  country: string;
  adminCode: string;
  population: number;
  loc: { coordinates: [number, number] };
}> = require("all-the-cities");

const norm = (v: unknown) =>
  String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");

// Manual coordinates [lng, lat] for US (City|ST) pairs the dataset misses.
const ALIASES: Record<string, [number, number]> = {
  "NEW YORK|NY": [-73.9857, 40.7484],
  "BRONX|NY": [-73.8648, 40.8448],
  "SAINT LOUIS|MO": [-90.1994, 38.627],
  "HINES|IL": [-87.8367, 41.8642],
  "CHARLESTOWN|MA": [-71.0617, 42.3782],
  "WASHINGTON|DC": [-77.0369, 38.9072],
  "NA|DC": [-77.0369, 38.9072],
  "RESEARCH TRIANGLE PARK|NC": [-78.8616, 35.899],
  "UNIVERSITY PARK|PA": [-77.86, 40.7934],
  "STORRS-MANSFIELD|CT": [-72.2495, 41.8084],
  "NORTH DARTMOUTH|MA": [-71.0742, 41.6362],
};

// Best (highest-population) coordinate for each US "NAME|ST".
const lut = new Map<string, { coord: [number, number]; pop: number }>();
for (const c of cities) {
  if (c.country !== "US") continue;
  const key = norm(c.name) + "|" + c.adminCode;
  const prev = lut.get(key);
  if (!prev || c.population > prev.pop) {
    lut.set(key, { coord: c.loc.coordinates, pop: c.population });
  }
}

const grants: Array<Record<string, unknown>> = JSON.parse(
  fs.readFileSync("public/data/grants.json", "utf-8")
);

const out: Record<string, [number, number]> = {};
const unmapped = new Map<string, number>();
let mappedGrants = 0;
let totalGrants = 0;

for (const r of grants) {
  const city = norm(r.City);
  const st = norm(r.State);
  if (!city || !st) continue;
  totalGrants++;
  const key = city + "|" + st;
  const coord = ALIASES[key] ?? lut.get(key)?.coord;
  if (coord) {
    out[key] = coord;
    mappedGrants++;
  } else {
    unmapped.set(key, (unmapped.get(key) ?? 0) + 1);
  }
}

fs.writeFileSync("public/data/city-coords.json", JSON.stringify(out), "utf-8");

const pct = totalGrants ? ((100 * mappedGrants) / totalGrants).toFixed(1) : "0";
console.log(
  `Wrote ${Object.keys(out).length} city coords -> public/data/city-coords.json`
);
console.log(`Mapped ${mappedGrants}/${totalGrants} grants (${pct}%).`);
const topUnmapped = [...unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
if (topUnmapped.length) {
  console.log("Top unmapped (foreign cities expected here):");
  for (const [k, c] of topUnmapped) console.log(`  ${c}  ${k}`);
}
