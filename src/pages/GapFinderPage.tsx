import { useMemo, useState } from "react";
import RangeSlider from "../components/RangeSlider";

type GrantRecord = Record<string, unknown>;

type GapFinderPageProps = {
  grants: GrantRecord[];
};

type AxisOption = {
  key: string;
  label: string;
};

type MetricKey = "count" | "funding";


type CellStats = {
  count: number;
  funding: number;
};

type MatrixBuildResult = {
  xLabels: string[];
  yLabels: string[];
  matrix: Record<string, Record<string, CellStats>>;
  rowTotals: Record<string, CellStats>;
  colTotals: Record<string, CellStats>;
  maxCount: number;
  maxFunding: number;
};

type YearRange = {
  min: number;
  max: number;
};

const AXIS_OPTIONS: AxisOption[] = [
  { key: "Objective - General", label: "Objective" },
  { key: "Intervention", label: "Intervention" },
  { key: "Readiness", label: "Readiness" },
];

const DEFAULT_X_KEY = "Objective - General";
const DEFAULT_Y_KEY = "Intervention";

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

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function getCellStyle(value: number, maxValue: number): React.CSSProperties {
  if (!value || !maxValue) {
    return {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.55)",
    };
  }

  const ratio = clamp01(value / maxValue);
  const alpha = 0.12 + ratio * 0.6;
  const scale = 0.98 + ratio * 0.03;

  return {
    background: `rgba(123, 92, 255, ${alpha.toFixed(3)})`,
    border: `1px solid rgba(180, 160, 255, ${(0.12 + ratio * 0.45).toFixed(3)})`,
    color: ratio > 0.55 ? "#ffffff" : "rgba(255,255,255,0.92)",
    transform: `scale(${scale.toFixed(3)})`,
  };
}

function buildMatrix(
  grants: GrantRecord[],
  xKey: string,
  yKey: string,
  maxColumns: number,
  maxRows: number
): MatrixBuildResult {
  const matrix: Record<string, Record<string, CellStats>> = {};
  const rowTotals: Record<string, CellStats> = {};
  const colTotals: Record<string, CellStats> = {};

  for (const grant of grants) {
    const xValue = normalizeCategory(grant[xKey]);
    const yValue = normalizeCategory(grant[yKey]);
    const funding = normalizeFunding(grant.Amount);

    if (!matrix[yValue]) matrix[yValue] = {};
    if (!matrix[yValue][xValue]) matrix[yValue][xValue] = { count: 0, funding: 0 };
    if (!rowTotals[yValue]) rowTotals[yValue] = { count: 0, funding: 0 };
    if (!colTotals[xValue]) colTotals[xValue] = { count: 0, funding: 0 };

    matrix[yValue][xValue].count += 1;
    matrix[yValue][xValue].funding += funding;
    rowTotals[yValue].count += 1;
    rowTotals[yValue].funding += funding;
    colTotals[xValue].count += 1;
    colTotals[xValue].funding += funding;
  }

  const xEntries = Object.entries(colTotals);
  const yEntries = Object.entries(rowTotals);


  xEntries.sort(
    (a, b) => b[1].funding - a[1].funding || b[1].count - a[1].count || a[0].localeCompare(b[0])
  );
  yEntries.sort(
    (a, b) => b[1].funding - a[1].funding || b[1].count - a[1].count || a[0].localeCompare(b[0])
  );
  
  const xLabels = xEntries.slice(0, maxColumns).map(([label]) => label);
  const yLabels = yEntries.slice(0, maxRows).map(([label]) => label);

  let maxCount = 0;
  let maxFunding = 0;

  for (const yLabel of yLabels) {
    for (const xLabel of xLabels) {
      const cell = matrix[yLabel]?.[xLabel];
      if (!cell) continue;
      if (cell.count > maxCount) maxCount = cell.count;
      if (cell.funding > maxFunding) maxFunding = cell.funding;
    }
  }

  return {
    xLabels,
    yLabels,
    matrix,
    rowTotals,
    colTotals,
    maxCount,
    maxFunding,
  };
}

function getAlternateAxisKey(currentKey: string): string {
  return AXIS_OPTIONS.find((option) => option.key !== currentKey)?.key ?? currentKey;
}

