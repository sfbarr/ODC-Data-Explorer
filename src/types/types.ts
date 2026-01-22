export type OptionsMap = Record<string, string[]>;

export type Range = { min: number; max: number };

// Stub slider component props for filter UI elements
export type RangeSliderProps = {
  label: string;
  domain: Range; // allowed range
  step?: number;
  format?: (n: number) => string;
  onChange: (next: Range) => void;
};

export type FilterStubProps = {
  label: string;
  options: string[];      // possible values
  values: string[];        // selected values
  onChange: (next: string[]) => void;
};

// Until we sanitize the input data (grants.json, options.json), we probably can't use this type
export type Grant = {
  Year: number;  // NOTE: Convert underlying data to number
  Agency: string;
  AgencyIC: string;
  ObjectiveGeneral: string;
  ObjectiveSpecific: string;
  Intervention: string;
  Readiness: string;
  State: string;
  Amount: number; // NOTE: Convert underlying data to number
  URL: string;
  // Other fields exist, but these are the ones we care about for filtering
};

export type Filters = {
  // value filters
  agency: string[];
  agencyIc: string[];
  objectiveGeneral: string[];
  objectiveSpecific: string[];
  intervention: string[];
  readiness: string[];
  state: string[];

  // range filters (undefined means "no filter")
  fiscalYear?: Range;
  amountUsd?: Range;
};