import { useMemo, useState } from "react";
import { downloadCsv, todaySlug } from "../utils/download";

type ExplorerPageProps = {
  grants: any[];       // pre-filtered by App
  totalGrants: number; // total unfiltered count for "X of Y" display
  q: string;           // current search query for display echo
};

const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const parseAmount = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeUrl = (u: unknown) => {
  const s = String(u ?? "").trim();
  if (!s) return "";
  return s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
};

// Sortable columns: which grant field backs each, and how to compare it.
type SortKey = "title" | "year" | "agency" | "amount" | "state" | "mechanism";
type SortDir = "asc" | "desc";

const SORT_FIELDS: Record<SortKey, { field: string; numeric: boolean }> = {
  title: { field: "Project Title", numeric: false },
  year: { field: "Fiscal Year", numeric: true },
  agency: { field: "Agency", numeric: false },
  amount: { field: "Amount", numeric: true },
  state: { field: "State", numeric: false },
  mechanism: { field: "Mechanism", numeric: false },
};

// Header columns in display order (the Link column is rendered separately, not sortable).
const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
  { key: "agency", label: "Agency" },
  { key: "amount", label: "Amount" },
  { key: "state", label: "State" },
  { key: "mechanism", label: "Mechanism" },
];

export default function ExplorerPage({ grants, totalGrants, q }: ExplorerPageProps) {
  type ViewMode = "sheet" | "cards";
  const [view, setView] = useState<ViewMode>("sheet");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rowKey = (g: any, idx: number) =>
    g.id ?? `${g["Project Title"] ?? "grant"}-${idx}`;

  // Click a header to cycle: unsorted → ascending → descending → unsorted.
  const onSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  };

  const sortedGrants = useMemo(() => {
    if (!sortKey) return grants;
    const { field, numeric } = SORT_FIELDS[sortKey];
    const factor = sortDir === "asc" ? 1 : -1;

    return [...grants].sort((a, b) => {
      const av = a?.[field];
      const bv = b?.[field];

      // Push blanks to the bottom regardless of sort direction.
      const aEmpty = av == null || av === "";
      const bEmpty = bv == null || bv === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      const cmp = numeric
        ? parseAmount(av) - parseAmount(bv)
        : String(av).localeCompare(String(bv), "en", { sensitivity: "base" });
      return cmp * factor;
    });
  }, [grants, sortKey, sortDir]);

  const totalFunding = useMemo(() => {
    let total = 0;
    grants.forEach((g: any) => {
      total += parseAmount(g?.["Amount"] ?? g?.Amount);
    });
    return formatUsd(total);
  }, [grants]);

  return (
    <main className="canvas">
      <div className="canvasHeader">
        <div className="canvasTitle">Explorer</div>
        <div className="resultsSummary">
          <strong>{grants.length}</strong> of <strong>{totalGrants}</strong> grants shown
          {q.trim() ? (
            <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
              Search:&ensp;<code>{q.trim()}</code>
            </span>
          ) : null}
          <div className="fundingTotal">{totalFunding}</div>
        </div>
        <div className="resultsToolbar">
          <div className="resultsButtons">
            <button
              type="button"
              className="btn"
              disabled={grants.length === 0}
              onClick={() => downloadCsv(grants, `sci-grants-${todaySlug()}.csv`)}
            >
              Download {grants.length > 0 ? `${grants.length.toLocaleString()} ` : ""}CSV
            </button>
            <button
              type="button"
              className="toggleCardButton"
              onClick={() => setView((v) => (v === "sheet" ? "cards" : "sheet"))}
              aria-pressed={view === "cards"}
              title={view === "sheet" ? "Switch to cards" : "Switch to sheet"}
            >
              {view === "sheet" ? "Cards" : "Sheet"}
            </button>
          </div>
        </div>
      </div>

      <div className="canvasBody">
        {view === "sheet" ? (
          <div className="grantSheet">
            <div className="grantSheetHeader">
              {SORTABLE_COLUMNS.map(({ key, label }) => {
                const active = sortKey === key;
                return (
                  <div
                    key={key}
                    className={`col ${key} sortable${active ? " sorted" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-sort={
                      active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                    }
                    onClick={() => onSort(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSort(key);
                      }
                    }}
                  >
                    {label}
                    <span className="sortIndicator" aria-hidden="true">
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                );
              })}
              <div className="col link">Link</div>
            </div>

            {sortedGrants.map((g: any, idx: number) => {
              const key = rowKey(g, idx);
              const isExpanded = expandedKey === key;
              const toggle = () => setExpandedKey(isExpanded ? null : key);
              return (
                <div
                  className={`grantRow${isExpanded ? " expanded" : ""}`}
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                >
                  <div className="cell title" title={g["Project Title"] ?? ""}>
                    {g["Project Title"] ?? "(untitled)"}
                  </div>
                  <div className="cell year">{g["Fiscal Year"] ?? "—"}</div>
                  <div className="cell agency">{g["Agency"] ?? "—"}</div>
                  <div className="cell amount">
                    {g["Amount"] != null ? formatUsd(parseAmount(g["Amount"])) : "—"}
                  </div>
                  <div className="cell state">{g["State"] ?? "—"}</div>
                  <div className="cell mechanism" title={g["Mechanism"] ?? ""}>
                    {g["Mechanism"] ?? "—"}
                  </div>
                  <div className="cell link" onClick={(e) => e.stopPropagation()}>
                    {g["URL"] ? (
                      <a
                        className="pillLink"
                        href={normalizeUrl(g["URL"])}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : (
                      <span style={{ opacity: 0.6 }}>—</span>
                    )}
                  </div>

                  {isExpanded ? (
                    <div className="grantRowExpanded">
                      <div className="grantRowExpandedDetails">
                        <div><span className="label">PI:</span> {g["PI"] ?? "—"}</div>
                        <div><span className="label">Org:</span> {g["Organization"] ?? "—"}</div>
                        <div><span className="label">Agency IC:</span> {g["Agency IC"] ?? "—"}</div>
                        <div><span className="label">Mechanism:</span> {g["Mechanism"] ?? "—"}</div>
                      </div>
                      {g["Project Abstract"] ? (
                        <div className="grantRowExpandedAbstract">
                          {String(g["Project Abstract"]).slice(0, 600)}
                          {String(g["Project Abstract"]).length > 600 ? "…" : ""}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grantCards">
            {sortedGrants.map((g: any, idx: number) => (
              <div
                className="grantCard"
                key={g.id ?? `${g["Project Title"] ?? "grant"}-${idx}`}
              >
                <div className="grantCardTop">
                  <div
                    className="grantCardTitle"
                    title={g["Project Title"] ?? ""}
                  >
                    {g["Project Title"] ?? "(untitled)"}
                  </div>
                  <div className="grantCardMeta">
                    <span className="num">{g["Fiscal Year"] ?? "—"}</span>
                    <span>•</span>
                    <span>
                      {g["Agency"] ?? "—"}
                      {g["Agency IC"] ? ` / ${g["Agency IC"]}` : ""}
                    </span>
                    {g["Amount"] != null ? (
                      <>
                        <span>•</span>
                        <span className="num">
                          {formatUsd(parseAmount(g["Amount"]))}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grantCardDetails">
                  <div><span className="label">PI:</span> {g["PI"] ?? "—"}</div>
                  <div><span className="label">Org:</span> {g["Organization"] ?? "—"}</div>
                  <div><span className="label">State:</span> {g["State"] ?? "—"}</div>
                  <div><span className="label">Mechanism:</span> {g["Mechanism"] ?? "—"}</div>
                </div>

                {g["Project Abstract"] ? (
                  <div className="grantCardAbstract">
                    {String(g["Project Abstract"]).slice(0, 240)}
                    {String(g["Project Abstract"]).length > 240 ? "…" : ""}
                  </div>
                ) : null}

                <div className="grantCardBottom">
                  {g["Readiness - General"] ? (
                    <span className="tag">{g["Readiness - General"]}</span>
                  ) : null}
                  {g["Intervention - General"] ? (
                    <span className="tag">{g["Intervention - General"]}</span>
                  ) : null}
                  <span className="spacer" />
                  {g["URL"] ? (
                    <a
                      className="btnLink"
                      href={normalizeUrl(g["URL"])}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Grant
                    </a>
                  ) : (
                    <span style={{ opacity: 0.6 }}>No link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
