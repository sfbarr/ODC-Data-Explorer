import { useEffect, useRef, useState } from "react";

type DualFilterStubProps = {
  label: string;
  generalOptions: string[];
  specificOptions: string[];
  generalValues: string[];
  specificValues: string[];
  onGeneralChange: (next: string[]) => void;
  onSpecificChange: (next: string[]) => void;
};

export default function DualFilterStub({
  label,
  generalOptions,
  specificOptions,
  generalValues,
  specificValues,
  onGeneralChange,
  onSpecificChange,
}: DualFilterStubProps) {
  // Start in whichever mode has active selections; default general
  const [mode, setMode] = useState<"general" | "specific">(
    specificValues.length > 0 ? "specific" : "general"
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const activeOptions = mode === "general" ? generalOptions : specificOptions;
  const activeValues  = mode === "general" ? generalValues  : specificValues;
  const activeOnChange = mode === "general" ? onGeneralChange : onSpecificChange;

  const switchMode = (newMode: "general" | "specific", e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === newMode) return;
    // Clear whichever mode we're leaving
    if (mode === "general") onGeneralChange([]);
    else onSpecificChange([]);
    setMode(newMode);
  };

  const toggleOption = (opt: string) => {
    const next = activeValues.includes(opt)
      ? activeValues.filter((v) => v !== opt)
      : [...activeValues, opt];
    activeOnChange(next);
  };

  const totalSelected = generalValues.length + specificValues.length;

  return (
    <div className="filterStub" ref={containerRef}>
      {/* Outer toggle is a div — avoids illegal nested <button> inside <button> */}
      <div
        className="dropdownToggle dualDropdownToggle"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span className="filterLabelRow">
          <span className="filterLabel">{label}</span>
          {totalSelected > 0 && (
            <span className="filterCount">{totalSelected} selected</span>
          )}
        </span>

        {/* Mode pill — stopPropagation so clicks here don't toggle the dropdown */}
        <span className="dualModeToggle" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`dualModeBtn${mode === "general" ? " active" : ""}`}
            onClick={(e) => switchMode("general", e)}
          >
            General
          </button>
          <button
            type="button"
            className={`dualModeBtn${mode === "specific" ? " active" : ""}`}
            onClick={(e) => switchMode("specific", e)}
          >
            Specific
          </button>
        </span>

        <span className={`filterChevron${open ? " open" : ""}`}>›</span>
      </div>

      {open && (
        <div className="filterMenu">
          <div className="filterOptions">
            {activeOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`filterOption${activeValues.includes(opt) ? " active" : ""}`}
                onClick={() => toggleOption(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          {activeValues.length > 0 && (
            <button
              type="button"
              className="filterClear"
              onClick={() => activeOnChange([])}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
