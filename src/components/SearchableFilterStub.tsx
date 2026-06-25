import { useEffect, useMemo, useRef, useState } from "react";
import type { FilterStubProps } from "../types/types";

// Like FilterStub, but with a type-to-filter search box in the dropdown.
// Used for high-cardinality columns (Organization, PI, Mechanism) where a
// plain scrolling button list would be unusable.
const MAX_VISIBLE = 200;

export default function SearchableFilterStub({
  label,
  options,
  values,
  onChange,
}: FilterStubProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (opt: string) => {
    const next = values.includes(opt)
      ? values.filter((v) => v !== opt)
      : [...values, opt];
    onChange(next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const visible = filtered.slice(0, MAX_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="filterStub" ref={containerRef}>
      <button
        type="button"
        className="dropdownToggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="filterLabelRow">
          <span className="filterLabel">{label}</span>
          {values.length > 0 && (
            <span className="filterCount">{values.length} selected</span>
          )}
        </span>
        <span className={`filterChevron${open ? " open" : ""}`}>›</span>
      </button>

      {open && (
        <div className="filterMenu">
          <input
            className="searchInput filterMenuSearch"
            placeholder={`Search ${label.toLowerCase()}…`}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setQuery("");
              }
            }}
          />
          <div className="filterOptions">
            {visible.length === 0 ? (
              <div className="filterEmpty">No matches</div>
            ) : (
              visible.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`filterOption${values.includes(opt) ? " active" : ""}`}
                  onClick={() => toggle(opt)}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
          {hiddenCount > 0 && (
            <div className="filterEmpty">
              {hiddenCount.toLocaleString()} more — refine your search
            </div>
          )}
          {values.length > 0 && (
            <button
              type="button"
              className="filterClear"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
