import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import RangeSlider from "../components/RangeSlider";

type GrantRecord = Record<string, unknown>;

type TrendFinderPageProps = {
  grants: GrantRecord[];
};

type MetricKey = "funding" | "count";

type CategoryOption = {
  key: string;
  label: string;
};

type YearRange = {
  min: number;
  max: number;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: "Agency", label: "Agency" },
  { key: "Intervention", label: "Intervention" },
  { key: "Objective - General", label: "Objective" },
  { key: "Readiness", label: "Readiness" },
];

// Color palette that fits the dark purple/blue app theme
const LINE_COLORS = [
  "#7b9ef0",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#60a5fa",
  "#f87171",
  "#4ade80",
  "#c084fc",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#a3e635",
  "#2dd4bf",
  "#facc15",
  "#818cf8",
  "#f9a8d4",
  "#6ee7b7",
  "#fca5a5",
  "#93c5fd",
  "#d8b4fe",
  "#fdba74",
  "#86efac",
];

function normalizeCategory(value: unknown): string {
  if (value === null || value === undefined) return "Unspecified";
  const text = String(value).trim();
  return text.length ? text : "Unspecified";
}

function normalizeFunding(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeYear(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

// Build: [{ year: 2005, "NIH": 123000, "DOD": 456000 }, ...]
function buildSeriesData(
  grants: GrantRecord[],
  categoryKey: string,
  metric: MetricKey,
  yearRange: YearRange,
  topN: number | null
): { chartData: Record<string, number | string>[]; seriesKeys: string[] } {
  // Accumulate: map[year][categoryValue] = { funding, count }
  const acc: Record<number, Record<string, { funding: number; count: number }>> = {};

  for (const grant of grants) {
    const year = normalizeYear(grant["Fiscal Year"]);
    if (year === null || year < yearRange.min || year > yearRange.max) continue;

    const catValue = normalizeCategory(grant[categoryKey]);
    const funding = normalizeFunding(grant.Amount);

    if (!acc[year]) acc[year] = {};
    if (!acc[year][catValue]) acc[year][catValue] = { funding: 0, count: 0 };

    acc[year][catValue].funding += funding;
    acc[year][catValue].count += 1;
  }

  // Collect all unique category values, sorted by total descending
  const totalByCatValue: Record<string, number> = {};
  for (const yearData of Object.values(acc)) {
    for (const [catValue, stats] of Object.entries(yearData)) {
      if (!totalByCatValue[catValue]) totalByCatValue[catValue] = 0;
      totalByCatValue[catValue] += metric === "funding" ? stats.funding : stats.count;
    }
  }

  const seriesKeys = Object.keys(totalByCatValue)
    .sort((a, b) => totalByCatValue[b] - totalByCatValue[a])
    .slice(0, topN ?? undefined);

  // Build sorted list of years in range
  const years: number[] = [];
  for (let y = yearRange.min; y <= yearRange.max; y++) {
    years.push(y);
  }

  const chartData = years.map((year) => {
    const row: Record<string, number | string> = { year };
    for (const key of seriesKeys) {
      const stats = acc[year]?.[key];
      row[key] = stats ? (metric === "funding" ? stats.funding : stats.count) : 0;
    }
    return row;
  });

  return { chartData, seriesKeys };
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  metric: MetricKey;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const sorted = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="trendTooltip">
      <div className="trendTooltipYear">FY {label}</div>
      {sorted.map((entry) => (
        <div key={entry.dataKey} className="trendTooltipRow">
          <span className="trendTooltipDot" style={{ background: entry.color }} />
          <span className="trendTooltipLabel">{entry.dataKey}</span>
          <span className="trendTooltipValue">
            {metric === "funding"
              ? formatFullCurrency(entry.value)
              : `${entry.value.toLocaleString()} grants`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TrendFinderPage({ grants }: TrendFinderPageProps) {
  const allYears = useMemo(() => {
    const years = grants
      .map((g) => normalizeYear(g["Fiscal Year"]))
      .filter((y): y is number => y !== null);
    return Array.from(new Set(years)).sort((a, b) => a - b);
  }, [grants]);

  const yearDomain = useMemo(() => {
    const min = allYears[0] ?? 2005;
    const max = allYears[allYears.length - 1] ?? 2026;
    return { min, max };
  }, [allYears]);

  const [categoryKey, setCategoryKey] = useState<string>("Agency");
  const [metric, setMetric] = useState<MetricKey>("funding");
  const [yearRange, setYearRange] = useState<YearRange>(yearDomain);
  const [topN, setTopN] = useState<number | null>(10);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { chartData, seriesKeys } = useMemo(
    () => buildSeriesData(grants, categoryKey, metric, yearRange, topN),
    [grants, categoryKey, metric, yearRange, topN]
  );

  // Grand total for header summary
  const grandTotal = useMemo(() => {
    return grants
      .filter(() => true) // all grants, pre-year filter
      .reduce((sum, g) => {
        const year = normalizeYear(g["Fiscal Year"]);
        if (year === null || year < yearRange.min || year > yearRange.max) return sum;
        return sum + normalizeFunding(g.Amount);
      }, 0);
  }, [grants, yearRange]);

  const totalGrantsInRange = useMemo(() => {
    return grants.filter((g) => {
      const year = normalizeYear(g["Fiscal Year"]);
      return year !== null && year >= yearRange.min && year <= yearRange.max;
    }).length;
  }, [grants, yearRange]);

  const yAxisFormatter = (value: number) =>
    metric === "funding" ? formatCompactCurrency(value) : value.toLocaleString();

  const categoryLabel =
    CATEGORY_OPTIONS.find((o) => o.key === categoryKey)?.label ?? categoryKey;

  return (
    <main className="canvas" style={{ overflow: "visible" }}>
      <div className="canvasHeader">
        <div className="canvasTitle">Trend Finder</div>
        <div className="resultsSummary trendFinderSummary">
          <span>
            Trends by <strong>{categoryLabel}</strong> — {seriesKeys.length} series
          </span>
          <div className="fundingTotal">
            {metric === "funding"
              ? `${formatCompactCurrency(grandTotal)} total`
              : `${totalGrantsInRange.toLocaleString()} grants`}
          </div>
        </div>
      </div>

      <div className="trendFinderControls">
        <label htmlFor="trend-category" className="gapFinderControl">
          <span>Category</span>
          <select
            id="trend-category"
            name="trend-category"
            className="searchInput"
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="trend-metric" className="gapFinderControl">
          <span>Metric</span>
          <select
            id="trend-metric"
            name="trend-metric"
            className="searchInput"
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
          >
            <option value="funding">Total Funding</option>
            <option value="count">Grant Count</option>
          </select>
        </label>

        <label htmlFor="trend-topn" className="gapFinderControl">
          <span>Show top</span>
          <select
            id="trend-topn"
            name="trend-topn"
            className="searchInput"
            value={topN ?? "all"}
            onChange={(e) => {
              const v = e.target.value;
              setTopN(v === "all" ? null : Number(v));
            }}
          >
            <option value={3}>Top 3</option>
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value="all">All</option>
          </select>
        </label>

        <div className="gapFinderControl gapFinderYearControl">
          <span>Fiscal Year Range</span>
          <RangeSlider
            label="Year"
            domain={yearDomain}
            step={1}
            onChange={(nextRange) => setYearRange(nextRange)}
          />
        </div>
      </div>

      <div className="trendFinderChartShell">
        <div className="trendFinderChartArea">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={isMobile
              ? { top: 8, right: 8, left: 0, bottom: 8 }
              : { top: 10, right: 24, left: 16, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.07)"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            />
            <YAxis
              tickFormatter={yAxisFormatter}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fill: "rgba(255,255,255,0.72)", fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 52 : 84}
            />
            <Tooltip
              content={<CustomTooltip metric={metric} />}
              cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
              wrapperStyle={{ zIndex: 9999 }}
            />
            {seriesKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </div>

        <div className="trendFinderLegend">
          {seriesKeys.map((key, i) => (
            <div key={key} className="trendFinderLegendItem">
              <span
                className="trendFinderLegendSwatch"
                style={{ background: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              <span className="trendFinderLegendLabel">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
