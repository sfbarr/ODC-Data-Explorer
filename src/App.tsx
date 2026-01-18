import { useEffect, useState } from "react";
import "./App.css"; 
import odcLogo from "./assets/odc-centered-logo.png";  // ODC logo 
import ExplorerPage from "./pages/ExplorerPage";

// Tab View state (1 of 3 possible values)
type Tab = "explorer" | "cure-map" | "gap-finder";

// Scaffolding for the collected filters 
type OptionsMap = Record<string, string[]>;

export default function App() {

  // Set up setState() functions for major variables/data
  const [tab, setTab] = useState<Tab>("explorer");
  const [grants, setGrants] = useState<any[] | null>(null);
  const [options, setOptions] = useState<OptionsMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync App.tsx with data generated from initial parse script: 'build-data.ts'
  useEffect(() => {
    async function load() {
      try {
        // destructure into individual responses
        const [gRes, oRes] = await Promise.all([
          // "external" sync, adhering to useEffect best practices
          fetch("/data/grants.json"),
          fetch("/data/options.json"),
        ]);

        // report failed fetch for either case; get specifics
        if (!gRes.ok) throw new Error(`grants.json failed: ${gRes.status}`);
        if (!oRes.ok) throw new Error(`options.json failed: ${oRes.status}`);
  
        // Parse succesful response stream into desired JSON
        const g = await gRes.json();
        const o = await oRes.json();

        // update state of empty options type, or grants array, respectively 
        setGrants(g);
        setOptions(o);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
     
    }
    // Runs after the first UI render, fetching data to finish populating page  
    load();
  }, []);

  // Show something until succesful population
  if (error) return <div>Error: {error} </div>;
  if (!grants || !options) return <div>Loading…</div>;


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

      </header>
      <div className="canvasBody">
        {tab === "explorer" && <ExplorerPage grants={grants} options={options} />}
        {tab === "cure-map" && (
          <div className="placeholder">Map view will render here (filtered grants).</div>
        )}
        {tab === "gap-finder" && (
          <div className="placeholder">Heatmap/pivot view will render here.</div>
        )}
      </div>
    </div>
  );
}