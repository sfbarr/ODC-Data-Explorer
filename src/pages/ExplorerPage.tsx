import { useState } from "react";
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

  // Safely read options by key (options.json keys)
  const opt = (key: string) => options[key] ?? [];

  return (
    <div id="ExplorerParent">
      <div className="resultsBox">
        <div className="resultsLine">
          <strong>0</strong> matches out of <strong>{grants.length}</strong>
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

      <div className="layout">
        <aside className="sidebar">
         
          <section className="panel">
            <div className="panelTitle" style={{ fontWeight: "bold" }}>Filters</div>
            <div className="dropdownSpan">
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
              label="Dollar Amount"
              domain={{ min: 0, max: 6000000 }}
              step={10000}
              format={formatUsd}
              onChange={(next) =>
                setFilters((f) => ({ ...f, amountUsd: next }))
              }
            />
          </section>
        </aside>

        <main className="canvas">
          <div className="canvasHeader">
            <div className="canvasTitle">Explorer</div>
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
            <div className="placeholder">
              Explorer results table/cards will render here.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
