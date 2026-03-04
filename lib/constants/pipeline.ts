export type StageStatus = "idle" | "active" | "done" | "failed";

export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  color: string;
  status: StageStatus;
  detail?: string;
}

export const SAMPLE_MARKDOWN = `# The Water Cycle

## Evaporation

Water from oceans, lakes, and rivers transforms into water vapor when heated by the sun. This process moves approximately 502,800 km³ of water into the atmosphere each year.

## Condensation

As water vapor rises and cools, it condenses around tiny particles to form clouds and fog. The dew point is the temperature at which condensation begins.

## Precipitation

Water returns to Earth's surface as rain, snow, sleet, or hail, depending on atmospheric temperature and pressure conditions.`;

export const STAGE_MAP: Record<string, string> = {
  check: "check",
  outline_draft: "draft",
  qa_draft: "draft",
  judge: "judge",
  revise: "revise",
  save: "save",
  saving_to_supabase: "save",
};

export const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: "check",
    label: "Check Database",
    description: "Hash content and skip unchanged chunks",
    color: "#a2aaad",
    status: "idle",
  },
  {
    id: "draft",
    label: "Draft",
    description: "Generate outline and Q&A pairs via LLM",
    color: "#f3c13a",
    status: "idle",
  },
  {
    id: "judge",
    label: "Judge",
    description: "Score each Q&A on accuracy, clarity, recall-worthiness",
    color: "#005eb8",
    status: "idle",
  },
  {
    id: "revise",
    label: "Revise",
    description: "Re-generate failing pairs (max 3 cycles)",
    color: "#a2aaad",
    status: "idle",
  },
  {
    id: "save",
    label: "Save to DB",
    description: "Persist artifact to SQLite",
    color: "#005eb8",
    status: "idle",
  },
];