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

type GrantRecord = Record<string, unknown>;

type TrendFinderPageProps = {
  grants: GrantRecord[]; // pre-filtered by global filters in App
};

type MetricKey = "funding" | "count";

function normalizeFunding(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeYear(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
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

// Aggregate pre-filtered grants by fiscal year
function buildYearlyData(
  grants: GrantRecord[],
  metric: MetricKey
): { year: number; value: number }[] {
  const acc: Record<number, { funding: number; count: number }> = {};

  for (const grant of grants) {
    const year = normalizeYear(grant["Fiscal Year"]);
    if (year === null) continue;
    if (!acc[year]) acc[year] = { funding: 0, count: 0 };
    acc[year].funding += normalizeFunding(grant.Amount);
    acc[year].count += 1;
  }

  const years = Object.keys(acc)
    .map(Number)
    .sort((a, b) => a - b);

  return years.map((year) => ({
    year,
    value: metric === "funding" ? acc[year].funding : acc[year].count,
  }));
}

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
  return (
    <div className="trendTooltip">
      <div className="trendTooltipYear">FY {label}</div>
      <div className="trendTooltipRow">
        <span className="trendTooltipValue">
          {metric === "funding"
            ? formatFullCurrency(payload[0].value)
            : `${payload[0].value.toLocaleString()} grants`}
        </span>
      </div>
    </div>
  );
}

export default function TrendFinderPage({ grants }: TrendFinderPageProps) {
  const [metric, setMetric] = useState<MetricKey>("funding");

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chartData = useMemo(
    () => buildYearlyData(grants, metric),
    [grants, metric]
  );

  const totalFunding = useMemo(
    () => grants.reduce((sum, g) => sum + normalizeFunding(g.Amount), 0),
    [grants]
  );

  const yAxisFormatter = (value: number) =>
    metric === "funding" ? formatCompactCurrency(value) : value.toLocaleString();

  return (
    <main className="canvas" style={{ overflow: "visible" }}>
      <div className="canvasHeader">
        <div className="canvasTitle">Trend Finder</div>
        <div className="resultsSummary trendFinderSummary">
          <span>
            <strong>{grants.length.toLocaleString()}</strong> grants in view
          </span>
          <div className="fundingTotal">
            {metric === "funding"
              ? `${formatCompactCurrency(totalFunding)} total`
              : `${grants.length.toLocaleString()} grants`}
          </div>
        </div>
      </div>

      <div className="trendFinderControls">
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
      </div>

      <div className="trendFinderChartShell">
        <div className="trendFinderChartArea">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={
                isMobile
                  ? { top: 8, right: 8, left: 0, bottom: 8 }
                  : { top: 10, right: 24, left: 16, bottom: 10 }
              }
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
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7b9ef0"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
