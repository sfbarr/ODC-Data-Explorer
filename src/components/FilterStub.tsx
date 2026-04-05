import { useEffect, useRef, useState } from "react";
import type { FilterStubProps } from "../types/types";

export default function FilterStub({
  label,
  options,
  values,
  onChange,
}: FilterStubProps) {
  const [open, setOpen] = useState(false);
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
          <div className="filterOptions">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`filterOption${values.includes(opt) ? " active" : ""}`}
                onClick={() => toggle(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
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
