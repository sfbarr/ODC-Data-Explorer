import { useEffect, useRef, useState } from "react";

type SingleSelectOption = { value: string; label: string };

type SingleSelectStubProps = {
  label: string;
  options: SingleSelectOption[];
  value: string;
  onChange: (next: string) => void;
};

export default function SingleSelectStub({
  label,
  options,
  value,
  onChange,
}: SingleSelectStubProps) {
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

  const selected = options.find((o) => o.value === value);

  return (
    <div className="filterStub singleSelectStub" ref={containerRef}>
      <button
        type="button"
        className="dropdownToggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="filterLabelRow">
          <span className="filterLabel">{label}</span>
          <span className="filterCount">{selected?.label ?? "—"}</span>
        </span>
        <span className={`filterChevron${open ? " open" : ""}`}>›</span>
      </button>

      {open && (
        <div className="filterMenu">
          <div className="filterOptions">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`filterOption${opt.value === value ? " active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
