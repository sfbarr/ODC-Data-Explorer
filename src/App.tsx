import { useEffect, useMemo, useState } from "react";
import "./App.css";
import odcLogo from "./assets/odc-centered-logo.png";
import ExplorerPage from "./pages/ExplorerPage";
import CureMapPage from "./pages/CureMapPage";
import GapFinderPage from "./pages/GapFinderPage";
import TrendFinderPage from "./pages/TrendFinderPage";
import GrantsSidebar from "./components/GrantsSidebar";
import type { Filters, OptionsMap } from "./types/types";
import { EMPTY_FILTERS } from "./types/types";

type Tab = "explorer" | "cure-map" | "gap-finder" | "trend-finder";

// Empty trailing spreadsheet columns arrive as "__EMPTY", "__EMPTY_1", … — strip them.
const stripJunkColumns = (row: Record<string, unknown>) => {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (/^__EMPTY/.test(k)) continue;
    clean[k] = v;
  }
  return clean;
};

export default function App() {
  const [tab, setTab] = useState<Tab>("explorer");
  const [grants, setGrants] = useState<any[] | null>(null);
  const [options, setOptions] = useState<OptionsMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Global filter state
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [q, setQ] = useState("");
  const [resetNonce, setResetNonce] = useState(0);

  const resetAll = () => {
    setQ("");
    setFilters(EMPTY_FILTERS);
    setResetNonce((n) => n + 1);
  };

  useEffect(() => {
    async function load() {
      try {
        const [gRes, oRes] = await Promise.all([
          fetch("/data/grants.json"),
          fetch("/data/options.json"),
        ]);
        if (!gRes.ok) throw new Error(`grants.json failed: ${gRes.status}`);
        if (!oRes.ok) throw new Error(`options.json failed: ${oRes.status}`);
        const rawGrants: any[] = await gRes.json();
        // Drop empty trailing spreadsheet columns ("__EMPTY", "__EMPTY_1", …)
        // baked into the shipped data so they don't leak into the UI or CSV exports.
        setGrants(rawGrants.map(stripJunkColumns));
        setOptions(await oRes.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }
    load();
  }, []);

  useEffect(() => {
    const titles: Record<Tab, string> = {
      explorer: "Explorer",
      "cure-map": "Cure Map",
      "gap-finder": "Gap Finder",
      "trend-finder": "Trend Finder",
    };
    document.title = `SCI Data Explorer | ${titles[tab]}`;
  }, [tab]);

  const normalize = (v: unknown) =>
    String(v ?? "")
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

  const parseAmount = (v: unknown) => {
    if (typeof v === "number") return v;
    const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const matchMulti = (selected: string[], fieldValue: unknown) => {
    if (!selected || selected.length === 0) return true;
    if (Array.isArray(fieldValue)) {
      const normSet = new Set(fieldValue.map(normalize));
      return selected.some((s) => normSet.has(normalize(s)));
    }
    return selected.some((s) => normalize(fieldValue) === normalize(s));
  };

  const inRange = (range: any, value: number) => {
    if (!range) return true;
    const min = Array.isArray(range) ? Number(range[0]) : Number(range.min);
    const max = Array.isArray(range) ? Number(range[1]) : Number(range.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
    return value >= min && value <= max;
  };

  const SEARCH_KEYS = [
    "Project Title",
    "Project Abstract",
    "Agency",
    "Agency IC",
    "Project Number",
    "Objective - General",
    "Objective - Specific",
    "Intervention - General",
    "Intervention - Specific",
    "Readiness - General",
    "Readiness - Specific",
    "PI",
    "Organization",
    "State",
    "Mechanism",
  ];

  const filteredGrants = useMemo(() => {
    if (!grants) return [];

    const tokens = q.trim()
      ? q.trim().split(/\s+/).filter(Boolean).map(normalize)
      : [];

    return grants.filter((g: any) => {
      if (!matchMulti(filters.agency, g["Agency"])) return false;
      if (!matchMulti(filters.agencyIc, g["Agency IC"])) return false;
      if (!matchMulti(filters.objectiveGeneral, g["Objective - General"])) return false;
      if (!matchMulti(filters.objectiveSpecific, g["Objective - Specific"])) return false;
      if (!matchMulti(filters.interventionGeneral, g["Intervention - General"])) return false;
      if (!matchMulti(filters.interventionSpecific, g["Intervention - Specific"])) return false;
      if (!matchMulti(filters.readinessGeneral, g["Readiness - General"])) return false;
      if (!matchMulti(filters.readinessSpecific, g["Readiness - Specific"])) return false;
      if (!matchMulti(filters.state, g["State"])) return false;

      if (!inRange(filters.fiscalYear, Number(g["Fiscal Year"] ?? 0))) return false;
      if (!inRange(filters.amountUsd, parseAmount(g["Amount"]))) return false;

      if (tokens.length) {
        const hay = normalize(
          SEARCH_KEYS.map((k) => g?.[k])
            .filter((v) => v != null && v !== "")
            .join(" ")
        );
        if (!tokens.every((t) => hay.includes(t))) return false;
      }

      return true;
    });
  }, [grants, filters, q]);

  if (error) return <div>Error: {error}</div>;
  if (!grants || !options) return <div>Loading…</div>;

  const showSidebar = tab !== "gap-finder";

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
          <button
            className={tab === "explorer" ? "active" : ""}
            onClick={() => setTab("explorer")}
          >
            Explorer
          </button>
          <button
            className={tab === "cure-map" ? "active" : ""}
            onClick={() => setTab("cure-map")}
          >
            Cure Map
          </button>
          <button
            className={tab === "trend-finder" ? "active" : ""}
            onClick={() => setTab("trend-finder")}
          >
            Trend Finder
          </button>
          <button
            className={tab === "gap-finder" ? "active" : ""}
            onClick={() => setTab("gap-finder")}
          >
            Gap Finder
          </button>
        </nav>
      </header>

      {showSidebar ? (
        <div className="layout">
          <GrantsSidebar
            filters={filters}
            setFilters={setFilters}
            q={q}
            setQ={setQ}
            resetNonce={resetNonce}
            options={options}
            onReset={resetAll}
            grants={filteredGrants}
          />
          {tab === "explorer" && (
            <ExplorerPage
              grants={filteredGrants}
              totalGrants={grants.length}
              q={q}
            />
          )}
          {tab === "cure-map" && <CureMapPage grants={filteredGrants} />}
          {tab === "trend-finder" && <TrendFinderPage grants={filteredGrants} />}
        </div>
      ) : (
        <div className="gapFinderWrapper">
          <GapFinderPage grants={grants} />
        </div>
      )}
    </div>
  );
}
