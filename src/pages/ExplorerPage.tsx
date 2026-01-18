import { useState } from "react";
import type { RangeSliderProps, OptionsMap, Filters } from "../types/types";

type ExplorerPageProps = {
  grants: any[];
  options: OptionsMap;
};
const yearDomain = { 
    min: 2005,
    max: 2026,
};

export default function ExplorerPage({ grants, options }: ExplorerPageProps) {
// NOTE: options is intentionally unused for now; I'll wire into dropdowns soon
//   void options;
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
  return (
    <div id="ExplorerParent">
      <div className="resultsBox">
        <div className="resultsLine">
          <strong>0</strong> matches out of <strong>{grants.length}</strong>
        </div>
        <div className="resultsButtons">
          <button className="btn">Download CSV</button>
          <button className="btn ghost">Reset</button>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <section className="panel">
            <div className="panelTitle">Categories</div>
            <div className="pillRow">
              <button className="pill">Objective: general</button>
              <button className="pill">Objective: specific</button>
              <button className="pill">Intervention</button>
              <button className="pill">Readiness</button>
            </div>
          </section>

          <section className="panel">
            <div className="panelTitle">Filters</div>
            <FilterStub label="Agency" />
            <FilterStub label="Agency IC" />
            <FilterStub label="Objective - General" />
            <FilterStub label="Objective - Specific" />
            <FilterStub label="Intervention" />
            <FilterStub label="Readiness" />
            <FilterStub label="State" />
            <RangeStub label="Fiscal Year" />
            <RangeStub label="Amount (USD)" />
          </section>
        </aside>

        <main className="canvas">
          <div className="canvasHeader">
            <div className="canvasTitle">Explorer</div>
            <div className="searchRow">
              <input
                className="searchInput"
                placeholder="Search titles, abstracts, orgs, PIs..."
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

function FilterStub({ label }: { label: string }) {
  return (
    <div className="filterStub">
      <div className="filterLabel">{label}</div>
      <button className="filterButton" onClick={(label) => {
        
      }}>Select…</button>
    </div>
  );
}

function RangeStub({ label, domain, value, step, format, onChange}: RangeSliderProps ) {
    return (
        <div className="rangeStub">
            <div className="rangeLabel">{label}</div>
            <input className="rangeSlider" type="range" min={domain.min} max={domain.max} />
        </div>
    );
}


