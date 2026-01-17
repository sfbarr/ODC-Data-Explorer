import { useState } from "react";
import "./App.css"; 
import odcLogo from "./assets/odc-centered-logo.png";  // ODC logo 

type Tab = "explorer" | "cure-map" | "gap-finder";

export default function App() {
  const [tab, setTab] = useState<Tab>("explorer");

  // Set title based on the 3 allowed tab states
  let tabTitle = "Explorer";
  if (tab === "cure-map") tabTitle = "Cure Map";
  if (tab === "gap-finder") tabTitle = "Gap Finder";

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="imgBackground" id="logoBackground"> 
            <img id="odc-logo" className="logo" src={odcLogo} alt="ODC logo" />
          </div>
          <div>
            <div className="brandTitle">SCI Data Explorer</div>
          </div>
        </div>

        <nav className="tabs">
          <button className={tab === "explorer" ? "active" : ""} onClick={() => setTab("explorer")}>
            Explorer
          </button>
          <button className={tab === "cure-map" ? "active" : ""} onClick={() => setTab("cure-map")}>
            Cure Map
          </button>
          <button className={tab === "gap-finder" ? "active" : ""} onClick={() => setTab("gap-finder")}>
            Gap Finder
          </button>
        </nav>

        <div className="resultsBox">
          <div className="resultsLine">
            <strong>0</strong> matches / <strong>$0</strong>
          </div>
          <div className="resultsButtons">
            <button className="btn">Download CSV</button>
            <button className="btn ghost">Reset</button>
          </div>
        </div>
      </header>

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
            <FilterStub label="Fiscal Year" />
            <FilterStub label="Agency" />
            <FilterStub label="Agency IC" />
            <FilterStub label="Intervention Category" />
            <FilterStub label="Readiness / Trial Stage" />
            <FilterStub label="Mechanism" />
            <FilterStub label="State / Country" />
            <FilterStub label="PI" />
            <FilterStub label="Organization" />
          </section>
        </aside>

        <main className="canvas">
          <div className="canvasHeader">
            <div className="canvasTitle">{tabTitle}</div>
            <div className="searchRow">
              <input className="searchInput" placeholder="Search titles, abstracts, orgs, PIs..." />
              <button className="btn ghost">Advanced</button>
            </div>
          </div>

          <div className="canvasBody">
            {tab === "explorer" && <div className="placeholder">Explorer results table/cards will render here.</div>}
            {tab === "cure-map" && <div className="placeholder">Map view will render here (filtered grants).</div>}
            {tab === "gap-finder" && <div className="placeholder">Heatmap/pivot view will render here.</div>}
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
      <button className="filterButton">Select…</button>
    </div>
  );
}