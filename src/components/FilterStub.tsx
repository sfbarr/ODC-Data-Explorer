import { useEffect, useState } from "react";
import type { FilterStubProps } from "../types/types";
import Dropdown from "react-bootstrap/Dropdown";

export default function FilterStub({
  label,
  options,
  values,
  onChange,
}: FilterStubProps) {
  const [selected, setSelected] = useState<string[]>(values);

  useEffect(() => {
    setSelected(values);
  }, [values]);

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];

    setSelected(next);
    onChange(next);
  };

  const clear = () => {
    setSelected([]);
    onChange([]);
  };

  return (
    <div className="filterStub">
    
        {/* <label style={{ fontWeight: "bold" }}>{label}</label> */}
        <Dropdown autoClose="outside" className="dropdown">
            
            <Dropdown.Toggle className="dropdownToggle">  
                {label}{selected.length ? ` | ${selected.length}` : ""}
            </Dropdown.Toggle>
            
            <Dropdown.Menu className="filterMenu">
                
                {options.map((opt) => {
                const active = selected.includes(opt);
                return (
                    <Dropdown.Item 
                        className={active ? "filterOption active" : "filterOption"}
                        key={opt} 
                        as="button" 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggle(opt);    // pass individual selection to update state externally
                        }}
                    >
                        {opt}
                    </Dropdown.Item>)
                    
                })}
                <hr/>
                <Dropdown.Item content="Clear" onClick={clear}>
                    Clear
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown> 
    </div>
  );
}