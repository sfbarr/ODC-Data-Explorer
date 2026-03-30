import type { FilterStubProps } from "../types/types";
import Dropdown from "react-bootstrap/Dropdown";

export default function FilterStub({
  label,
  options,
  values,
  onChange,
}: FilterStubProps) {
  const toggle = (opt: string) => {
    const next = values.includes(opt)
      ? values.filter((v) => v !== opt)
      : [...values, opt];

    onChange(next);
  };

  const clear = () => {
    onChange([]);
  };

  return (
    <div className="filterStub">
      <Dropdown autoClose="outside" className="dropdown">
        <Dropdown.Toggle className="dropdownToggle">
          {label}{values.length ? ` | ${values.length}` : ""}
        </Dropdown.Toggle>

        <Dropdown.Menu className="filterMenu">
          {options.map((opt) => {
            const active = values.includes(opt);

            return (
              <Dropdown.Item
                className={active ? "filterOption active" : "filterOption"}
                key={opt}
                as="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(opt);
                }}
              >
                {opt}
              </Dropdown.Item>
            );
          })}

          <hr />
          <Dropdown.Item onClick={clear}>Clear</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}