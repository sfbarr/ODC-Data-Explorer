import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  createCoordinates,
  getGeographyCentroid,
} from "@vnedyalk0v/react19-simple-maps";

type Grant = {
  State?: string; // e.g., "TX"
  Amount?: number; // already cleaned to number
  ["Project Number"]?: string;
  ["Project Title"]?: string;
};

type CureMapPageProps = {
  grants: Grant[]; // ideally already filtered upstream
};

// TopoJSON state feature ids are FIPS codes. Map them -> USPS abbreviations.
const FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

// Deterministic PRNG so jitter doesn’t reshuffle on every render
function hashStringToUint32(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Gaussian random using Box–Muller (blobby clusters instead of squares)
function randn(rand: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export default function CureMapPage({ grants }: CureMapPageProps) {
  const [geoData, setGeoData] = useState<any | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/states-10m.json")
      .then((r) => {
        if (!r.ok) throw new Error(`states-10m.json failed: ${r.status}`);
        return r.json();
      })
      .then((j) => setGeoData(j))
      .catch((e) => setGeoErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const grantsWithState = useMemo(
    () =>
      grants
        .map((g) => ({
          ...g,
          State: typeof g.State === "string" ? g.State.trim() : g.State,
        }))
        .filter((g) => typeof g.State === "string" && g.State.length === 2),
    [grants]
  );

  if (geoErr) return <div className="canvas">Geo load error: {geoErr}</div>;
  if (!geoData) return <div className="canvas">Loading map…</div>;

  return (
    <div className="canvas" style={{ width: "100%", height: "100%" }}>
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1100 }}
        width={980}
        height={610}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup zoom={1} center={createCoordinates(-96, 38)}>
          <Geographies geography={geoData}>
            {({ geographies }) => {
              // Build abbr -> centroid lookup
              const abbrToCentroid = new Map<string, [number, number]>();

              for (const geo of geographies) {
                const rawId = String((geo as any).id ?? "");
                const fips = rawId.padStart(2, "0");
                const abbr = FIPS_TO_ABBR[fips];
                if (!abbr) continue;

                const c = getGeographyCentroid(geo);
                if (!c) continue;

                abbrToCentroid.set(abbr, [Number(c[0]), Number(c[1])]);
              }

              // Turn grants into dots (Gaussian jitter + radial clamp + unique seed)
              const dots = grantsWithState
                .map((g, i) => {
                  const abbr = g.State!;
                  const center = abbrToCentroid.get(abbr);
                  if (!center) return null;

                  // guarantee uniqueness even if Project Number is missing/repeated
                  const seedKey =
                    g["Project Number"] ||
                    `${abbr}-${g["Project Title"] ?? "untitled"}-${i}`;

                  const rand = mulberry32(hashStringToUint32(seedKey));

                  const STATE_NUDGE: Record<string, { dLon?: number; dLat?: number; maxR?: number }> = {
                    FL: { dLon: 0.85, dLat: -0.95, maxR: 0.85 }, // south + east, tighter spread
                    MI: { dLon: 0.5, dLat: -1.25 }, // nudge south + east to get dots off the mitten’s thumb
                    CA: { dLon: -0.2, dLat: -0.25, maxR: 0 }, // spread north south more
                  }; 
                  
                  const nudge = STATE_NUDGE[abbr] ?? {};
                  const centerLon = center[0] + (nudge.dLon ?? 0);
                  const centerLat = center[1] + (nudge.dLat ?? 0);

                  // Tune these to taste (smaller = tighter)
                  const sigmaLat = 0.35;     // degrees
                  const sigmaLonBase = 0.45; // degrees

                  // keep lon distances more consistent across latitude
                  const lonScale =
                    1 / Math.max(0.35, Math.cos((centerLat * Math.PI) / 180));
                  const sigmaLon = sigmaLonBase * lonScale;

                  // radial clamp so we don't get a rectangular "block" (constant or state-based if available)
                  const maxR = nudge.maxR ?? 1.1;

                  let dLon = 0;
                  let dLat = 0;
                  for (let tries = 0; tries < 6; tries++) {
                    dLon = randn(rand) * sigmaLon;
                    dLat = randn(rand) * sigmaLat;
                    if (dLon * dLon + dLat * dLat <= maxR * maxR) break;
                  }

                  const lon = centerLon + dLon;
                  const lat = centerLat + dLat;

                  const amt = typeof g.Amount === "number" ? g.Amount : 0;

                  // sqrt keeps big grants from getting to big
                  const r = clamp(Math.sqrt(amt) / 1200, 1.2, 4.5);

                  return {
                    key: seedKey,
                    coords: createCoordinates(lon, lat),
                    r,
                    title: g["Project Title"] ?? "",
                    amount: amt,
                    state: abbr,
                  };
                })
                .filter(Boolean) as Array<{
                key: string;
                coords: ReturnType<typeof createCoordinates>;
                r: number;
                title: string;
                amount: number;
                state: string;
              }>;

              return (
                <>
                  {/* Base map */}
                  {geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: "#f8fafc",
                          stroke: "#0f172a",
                          strokeWidth: 1,
                          outline: "none",
                        },
                        hover: {
                          fill: "#e2e8f0",
                          stroke: "#0f172a",
                          strokeWidth: 1,
                          outline: "none",
                        },
                        pressed: {
                          fill: "#e2e8f0",
                          stroke: "#0f172a",
                          strokeWidth: 1,
                          outline: "none",
                        },
                      }}
                    />
                  ))}

                  {/* Dots */}
                  {dots.map((d) => (
                    <Marker key={d.key} coordinates={d.coords}>
                      <title>
                        {d.title
                          ? `${d.title} (${d.state}) — $${d.amount.toLocaleString()}`
                          : `${d.state} — $${d.amount.toLocaleString()}`}
                      </title>
                      <circle r={d.r} fill="#60a5fa" fillOpacity={0.35} stroke="none" />
                    </Marker>
                  ))}
                </>
              );
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}