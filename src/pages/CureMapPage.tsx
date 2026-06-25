import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  createCoordinates,
} from "@vnedyalk0v/react19-simple-maps";
import SingleSelectStub from "../components/SingleSelectStub";
import GrantsModal from "../components/GrantsModal";
import { slugify, todaySlug } from "../utils/download";

type Grant = {
  State?: string;
  City?: string;
  Organization?: string;
  Agency?: string;
  Amount?: number;
};

type CureMapPageProps = {
  grants: Grant[]; // already filtered upstream by the global sidebar
};

type Metric = "funding" | "count";
type GroupBy = "state" | "city" | "institution" | "agency" | "region";
type MapStyle = "cities" | "states";

type Stat = { funding: number; count: number };

type CityStat = {
  key: string; // "CITY|ST"
  name: string; // "City, ST" (title-cased) for display
  coord: [number, number]; // [lng, lat]
  funding: number;
  count: number;
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

const ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// U.S. Census regions, used for the "Region" grouping and choropleth.
const STATE_TO_REGION: Record<string, string> = {
  CT: "Northeast", ME: "Northeast", MA: "Northeast", NH: "Northeast", RI: "Northeast",
  VT: "Northeast", NJ: "Northeast", NY: "Northeast", PA: "Northeast",
  IL: "Midwest", IN: "Midwest", MI: "Midwest", OH: "Midwest", WI: "Midwest",
  IA: "Midwest", KS: "Midwest", MN: "Midwest", MO: "Midwest", NE: "Midwest",
  ND: "Midwest", SD: "Midwest",
  DE: "South", FL: "South", GA: "South", MD: "South", NC: "South", SC: "South",
  VA: "South", DC: "South", WV: "South", AL: "South", KY: "South", MS: "South",
  TN: "South", AR: "South", LA: "South", OK: "South", TX: "South",
  AZ: "West", CO: "West", ID: "West", MT: "West", NV: "West", NM: "West",
  UT: "West", WY: "West", AK: "West", CA: "West", HI: "West", OR: "West", WA: "West",
};

// Pan/zoom bounds. Center is roughly the geographic middle of the lower 48,
// used as the reset target for geoAlbersUsa.
const MAP_CENTER: [number, number] = [-97, 38];
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const MAP_STYLE_OPTIONS = [
  { value: "cities", label: "Cities (dots)" },
  { value: "states", label: "States (shaded)" },
];

const METRIC_OPTIONS = [
  { value: "funding", label: "Total Funding" },
  { value: "count", label: "Grant Count" },
];

// Normalized "CITY|ST" key matching scripts/build-city-coords.ts.
function cityKey(city: string, state: string): string {
  return (
    city.trim().toUpperCase().replace(/\s+/g, " ") +
    "|" +
    state.trim().toUpperCase()
  );
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Area-proportional bubble radius (px in the 980×580 viewBox): r ∝ √value so
// circle area encodes the metric, with a small floor so tiny cities stay visible.
function bubbleRadius(value: number, maxValue: number): number {
  if (!maxValue || value <= 0) return 2.5;
  return 3 + Math.sqrt(value / maxValue) * 24;
}

const GROUP_OPTIONS = [
  { value: "state", label: "State" },
  { value: "city", label: "City" },
  { value: "institution", label: "Institution" },
  { value: "agency", label: "Agency" },
  { value: "region", label: "Region" },
];

function normalizeFunding(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatFullCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function metricValue(stat: Stat | undefined, metric: Metric): number {
  if (!stat) return 0;
  return metric === "funding" ? stat.funding : stat.count;
}

function formatMetric(value: number, metric: Metric): string {
  return metric === "funding"
    ? formatCompactCurrency(value)
    : `${value.toLocaleString()} grants`;
}

// Sequential blue scale on the dark map. sqrt spreads a heavily skewed
// distribution (a few states dominate total funding) across the ramp.
function fillForRatio(ratio: number): string {
  if (ratio <= 0) return "rgba(255,255,255,0.045)";
  const t = Math.sqrt(Math.min(1, ratio));
  const alpha = 0.16 + t * 0.82;
  return `rgba(96,165,250,${alpha.toFixed(3)})`;
}

export default function CureMapPage({ grants }: CureMapPageProps) {
  const [geoData, setGeoData] = useState<any | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("funding");
  const [groupBy, setGroupBy] = useState<GroupBy>("state");
  const [mapStyle, setMapStyle] = useState<MapStyle>("cities");
  const [cityCoords, setCityCoords] = useState<Record<
    string,
    [number, number]
  > | null>(null);
  // Only the tooltip's text content lives in React state; its position is
  // updated imperatively (below) so moving the mouse never re-renders the map.
  const [hover, setHover] = useState<{ name: string; stat: Stat } | null>(null);
  const [modal, setModal] = useState<{ title: string; grants: Grant[] } | null>(
    null
  );
  // Pan/zoom state for the map. center is in geographic coords; zoom is the
  // d3-zoom scale factor. Updated on drag/wheel (onMoveEnd) and by the buttons.
  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({ coordinates: MAP_CENTER, zoom: 1 });

  const zoomBy = useCallback((factor: number) => {
    setPosition((p) => ({
      ...p,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, p.zoom * factor)),
    }));
  }, []);

  const resetZoom = useCallback(
    () => setPosition({ coordinates: MAP_CENTER, zoom: 1 }),
    []
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });

  // Position the tooltip relative to the chart wrapper without going through
  // React state — this is what keeps hover smooth across all 50 states.
  const moveTooltip = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const x = clientX - (rect?.left ?? 0);
    const y = clientY - (rect?.top ?? 0);
    posRef.current = { x, y };
    const el = tooltipRef.current;
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }, []);

  // Click a state (or region, in region mode) to drill into its grants. The
  // subset is drawn from the already globally-filtered `grants` prop.
  const openSubset = useCallback(
    (abbr: string, region: string | undefined, inRegionMode: boolean) => {
      const rows = grants.filter((g) => {
        const gAbbr = cleanText(g.State).toUpperCase();
        return inRegionMode
          ? region != null && STATE_TO_REGION[gAbbr] === region
          : gAbbr === abbr;
      });
      if (rows.length === 0) return;
      const title = inRegionMode && region ? region : ABBR_TO_NAME[abbr] ?? abbr;
      setModal({ title, grants: rows });
    },
    [grants]
  );

  // Click a city bubble to drill into just that city's grants.
  const openCity = useCallback(
    (key: string, name: string) => {
      const rows = grants.filter(
        (g) => cityKey(cleanText(g.City), cleanText(g.State)) === key
      );
      if (rows.length === 0) return;
      setModal({ title: name, grants: rows });
    },
    [grants]
  );

  useEffect(() => {
    fetch("/data/city-coords.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => setCityCoords(j))
      .catch(() => setCityCoords({})); // degrade gracefully: no bubbles
  }, []);

  useEffect(() => {
    fetch("/data/states-10m.json")
      .then((r) => {
        if (!r.ok) throw new Error(`states-10m.json failed: ${r.status}`);
        return r.json();
      })
      .then((j) => setGeoData(j))
      .catch((e) => setGeoErr(e instanceof Error ? e.message : String(e)));
  }, []);

  // Per-state and per-region rollups drive the choropleth.
  const { stateStats, regionStats } = useMemo(() => {
    const stateStats = new Map<string, Stat>();
    const regionStats = new Map<string, Stat>();

    for (const g of grants) {
      const abbr = cleanText(g.State).toUpperCase();
      if (abbr.length !== 2) continue;
      const amt = normalizeFunding(g.Amount);

      const s = stateStats.get(abbr) ?? { funding: 0, count: 0 };
      s.funding += amt;
      s.count += 1;
      stateStats.set(abbr, s);

      const region = STATE_TO_REGION[abbr];
      if (region) {
        const r = regionStats.get(region) ?? { funding: 0, count: 0 };
        r.funding += amt;
        r.count += 1;
        regionStats.set(region, r);
      }
    }

    return { stateStats, regionStats };
  }, [grants]);

  // Ranked list for the side panel, grouped by the selected dimension.
  const ranked = useMemo(() => {
    const acc = new Map<string, Stat>();

    const add = (key: string, amt: number) => {
      if (!key) return;
      const s = acc.get(key) ?? { funding: 0, count: 0 };
      s.funding += amt;
      s.count += 1;
      acc.set(key, s);
    };

    for (const g of grants) {
      const amt = normalizeFunding(g.Amount);
      const abbr = cleanText(g.State).toUpperCase();

      switch (groupBy) {
        case "state":
          if (abbr.length === 2) add(ABBR_TO_NAME[abbr] ?? abbr, amt);
          break;
        case "city": {
          const city = cleanText(g.City);
          if (city) add(abbr.length === 2 ? `${city}, ${abbr}` : city, amt);
          break;
        }
        case "institution":
          add(cleanText(g.Organization), amt);
          break;
        case "agency":
          add(cleanText(g.Agency), amt);
          break;
        case "region":
          if (STATE_TO_REGION[abbr]) add(STATE_TO_REGION[abbr], amt);
          break;
      }
    }

    return Array.from(acc.entries())
      .map(([name, stat]) => ({ name, stat }))
      .sort((a, b) => metricValue(b.stat, metric) - metricValue(a.stat, metric))
      .slice(0, 15);
  }, [grants, groupBy, metric]);

  // Map fill encodes per-state metric, or per-region metric in region mode.
  const maxMapValue = useMemo(() => {
    const source = groupBy === "region" ? regionStats : stateStats;
    let max = 0;
    for (const stat of source.values()) {
      const v = metricValue(stat, metric);
      if (v > max) max = v;
    }
    return max;
  }, [stateStats, regionStats, groupBy, metric]);

  const totals = useMemo(() => {
    let funding = 0;
    let count = 0;
    for (const stat of stateStats.values()) {
      funding += stat.funding;
      count += stat.count;
    }
    return { funding, count };
  }, [stateStats]);

  // Per-city rollups for the bubble map: aggregate grants whose (City, State)
  // resolves to real coordinates; everything else (foreign cities, Puerto Rico,
  // bad rows) is counted as "off-map" so we can disclose it honestly.
  const { cityStats, offMapGrants, mappedGrants } = useMemo(() => {
    if (!cityCoords) {
      return { cityStats: [] as CityStat[], offMapGrants: 0, mappedGrants: 0 };
    }
    const acc = new Map<string, CityStat>();
    let offMap = 0;
    let mapped = 0;

    for (const g of grants) {
      const city = cleanText(g.City);
      const state = cleanText(g.State);
      if (!city || !state) continue;
      const key = cityKey(city, state);
      const coord = cityCoords[key];
      const amt = normalizeFunding(g.Amount);
      if (!coord) {
        offMap += 1;
        continue;
      }
      mapped += 1;
      const prev =
        acc.get(key) ??
        ({
          key,
          name: `${titleCase(city)}, ${state.toUpperCase()}`,
          coord,
          funding: 0,
          count: 0,
        } as CityStat);
      prev.funding += amt;
      prev.count += 1;
      acc.set(key, prev);
    }

    return {
      cityStats: Array.from(acc.values()),
      offMapGrants: offMap,
      mappedGrants: mapped,
    };
  }, [grants, cityCoords]);

  const maxCityValue = useMemo(() => {
    let max = 0;
    for (const c of cityStats) {
      const v = metric === "funding" ? c.funding : c.count;
      if (v > max) max = v;
    }
    return max;
  }, [cityStats, metric]);

  // Top cities for the side panel (cities mode).
  const cityRanked = useMemo(() => {
    return [...cityStats]
      .map((c) => ({ name: c.name, stat: { funding: c.funding, count: c.count } }))
      .sort((a, b) => metricValue(b.stat, metric) - metricValue(a.stat, metric))
      .slice(0, 15);
  }, [cityStats, metric]);

  const isCities = mapStyle === "cities";
  const panelItems = isCities ? cityRanked : ranked;
  const rankedMax = panelItems.length
    ? metricValue(panelItems[0].stat, metric)
    : 0;
  const panelTitle = isCities
    ? "Cities"
    : GROUP_OPTIONS.find((o) => o.value === groupBy)?.label ?? "";

  // The map subtree is memoized so it is NOT rebuilt when the hover tooltip
  // changes — only when the data/encoding actually changes. This is the core
  // fix for the hover lag and the "stuck highlight" (the map used to re-render
  // all 50 states on every mouse move).
  const mapContent = useMemo(() => {
    if (!geoData) return null;
    const inRegionMode = groupBy === "region";
    return (
      <Geographies geography={geoData}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo) => {
              const fips = String(geo.id ?? "").padStart(2, "0");
              const abbr = FIPS_TO_ABBR[fips];
              const region = abbr ? STATE_TO_REGION[abbr] : undefined;

              const stat = inRegionMode
                ? region
                  ? regionStats.get(region)
                  : undefined
                : abbr
                  ? stateStats.get(abbr)
                  : undefined;

              const value = metricValue(stat, metric);
              const ratio = maxMapValue ? value / maxMapValue : 0;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e: React.MouseEvent) => {
                    if (!abbr) return;
                    moveTooltip(e.clientX, e.clientY);
                    setHover({
                      name:
                        inRegionMode && region ? region : ABBR_TO_NAME[abbr] ?? abbr,
                      stat: stateStats.get(abbr) ?? { funding: 0, count: 0 },
                    });
                  }}
                  onMouseMove={(e: React.MouseEvent) => {
                    if (!abbr) return;
                    moveTooltip(e.clientX, e.clientY);
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    if (!abbr) return;
                    openSubset(abbr, region, inRegionMode);
                  }}
                  style={{
                    default: {
                      fill: fillForRatio(ratio),
                      stroke: "rgba(255,255,255,0.22)",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: fillForRatio(ratio),
                      stroke: "rgba(132,159,244,0.95)",
                      strokeWidth: 1.1,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: fillForRatio(ratio),
                      stroke: "rgba(132,159,244,0.95)",
                      strokeWidth: 1.1,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
    );
  }, [
    geoData,
    groupBy,
    metric,
    maxMapValue,
    stateStats,
    regionStats,
    moveTooltip,
    openSubset,
  ]);

  // City-bubble map: faint state outlines as a base layer, with one circle per
  // city sized by the active metric. Memoized for the same reason as above so
  // hovering never rebuilds the bubbles. Larger bubbles render first so smaller
  // ones stay on top and clickable where they overlap.
  const cityMapContent = useMemo(() => {
    if (!geoData) return null;
    const ordered = [...cityStats].sort(
      (a, b) =>
        (metric === "funding" ? b.funding : b.count) -
        (metric === "funding" ? a.funding : a.count)
    );
    return (
      <>
        <Geographies geography={geoData}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: {
                    fill: "rgba(255,255,255,0.04)",
                    stroke: "rgba(255,255,255,0.16)",
                    strokeWidth: 0.5,
                    outline: "none",
                  },
                  hover: {
                    fill: "rgba(255,255,255,0.04)",
                    stroke: "rgba(255,255,255,0.16)",
                    strokeWidth: 0.5,
                    outline: "none",
                  },
                  pressed: {
                    fill: "rgba(255,255,255,0.04)",
                    stroke: "rgba(255,255,255,0.16)",
                    strokeWidth: 0.5,
                    outline: "none",
                  },
                }}
              />
            ))
          }
        </Geographies>

        {ordered.map((c) => {
          const value = metric === "funding" ? c.funding : c.count;
          const r = bubbleRadius(value, maxCityValue);
          return (
            <Marker
              key={c.key}
              coordinates={createCoordinates(c.coord[0], c.coord[1])}
              onMouseEnter={(e: React.MouseEvent) => {
                moveTooltip(e.clientX, e.clientY);
                setHover({
                  name: c.name,
                  stat: { funding: c.funding, count: c.count },
                });
              }}
              onMouseMove={(e: React.MouseEvent) => moveTooltip(e.clientX, e.clientY)}
              onMouseLeave={() => setHover(null)}
              onClick={() => openCity(c.key, c.name)}
            >
              <circle
                r={r}
                fill="rgba(96,165,250,0.5)"
                stroke="rgba(191,219,254,0.95)"
                strokeWidth={0.6}
                style={{ cursor: "pointer" }}
              />
            </Marker>
          );
        })}
      </>
    );
  }, [geoData, cityStats, metric, maxCityValue, moveTooltip, openCity]);

  if (geoErr) return <div className="canvas">Geo load error: {geoErr}</div>;

  return (
    <main className="canvas">
      <div className="canvasHeader">
        <div className="canvasTitle">Cure Map</div>
        <div className="resultsSummary">
          <span>
            {isCities ? (
              <>
                <strong>{mappedGrants.toLocaleString()}</strong> grants mapped across{" "}
                <strong>{cityStats.length.toLocaleString()}</strong> cities
              </>
            ) : (
              <>
                <strong>{totals.count.toLocaleString()}</strong> grants mapped across{" "}
                <strong>{stateStats.size}</strong> states
              </>
            )}
          </span>
          <div className="fundingTotal">
            {metric === "funding"
              ? `${formatCompactCurrency(totals.funding)} total`
              : `${totals.count.toLocaleString()} grants`}
          </div>
        </div>
      </div>

      <div className="cureMapControls">
        <div className="gapFinderControl">
          <SingleSelectStub
            label="Map style"
            value={mapStyle}
            options={MAP_STYLE_OPTIONS}
            onChange={(v) => setMapStyle(v as MapStyle)}
          />
        </div>
        <div className="gapFinderControl">
          <SingleSelectStub
            label="Metric"
            value={metric}
            options={METRIC_OPTIONS}
            onChange={(v) => setMetric(v as Metric)}
          />
        </div>
        {!isCities ? (
          <div className="gapFinderControl">
            <SingleSelectStub
              label="Group by"
              value={groupBy}
              options={GROUP_OPTIONS}
              onChange={(v) => setGroupBy(v as GroupBy)}
            />
          </div>
        ) : null}
      </div>

      <div className="cureMapBody">
        <div className="cureMapChart" ref={wrapRef}>
          {!geoData || (isCities && !cityCoords) ? (
            <div className="cureMapLoading">Loading map…</div>
          ) : (
            <div className="cureMapFrame">
              <ComposableMap
                projection="geoAlbersUsa"
                projectionConfig={{ scale: 1000 }}
                width={980}
                height={580}
                style={{ width: "100%", height: "100%", display: "block" }}
              >
                <ZoomableGroup
                  center={createCoordinates(
                    position.coordinates[0],
                    position.coordinates[1]
                  )}
                  zoom={position.zoom}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  onMoveEnd={(pos) =>
                    setPosition({
                      coordinates: [pos.coordinates[0], pos.coordinates[1]],
                      zoom: pos.zoom,
                    })
                  }
                >
                  {isCities ? cityMapContent : mapContent}
                </ZoomableGroup>
              </ComposableMap>

              <div className="cureMapZoomControls">
                <button
                  type="button"
                  className="cureMapZoomBtn"
                  aria-label="Zoom in"
                  title="Zoom in"
                  onClick={() => zoomBy(1.5)}
                  disabled={position.zoom >= MAX_ZOOM}
                >
                  +
                </button>
                <button
                  type="button"
                  className="cureMapZoomBtn"
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => zoomBy(1 / 1.5)}
                  disabled={position.zoom <= MIN_ZOOM}
                >
                  −
                </button>
                <button
                  type="button"
                  className="cureMapZoomBtn cureMapZoomReset"
                  aria-label="Reset zoom"
                  title="Reset zoom"
                  onClick={resetZoom}
                  disabled={position.zoom === 1 &&
                    position.coordinates[0] === MAP_CENTER[0] &&
                    position.coordinates[1] === MAP_CENTER[1]}
                >
                  ⤢
                </button>
              </div>
            </div>
          )}

          {hover ? (
            <div
              ref={tooltipRef}
              className="cureMapTooltip"
              style={{ left: posRef.current.x, top: posRef.current.y }}
            >
              <div className="cureMapTooltipName">{hover.name}</div>
              <div className="cureMapTooltipRow">
                {formatFullCurrency(hover.stat.funding)}
              </div>
              <div className="cureMapTooltipRow muted">
                {hover.stat.count.toLocaleString()} grants
              </div>
            </div>
          ) : null}

          <div className="cureMapLegend">
            {isCities ? (
              <>
                <span className="cureMapLegendLabel">
                  {metric === "funding" ? "Less funding" : "Fewer grants"}
                </span>
                <span className="cureMapBubbleLegend" aria-hidden="true">
                  <span className="cureMapBubbleDot small" />
                  <span className="cureMapBubbleDot mid" />
                  <span className="cureMapBubbleDot large" />
                </span>
                <span className="cureMapLegendLabel">
                  {metric === "funding" ? "More funding" : "More grants"}
                </span>
                {offMapGrants > 0 ? (
                  <span className="cureMapOffMapNote">
                    {offMapGrants.toLocaleString()} grants outside the U.S. map
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <span className="cureMapLegendLabel">
                  {metric === "funding" ? "Less funding" : "Fewer grants"}
                </span>
                <span className="cureMapLegendBar" />
                <span className="cureMapLegendLabel">
                  {metric === "funding" ? "More funding" : "More grants"}
                </span>
              </>
            )}
          </div>
        </div>

        <aside className="cureMapPanel">
          <div className="cureMapPanelHeader">
            Top {panelTitle} by {metric === "funding" ? "funding" : "grant count"}
          </div>
          {panelItems.length === 0 ? (
            <div className="cureMapPanelEmpty">No grants in the current view.</div>
          ) : (
            <ol className="cureMapRankList">
              {panelItems.map((item, i) => {
                const value = metricValue(item.stat, metric);
                const pct = rankedMax ? (value / rankedMax) * 100 : 0;
                return (
                  <li key={item.name} className="cureMapRankItem">
                    <div className="cureMapRankTop">
                      <span className="cureMapRankName" title={item.name}>
                        <span className="cureMapRankNum">{i + 1}.</span> {item.name}
                      </span>
                      <span className="cureMapRankValue">
                        {formatMetric(value, metric)}
                      </span>
                    </div>
                    <div className="cureMapRankBarTrack">
                      <div
                        className="cureMapRankBarFill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>

      {modal ? (
        <GrantsModal
          title={modal.title}
          grants={modal.grants}
          downloadFilename={`sci-grants-${slugify(modal.title)}-${todaySlug()}.csv`}
          onClose={() => setModal(null)}
        />
      ) : null}
    </main>
  );
}
