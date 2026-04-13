import type { Dispatch, SetStateAction } from "react";
import type { Filters, OptionsMap } from "../types/types";
import FilterStub from "./FilterStub";
import RangeSlider from "./RangeSlider";
import { downloadCsv, todaySlug } from "../utils/download";

const yearDomain = { min: 2005, max: 2026 };

const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

type GrantsSidebarProps = {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  q: string;
  setQ: Dispatch<SetStateAction<string>>;
  resetNonce: number;
  options: OptionsMap;
  onReset: () => void;
  grants: any[]; // current filtered subset — used for download
};

export default function GrantsSidebar({
  filters,
  setFilters,
  q,
  setQ,
  resetNonce,
  options,
  onReset,
  grants,
}: GrantsSidebarProps) {
  const opt = (key: string) => options[key] ?? [];

  return (
    <aside className="sidebar">
      <section className="panel">
        <input
          className="searchInput sidebarSearch"
          placeholder="Search titles, PIs, orgs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQ("");
          }}
        />

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
            label="Objective — General"
            options={opt("Objective - General")}
            values={filters.objectiveGeneral}
            onChange={(next) => setFilters((f) => ({ ...f, objectiveGeneral: next }))}
          />
          <FilterStub
            label="Objective — Specific"
            options={opt("Objective - Specific")}
            values={filters.objectiveSpecific}
            onChange={(next) => setFilters((f) => ({ ...f, objectiveSpecific: next }))}
          />
          <FilterStub
            label="Intervention — General"
            options={opt("Intervention - General")}
            values={filters.interventionGeneral}
            onChange={(next) => setFilters((f) => ({ ...f, interventionGeneral: next }))}
          />
          <FilterStub
            label="Intervention — Specific"
            options={opt("Intervention - Specific")}
            values={filters.interventionSpecific}
            onChange={(next) => setFilters((f) => ({ ...f, interventionSpecific: next }))}
          />
          <FilterStub
            label="Readiness — General"
            options={opt("Readiness - General")}
            values={filters.readinessGeneral}
            onChange={(next) => setFilters((f) => ({ ...f, readinessGeneral: next }))}
          />
          <FilterStub
            label="Readiness — Specific"
            options={opt("Readiness - Specific")}
            values={filters.readinessSpecific}
            onChange={(next) => setFilters((f) => ({ ...f, readinessSpecific: next }))}
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
          onChange={(next) => setFilters((f) => ({ ...f, fiscalYear: next }))}
        />
        <RangeSlider
          key={`funding-${resetNonce}`}
          label="Funding"
          domain={{ min: 0, max: 6000000 }}
          step={10000}
          format={formatUsd}
          onChange={(next) => setFilters((f) => ({ ...f, amountUsd: next }))}
        />

        <div className="sidebarActions">
          <button
            type="button"
            className="btn ghost"
            onClick={onReset}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn"
            disabled={grants.length === 0}
            onClick={() => downloadCsv(grants, `sci-grants-${todaySlug()}.csv`)}
          >
            Download {grants.length > 0 ? `${grants.length.toLocaleString()} ` : ""}CSV
          </button>
        </div>
      </section>
    </aside>
  );
}
