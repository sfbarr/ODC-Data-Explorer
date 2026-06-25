import type { Dispatch, SetStateAction } from "react";
import type { Filters, OptionsMap } from "../types/types";
import FilterStub from "./FilterStub";
import SearchableFilterStub from "./SearchableFilterStub";
import DualFilterStub from "./DualFilterStub";
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
  open?: boolean; // mobile drawer state; ignored on desktop (always shown)
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
  open = false,
}: GrantsSidebarProps) {
  const opt = (key: string) => options[key] ?? [];

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
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
          <DualFilterStub
            label="Objective"
            generalOptions={opt("Objective - General")}
            specificOptions={opt("Objective - Specific")}
            generalValues={filters.objectiveGeneral}
            specificValues={filters.objectiveSpecific}
            onGeneralChange={(next) => setFilters((f) => ({ ...f, objectiveGeneral: next }))}
            onSpecificChange={(next) => setFilters((f) => ({ ...f, objectiveSpecific: next }))}
          />
          <DualFilterStub
            label="Intervention"
            generalOptions={opt("Intervention - General")}
            specificOptions={opt("Intervention - Specific")}
            generalValues={filters.interventionGeneral}
            specificValues={filters.interventionSpecific}
            onGeneralChange={(next) => setFilters((f) => ({ ...f, interventionGeneral: next }))}
            onSpecificChange={(next) => setFilters((f) => ({ ...f, interventionSpecific: next }))}
          />
          <DualFilterStub
            label="Readiness"
            generalOptions={opt("Readiness - General")}
            specificOptions={opt("Readiness - Specific")}
            generalValues={filters.readinessGeneral}
            specificValues={filters.readinessSpecific}
            onGeneralChange={(next) => setFilters((f) => ({ ...f, readinessGeneral: next }))}
            onSpecificChange={(next) => setFilters((f) => ({ ...f, readinessSpecific: next }))}
          />
          <FilterStub
            label="State"
            options={opt("State")}
            values={filters.state}
            onChange={(next) => setFilters((f) => ({ ...f, state: next }))}
          />
          <SearchableFilterStub
            label="Organization"
            options={opt("Organization")}
            values={filters.organization}
            onChange={(next) => setFilters((f) => ({ ...f, organization: next }))}
          />
          <SearchableFilterStub
            label="PI"
            options={opt("PI")}
            values={filters.pi}
            onChange={(next) => setFilters((f) => ({ ...f, pi: next }))}
          />
          <SearchableFilterStub
            label="Mechanism"
            options={opt("Mechanism")}
            values={filters.mechanism}
            onChange={(next) => setFilters((f) => ({ ...f, mechanism: next }))}
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
