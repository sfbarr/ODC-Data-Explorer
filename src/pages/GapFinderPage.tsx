import { useMemo, useState } from "react";
import RangeSlider from "../components/RangeSlider";
import SingleSelectStub from "../components/SingleSelectStub";
import { downloadCsv, todaySlug } from "../utils/download";

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
  { key: "Objective - General",     label: "Objective (General)" },
  { key: "Objective - Specific",    label: "Objective (Specific)" },
  { key: "Intervention - General",  label: "Intervention (General)" },
  { key: "Intervention - Specific", label: "Intervention (Specific)" },
  { key: "Readiness - General",     label: "Readiness (General)" },
  { key: "Readiness - Specific",    label: "Readiness (Specific)" },
];

const DEFAULT_X_KEY = "Objective - General";
const DEFAULT_Y_KEY = "Intervention - General";

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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "all"
  );
}

// Tiny inline download glyph used on cells and row/column headers.
function DownloadButton({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="gapFinderDownloadBtn"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 2v8M5 7l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.5 13.5h9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
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

  // Per-cell / per-row / per-column exports of the underlying grant records.
  const downloadCell = (xLabel: string, yLabel: string) => {
    const rows = filteredGrants.filter(
      (g) =>
        normalizeCategory(g[xKey]) === xLabel &&
        normalizeCategory(g[yKey]) === yLabel
    );
    downloadCsv(rows, `sci-grants-${slugify(yLabel)}-x-${slugify(xLabel)}-${todaySlug()}.csv`);
  };

  const downloadColumn = (xLabel: string) => {
    const rows = filteredGrants.filter((g) => normalizeCategory(g[xKey]) === xLabel);
    downloadCsv(rows, `sci-grants-${slugify(xLabel)}-${todaySlug()}.csv`);
  };

  const downloadRow = (yLabel: string) => {
    const rows = filteredGrants.filter((g) => normalizeCategory(g[yKey]) === yLabel);
    downloadCsv(rows, `sci-grants-${slugify(yLabel)}-${todaySlug()}.csv`);
  };

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
          <div className="gapFinderHeaderRight">
            <span className="fundingTotal" style={{ marginLeft: 0 }}>
              {metric === "funding"
                ? `${formatCompactCurrency(totalFilteredFunding)} shown`
                : `${totalFilteredCount.toLocaleString()} grants shown`}
            </span>
            <button
              type="button"
              className="btn"
              disabled={filteredGrants.length === 0}
              onClick={() => downloadCsv(filteredGrants, `sci-grants-gapfinder-${todaySlug()}.csv`)}
            >
              Download {filteredGrants.length > 0 ? `${filteredGrants.length.toLocaleString()} ` : ""}CSV
            </button>
          </div>
        </div>
      </div>

      <div className="gapFinderControls">
        <div className="gapFinderControl">
          <SingleSelectStub
            label="X Axis"
            value={xKey}
            options={AXIS_OPTIONS.filter(
              (option) => option.key !== yKey || option.key === xKey
            ).map((option) => ({ value: option.key, label: option.label }))}
            onChange={(nextX) => {
              setXKey(nextX);
              if (nextX === yKey) setYKey(getAlternateAxisKey(nextX));
            }}
          />
        </div>

        <div className="gapFinderControl">
          <SingleSelectStub
            label="Y Axis"
            value={yKey}
            options={AXIS_OPTIONS.filter(
              (option) => option.key !== xKey || option.key === yKey
            ).map((option) => ({ value: option.key, label: option.label }))}
            onChange={(nextY) => {
              setYKey(nextY);
              if (nextY === xKey) setXKey(getAlternateAxisKey(nextY));
            }}
          />
        </div>

        <div className="gapFinderControl">
          <SingleSelectStub
            label="State"
            value={stateFilter}
            options={[
              { value: "All states", label: "All states" },
              ...stateOptions.map((s) => ({ value: s, label: s })),
            ]}
            onChange={setStateFilter}
          />
        </div>

        <div className="gapFinderControl">
          <SingleSelectStub
            label="Agency"
            value={agencyFilter}
            options={[
              { value: "All agencies", label: "All agencies" },
              ...agencyOptions.map((a) => ({ value: a, label: a })),
            ]}
            onChange={setAgencyFilter}
          />
        </div>

        <div className="gapFinderControl">
          <SingleSelectStub
            label="Metric"
            value={metric}
            options={[
              { value: "funding", label: "Total Funding" },
              { value: "count", label: "Grant Count" },
            ]}
            onChange={(v) => setMetric(v as MetricKey)}
          />
        </div>

        <div className="gapFinderControl gapFinderYearControl">
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
                  <div className="gapFinderHeaderTop">
                    <div className="gapFinderHeaderLabel">{xLabel}</div>
                    {(matrixData.colTotals[xLabel]?.count ?? 0) > 0 ? (
                      <DownloadButton
                        title={`Download all grants in “${xLabel}”`}
                        onClick={() => downloadColumn(xLabel)}
                      />
                    ) : null}
                  </div>
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
                    <div className="gapFinderHeaderTop">
                      <div className="gapFinderHeaderLabel">{yLabel}</div>
                      {rowTotal.count > 0 ? (
                        <DownloadButton
                          title={`Download all grants in “${yLabel}”`}
                          onClick={() => downloadRow(yLabel)}
                        />
                      ) : null}
                    </div>
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
                          {cell.count > 0 ? (
                            <DownloadButton
                              title={`Download ${cell.count.toLocaleString()} grants: ${yLabel} × ${xLabel}`}
                              onClick={() => downloadCell(xLabel, yLabel)}
                            />
                          ) : null}
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