export default function GapFinderPage({ grants }: GapFinderPageProps) {
  const allYears = useMemo(() => {
    const years = grants
      .map((grant) => normalizeYear(grant["Fiscal Year"]))
      .filter((year): year is number => year !== null)
      .sort((a, b) => a - b);

    return Array.from(new Set(years));
  }, [grants]);

  const yearDomain = useMemo(() => {
    const min = allYears[0] ?? 2005;
    const max = allYears[allYears.length - 1] ?? 2026;
    return { min, max };
  }, [allYears]);

  const stateOptions = useMemo(() => {
    const states = grants.map((grant) => normalizeCategory(grant.State));
    return Array.from(new Set(states)).sort((a, b) => a.localeCompare(b));
  }, [grants]);

  const agencyOptions = useMemo(() => {
    const agencies = grants.map((grant) => normalizeCategory(grant.Agency));
    return Array.from(new Set(agencies)).sort((a, b) => a.localeCompare(b));
  }, [grants]);

  const [xKey, setXKey] = useState<string>(DEFAULT_X_KEY);
  const [yKey, setYKey] = useState<string>(DEFAULT_Y_KEY);
  const [metric, setMetric] = useState<MetricKey>("funding");
  const [stateFilter, setStateFilter] = useState<string>("All states");
  const [agencyFilter, setAgencyFilter] = useState<string>("All agencies");
  const [yearRange, setYearRange] = useState<YearRange>(yearDomain);

  const filteredGrants = useMemo(() => {
    return grants.filter((grant) => {
      const year = normalizeYear(grant["Fiscal Year"]);
      const state = normalizeCategory(grant.State);
      const agency = normalizeCategory(grant.Agency);

      if (stateFilter !== "All states" && state !== stateFilter) return false;
      if (agencyFilter !== "All agencies" && agency !== agencyFilter) return false;
      if (year === null) return false;
      if (year < yearRange.min || year > yearRange.max) return false;

      return true;
    });
  }, [grants, stateFilter, agencyFilter, yearRange]);

  const matrixData = useMemo(
    () => buildMatrix(filteredGrants, xKey, yKey, 12, 18),
    [filteredGrants, xKey, yKey]
  );

  const activeMax = metric === "funding" ? matrixData.maxFunding : matrixData.maxCount;
  const totalFilteredCount = filteredGrants.length;
  const totalFilteredFunding = filteredGrants.reduce(
    (sum, grant) => sum + normalizeFunding(grant.Amount),
    0
  );

  return (
    <main className="canvas">
      <div className="canvasHeader">
        <div className="canvasTitle">Gap Finder</div>
        <div className="resultsSummary gapFinderSummary">
          <span>
            Cross-tab coverage across <strong>{AXIS_OPTIONS.find((option) => option.key === xKey)?.label}</strong> and{" "}
            <strong>{AXIS_OPTIONS.find((option) => option.key === yKey)?.label}</strong>
          </span>
          <div className="fundingTotal">
            {metric === "funding"
              ? `${formatCompactCurrency(totalFilteredFunding)} shown`
              : `${totalFilteredCount.toLocaleString()} grants shown`}
          </div>
        </div>
      </div>

      <div className="gapFinderControls">
        <label htmlFor="gapfinder-x-axis" className="gapFinderControl">
          <span>X Axis</span>
          <select
            id="gapfinder-x-axis"
            name="gapfinder-x-axis"
            className="searchInput"
            value={xKey}
            onChange={(e) => {
              const nextX = e.target.value;
              setXKey(nextX);
              if (nextX === yKey) setYKey(getAlternateAxisKey(nextX));
            }}
          >
            {AXIS_OPTIONS.filter((option) => option.key !== yKey || option.key === xKey).map((option) => (
              <option key={`x-${option.key}`} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="gapfinder-y-axis" className="gapFinderControl">
          <span>Y Axis</span>
          <select
            id="gapfinder-y-axis"
            name="gapfinder-y-axis"
            className="searchInput"
            value={yKey}
            onChange={(e) => {
              const nextY = e.target.value;
              setYKey(nextY);
              if (nextY === xKey) setXKey(getAlternateAxisKey(nextY));
            }}
          >
            {AXIS_OPTIONS.filter((option) => option.key !== xKey || option.key === yKey).map((option) => (
              <option key={`y-${option.key}`} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="gapfinder-state-filter" className="gapFinderControl">
          <span>State</span>
          <select
            id="gapfinder-state-filter"
            name="gapfinder-state-filter"
            className="searchInput"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="All states">All states</option>
            {stateOptions.map((state) => (
              <option key={`state-${state}`} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="gapfinder-agency-filter" className="gapFinderControl">
          <span>Agency</span>
          <select
            id="gapfinder-agency-filter"
            name="gapfinder-agency-filter"
            className="searchInput"
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
          >
            <option value="All agencies">All agencies</option>
            {agencyOptions.map((agency) => (
              <option key={`agency-${agency}`} value={agency}>
                {agency}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="gapfinder-metric" className="gapFinderControl">
          <span>Metric</span>
          <select
            id="gapfinder-metric"
            name="gapfinder-metric"
            className="searchInput"
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
          >
            <option value="funding">Total Funding</option>
            <option value="count">Grant Count</option>
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

      <div className="gapFinderMetaRow">
        <span>
          Filtered to <strong>{totalFilteredCount.toLocaleString()}</strong> grants from <strong>{yearRange.min}</strong> to <strong>{yearRange.max}</strong>
        </span>
        <span>
          State: <strong>{stateFilter}</strong>
        </span>
        <span>
          Agency: <strong>{agencyFilter}</strong>
        </span>
        <span>
          Darker cells = more {metric === "funding" ? "funding" : "grants"}
        </span>
      </div>

      <div className="gapFinderTableShell">
        <table
          className="gapFinderTable"
          style={{ minWidth: `${Math.max(860, matrixData.xLabels.length * 150)}px` }}
        >
          <thead>
            <tr>
              <th className="gapFinderCornerHeader">
                {AXIS_OPTIONS.find((option) => option.key === yKey)?.label} ↓ / {AXIS_OPTIONS.find((option) => option.key === xKey)?.label} →
              </th>
              {matrixData.xLabels.map((xLabel) => (
                <th key={xLabel} className="gapFinderColumnHeader" title={xLabel}>
                  <div className="gapFinderHeaderLabel">{xLabel}</div>
                  <div className="gapFinderHeaderSubtext">
                    {metric === "funding"
                      ? formatCompactCurrency(matrixData.colTotals[xLabel]?.funding ?? 0)
                      : `${(matrixData.colTotals[xLabel]?.count ?? 0).toLocaleString()} grants`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.yLabels.map((yLabel) => {
              const rowTotal = matrixData.rowTotals[yLabel] ?? { count: 0, funding: 0 };
              return (
                <tr key={yLabel}>
                  <th className="gapFinderRowHeader" title={yLabel}>
                    <div className="gapFinderHeaderLabel">{yLabel}</div>
                    <div className="gapFinderHeaderSubtext">
                      {metric === "funding"
                        ? formatCompactCurrency(rowTotal.funding)
                        : `${rowTotal.count.toLocaleString()} grants`}
                    </div>
                  </th>
                  {matrixData.xLabels.map((xLabel) => {
                    const cell = matrixData.matrix[yLabel]?.[xLabel] ?? { count: 0, funding: 0 };
                    const primaryValue = metric === "funding" ? cell.funding : cell.count;
                    const style = getCellStyle(primaryValue, activeMax);

                    return (
                      <td
                        key={`${yLabel}-${xLabel}`}
                        className="gapFinderCell"
                        title={`${yLabel} × ${xLabel}\n${cell.count.toLocaleString()} grants\n${formatCurrency(cell.funding)}`}
                      >
                        <div
                          className="gapFinderCellCard"
                          style={{
                            ...style,
                          }}
                        >
                          <div className="gapFinderCellCount">
                            {cell.count.toLocaleString()} grants
                          </div>
                          <div className="gapFinderCellValue">
                            {metric === "funding"
                              ? formatCompactCurrency(cell.funding)
                              : cell.count.toLocaleString()}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}