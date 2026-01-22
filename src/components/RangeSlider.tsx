import { Range as ReactRange, getTrackBackground } from "react-range";
import { useEffect, useState } from "react";
import type { Range, RangeSliderProps } from "../types/types";

export default function RangeSlider({
  label,
  domain,
  step = 1,
  format,
  onChange,
}: RangeSliderProps) {
  const show = (n: number) => (format ? format(n) : String(n));

  // Internal, controlled thumb positions (min/max)
  const [values, setValues] = useState<[number, number]>([
    domain.min,
    domain.max,
  ]);

  // If the domain changes (new dataset), reset slider to new bounds
  useEffect(() => {
    setValues([domain.min, domain.max]);
  }, [domain.min, domain.max]);

  const handleRangeChange = (newValues: number[]) => {
    const next: [number, number] = [newValues[0], newValues[1]];
    setValues(next);
    const payload: Range = { min: next[0], max: next[1] };
    onChange(payload);
  };

  return (
    <div className="rangeStub">
      <div className="rangeLabel">
        {label}: <span>{show(values[0])}</span> – <span>{show(values[1])}</span>
      </div>

      <ReactRange
        values={values}
        step={step}
        min={domain.min}
        max={domain.max}
        allowOverlap={false}
        onChange={handleRangeChange}
        renderTrack={({ props, children }) => (
          <div
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
            className="rangeWrap"
            style={{
              ...props.style,
              position: "relative",
              width: "100%",
              height: 32,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              ref={props.ref}
              className="rangeTrack"
              style={{
                height: 6,
                width: "100%",
                borderRadius: 999,
                background: getTrackBackground({
                  values,
                  colors: [
                    "rgba(255,255,255,0.18)",
                    "rgba(84,139,244,0.9)",
                    "rgba(255,255,255,0.18)",
                  ],
                  min: domain.min,
                  max: domain.max,
                }),
              }}
            >
              {children}
            </div>
          </div>
        )}
        renderThumb={({ props, index, isDragged }) => (
          <div
            {...props}
            className="rangeThumb"
            aria-label={index === 0 ? `${label} minimum` : `${label} maximum`}
            style={{
              ...props.style,
              height: 14,
              width: 14,
              borderRadius: 999,
              background: "#fff",
              border: isDragged
                ? "1px solid rgba(84,139,244,1)"
                : "1px solid rgba(0,0,0,0.25)",
              boxShadow: isDragged ? "0 0 0 4px rgba(84,139,244,0.25)" : "none",
            }}
          />
        )}
      />
    </div>
  );
}