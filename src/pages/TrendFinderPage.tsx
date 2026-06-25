import { useEffect, useMemo, useRef, useState } from "react";
import { svgToImage, triggerDownload, todaySlug } from "../utils/download";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

// Off-screen export render: fixed pixel size, light "publication" theme.
const EXPORT_W = 1000;
const EXPORT_H = 540;

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
  const exportRef = useRef<HTMLDivElement>(null);

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

  // Compose a standalone, report-ready figure: the light-theme export chart
  // (rendered off-screen) framed with a title, subtitle, and footer on white.
  const downloadChart = async () => {
    const svg = exportRef.current?.querySelector("svg");
    if (!svg) return;

    const img = await svgToImage(svg as SVGSVGElement);

    const scale = 2;
    const pad = 32;
    const titleBand = 64;
    const footerBand = 34;
    const canvasW = EXPORT_W + pad * 2;
    const canvasH = titleBand + EXPORT_H + footerBand + pad;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW * scale;
    canvas.height = canvasH * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const fontStack =
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = `600 22px ${fontStack}`;
    ctx.textBaseline = "alphabetic";
    const title =
      metric === "funding"
        ? "SCI Research Grant Funding by Fiscal Year"
        : "SCI Research Grant Count by Fiscal Year";
    ctx.fillText(title, pad, pad + 8);

    // Subtitle
    ctx.fillStyle = "#6b7280";
    ctx.font = `400 13px ${fontStack}`;
    const subtitle =
      metric === "funding"
        ? `${grants.length.toLocaleString()} grants in view · ${formatFullCurrency(
            totalFunding
          )} total`
        : `${grants.length.toLocaleString()} grants in view`;
    ctx.fillText(subtitle, pad, pad + 30);

    // Chart
    ctx.drawImage(img, pad, titleBand, EXPORT_W, EXPORT_H);

    // Footer
    ctx.fillStyle = "#9ca3af";
    ctx.font = `400 11px ${fontStack}`;
    ctx.fillText(
      `SCI Research Grants Explorer · generated ${todaySlug()}`,
      pad,
      canvasH - pad + 16
    );

    const metricSlug = metric === "funding" ? "funding" : "grant-count";
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, `sci-grants-trend-${metricSlug}-${todaySlug()}.png`);
    }, "image/png");
  };

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
        <button
          type="button"
          className="btn trendFinderDownloadBtn"
          onClick={downloadChart}
          disabled={chartData.length === 0}
          title="Download the chart as a PNG image"
        >
          Download PNG
        </button>
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

      {/* Off-screen light-theme render used only for the PNG export. Fixed pixel
          size + animation disabled so it's fully drawn and ready to rasterize. */}
      <div
        ref={exportRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: EXPORT_W,
          height: EXPORT_H,
          pointerEvents: "none",
        }}
      >
        <LineChart
          width={EXPORT_W}
          height={EXPORT_H}
          data={chartData}
          margin={{ top: 16, right: 40, left: 24, bottom: 44 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe0e8" />
          <XAxis
            dataKey="year"
            stroke="#4b5563"
            tick={{ fill: "#374151", fontSize: 13 }}
            tickLine={{ stroke: "#9ca3af" }}
            axisLine={{ stroke: "#9ca3af" }}
          >
            <Label value="Fiscal Year" position="insideBottom" offset={-24} fill="#374151" />
          </XAxis>
          <YAxis
            tickFormatter={yAxisFormatter}
            stroke="#4b5563"
            tick={{ fill: "#374151", fontSize: 13 }}
            tickLine={{ stroke: "#9ca3af" }}
            axisLine={{ stroke: "#9ca3af" }}
            width={84}
          >
            <Label
              value={metric === "funding" ? "Total Funding (USD)" : "Grant Count"}
              angle={-90}
              position="insideLeft"
              offset={-4}
              style={{ textAnchor: "middle" }}
              fill="#374151"
            />
          </YAxis>
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </div>
    </main>
  );
}
