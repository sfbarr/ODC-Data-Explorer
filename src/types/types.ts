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

export type Filters = {
  // value filters
  agency: string[];
  agencyIc: string[];
  objectiveGeneral: string[];
  objectiveSpecific: string[];
  interventionGeneral: string[];
  interventionSpecific: string[];
  readinessGeneral: string[];
  readinessSpecific: string[];
  state: string[];
  organization: string[];
  pi: string[];
  mechanism: string[];

  // range filters (undefined means "no filter")
  fiscalYear?: Range;
  amountUsd?: Range;
};

export const EMPTY_FILTERS: Filters = {
  agency: [],
  agencyIc: [],
  objectiveGeneral: [],
  objectiveSpecific: [],
  interventionGeneral: [],
  interventionSpecific: [],
  readinessGeneral: [],
  readinessSpecific: [],
  state: [],
  organization: [],
  pi: [],
  mechanism: [],
  fiscalYear: undefined,
  amountUsd: undefined,
};
