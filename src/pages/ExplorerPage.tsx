import { useMemo, useState } from "react";
import type { OptionsMap, Filters } from "../types/types";
import RangeSlider from "../components/RangeSlider";
import FilterStub from "../components/FilterStub";



type ExplorerPageProps = {
  grants: any[];
  options: OptionsMap;
};

const yearDomain = {
  min: 2005,
  max: 2026,
};


// Formatter for the dollar RangeSlider
const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function ExplorerPage({ grants, options }: ExplorerPageProps) {
  const [filters, setFilters] = useState<Filters>({
    agency: [],
    agencyIc: [],
    objectiveGeneral: [],
    objectiveSpecific: [],
    intervention: [],
    readiness: [],
    state: [],
    fiscalYear: undefined,
    amountUsd: undefined,
  });

  // Search Query setState()
  const [q, setQ] = useState("");

  // Used to force-reset uncontrolled components (like RangeSlider) on Reset
  const [resetNonce, setResetNonce] = useState(0);

  // Safely read options by key (my options.json keys)
  const opt = (key: string) => options[key] ?? [];

  // --- Helpers ---
  const normalize = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, ""); // removes diacritics safely

  const parseAmount = (v: unknown) => {
    if (typeof v === "number") return v;
    const cleaned = String(v ?? "").replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  
  const matchMulti = (selected: string[] | undefined, fieldValue: unknown) => {

    // If user selects nothing => pass everything
    if (!selected || selected.length === 0) return true;

    // safety feature just in case a field is ever an array
    if (Array.isArray(fieldValue)) {
      const normSet = new Set(fieldValue.map(normalize));
      return selected.some((s) => normSet.has(normalize(s)));
    }
    // Otherwise, keep grants where a field matches *at least* 1 selected value.
    return selected.some((s) => normalize(fieldValue) === normalize(s));
  };

  // supports either { min, max } or [min, max]
  const inRange = (range: any, value: number) => {
    if (!range) return true;

    const min = Array.isArray(range) ? Number(range[0]) : Number(range.min);
    const max = Array.isArray(range) ? Number(range[1]) : Number(range.max);

    if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
    return value >= min && value <= max;
  };

  const buildSearchHaystack = (g: any) => {
    const keys = [
        "Project Title",
        "Project Abstract",
        "Agency",
        "Agency IC",
        "Project Number",
        "Objective - General",
        "Objective - Specific",
        "Intervention",
        "Readiness",
        "PI",
        "Organization",
        "State",
        "Mechanism",
    ];

    return normalize(
        keys
        .map((k) => g?.[k])
        .filter((v) => v != null && v !== "")
        .join(" ")
    );
  };

  // --- The actual filtered list ---
  const filteredGrants = useMemo(() => {

    // tokenize search query so multi word phrases can be utilized
    const tokens = q.trim()
      ? q
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(normalize)
      : [];

    return grants.filter((g: any) => {
      // Sidebar filters
      if (!matchMulti(filters.agency, g["Agency"])) return false;
      if (!matchMulti(filters.agencyIc, g["Agency IC"])) return false;
      if (!matchMulti(filters.objectiveGeneral, g["Objective - General"])) return false;
      if (!matchMulti(filters.objectiveSpecific, g["Objective - Specific"])) return false;
      if (!matchMulti(filters.intervention, g["Intervention"])) return false;
      if (!matchMulti(filters.readiness, g["Readiness"])) return false;
      if (!matchMulti(filters.state, g["State"])) return false;

      const year = Number(g["Fiscal Year"] ?? 0);
      if (!inRange(filters.fiscalYear, year)) return false;

      const amount = parseAmount(g["Amount"]);
      if (!inRange(filters.amountUsd, amount)) return false;

      // Keyword search last
      if (tokens.length) {
        const hay = buildSearchHaystack(g);
        if (!tokens.every((t) => hay.includes(t))) return false;
      }

      return true;
    });
  }, [grants, filters, q]);

  const matches = filteredGrants.length;

  const totalFunding = useMemo(() => {
    let total = 0;
    filteredGrants.forEach((g: any) => {
      total += parseAmount(g?.["Amount"] ?? g?.Amount);
    });
    return formatUsd(total);
  }, [filteredGrants]);

    // View toggle (sheet rows vs cards)
  type ViewMode = "sheet" | "cards";
  const [view, setView] = useState<ViewMode>("sheet");

  const toggleView = () => {
    setView((v) => (v === "sheet" ? "cards" : "sheet"));
  };

  return (
    <div id="ExplorerParent">
        
      <div className="layout">
        <aside className="sidebar">
         
          <section className="panel">
            <div className="panelTitle" style={{ fontWeight: "bold" }}>Filters</div>

            <div className="filterStubsContainer">
                <FilterStub
                label="Agency"
                options={opt("Agency")}
                values={filters.agency}
                onChange={(next) => setFilters((f) => ({ ...f, agency: next }))}
                />

                <FilterStub
                label="Agency IC"
                options={opt("Agency IC")}
                values={filters.agencyIc}
                onChange={(next) => setFilters((f) => ({ ...f, agencyIc: next }))}
                />

                <FilterStub
                label="Objective - General"
                options={opt("Objective - General")}
                values={filters.objectiveGeneral}
                onChange={(next) =>
                    setFilters((f) => ({ ...f, objectiveGeneral: next }))
                }
                />

                <FilterStub
                label="Objective - Specific"
                options={opt("Objective - Specific")}
                values={filters.objectiveSpecific}
                onChange={(next) =>
                    setFilters((f) => ({ ...f, objectiveSpecific: next }))
                }
                />

                <FilterStub
                label="Intervention"
                options={opt("Intervention")}
                values={filters.intervention}
                onChange={(next) =>
                    setFilters((f) => ({ ...f, intervention: next }))
                }
                />

                <FilterStub
                label="Readiness"
                options={opt("Readiness")}
                values={filters.readiness}
                onChange={(next) => setFilters((f) => ({ ...f, readiness: next }))}
                />

                <FilterStub
                label="State"
                options={opt("State")}
                values={filters.state}
                onChange={(next) => setFilters((f) => ({ ...f, state: next }))}
                />
            </div>

            <RangeSlider
              key={`year-${resetNonce}`}
              label="Year"
              domain={yearDomain}
              step={1}
              onChange={(next) =>
                setFilters((f) => ({ ...f, fiscalYear: next }))
              }
            />

            <RangeSlider
              key={`funding-${resetNonce}`}
              label="Funding"
              domain={{ min: 0, max: 6000000 }}
              step={10000}
              format={formatUsd}
              onChange={(next) =>
                setFilters((f) => ({ ...f, amountUsd: next }))
              }
            />

            <div className="resultsBox">
                <div className="resultsLine">
                <strong>{matches}</strong> matches out of <strong>{grants.length}</strong>
                {q.trim() ? (
                    <span style={{ marginLeft: "0.75rem", opacity: 0.8 }}>
                    Search:&ensp;<code>{q.trim()}</code>
                    </span>
                ) : null}
                </div>
                <div className="resultsButtons">
                    <button className="btn">Download</button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setQ("");
                        setFilters({
                          agency: [],
                          agencyIc: [],
                          objectiveGeneral: [],
                          objectiveSpecific: [],
                          intervention: [],
                          readiness: [],
                          state: [],
                          fiscalYear: undefined,
                          amountUsd: undefined,
                        });
                        setResetNonce((n) => n + 1);
                      }}
                    >
                      Reset
                    </button>
                </div>
            </div>

          </section>
        </aside>

        <main className="canvas">
          <div className="canvasHeader">
            <div className="canvasTitle">Explorer</div>
            <div className="fundingTotal">{totalFunding}</div>
            <button
              type="button"
              className="toggleCardButton"
              onClick={toggleView}
              aria-pressed={view === "cards"}
              title={view === "sheet" ? "Switch to cards" : "Switch to sheet"}
            >
              {view === "sheet" ? "Cards" : "Sheet"}
            </button>
            
            <div className="searchRow">
              <input
                className="searchInput"
                placeholder="Search titles, abstracts, orgs, PIs..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQ("");
                }}
              />
              <button className="btn ghost">Advanced</button>
            </div>
          </div>
            
          <div className="canvasBody">
            {view === "sheet" ? (
              <div className="grantSheet">
                <div className="grantSheetHeader">
                  <div className="col title">Title</div>
                  <div className="col year">Year</div>
                  <div className="col agency">Agency</div>
                  <div className="col amount">Amount</div>
                </div>

                {filteredGrants.map((g: any, idx: number) => (
                  <div className="grantRow" key={g.id ?? `${g["Project Title"] ?? g.title ?? "grant"}-${idx}`}> 
                    <div className="cell title">{g["Project Title"] ?? g.title ?? "(untitled)"}</div>
                    <div className="cell year">{g["Fiscal Year"] ?? "—"}</div>
                    <div className="cell agency">{g["Agency"] ?? "—"}</div>
                    <div className="cell amount">
                      {g["Amount"] != null ? formatUsd(parseAmount(g["Amount"])) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grantCards">
                {filteredGrants.map((g: any, idx: number) => (
                  <div className="grantCard" key={g.id ?? `${g["Project Title"] ?? g.title ?? "grant"}-${idx}`}> 
                    <div className="grantCardTitle">{g["Project Title"] ?? g.title ?? "(untitled)"}</div>
                    <div className="grantCardMeta">
                      <span>{g["Fiscal Year"] ?? "—"}</span>
                      <span>•</span>
                      <span>{g["Agency"] ?? "—"}</span>
                      {g["Amount"] != null ? (
                        <>
                          <span>•</span>
                          <span>
                            {formatUsd(parseAmount(g["Amount"]))}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {g["Project Abstract"] || g.abstract ? (
                      <div className="grantCardAbstract">
                        {String(g["Project Abstract"] ?? g.abstract).slice(0, 240)}
                        {String(g["Project Abstract"] ?? g.abstract).length > 240 ? "…" : ""}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
