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

  // View toggle (sheet rows vs cards)
  type ViewMode = "sheet" | "cards";
  const [view, setView] = useState<ViewMode>("sheet");

  const toggleView = () => {
    setView((v) => (v === "sheet" ? "cards" : "sheet"));
  };

  // For now, matches = all grants (later: use filtered list length)
  const matches = grants.length;

  // Safely read options by key (options.json keys)
  const opt = (key: string) => options[key] ?? [];

  const totalFunding = useMemo(() => {
    let total = 0;
    grants.forEach((g: any) => {
        total += Number(g.Amount ?? 0);
    });
    return formatUsd(total);
  }, [grants]);


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
              label="Year"
              domain={yearDomain}
              step={1}
              onChange={(next) =>
                setFilters((f) => ({ ...f, fiscalYear: next }))
              }
            />

            <RangeSlider
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
                    <button className="btn">Download CSV</button>
                    <button className="btn ghost">Reset</button>
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

                {grants.map((g: any, idx: number) => (
                  <div className="grantRow" key={g.id ?? `${g["Project Title"] ?? g.title ?? "grant"}-${idx}`}> 
                    <div className="cell title">{g["Project Title"] ?? g.title ?? "(untitled)"}</div>
                    <div className="cell year">{g["Fiscal Year"] ?? "—"}</div>
                    <div className="cell agency">{g["Agency"] ?? "—"}</div>
                    <div className="cell amount">
                      {typeof g["Amount"] === "number" ? formatUsd(g["Amount"]) : g["Amount"] ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grantCards">
                {grants.map((g: any, idx: number) => (
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
                            {typeof g["Amount"] === "number" ? formatUsd(g["Amount"]) : g["Amount"]}
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
