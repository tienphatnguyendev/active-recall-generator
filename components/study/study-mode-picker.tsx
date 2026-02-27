"use client";

import { cn } from "@/lib/utils";

export type StudyMode = "all" | "weak" | "random";

interface StudyModePickerProps {
  mode: StudyMode;
  onChange: (mode: StudyMode) => void;
}

const MODES: { value: StudyMode; label: string; description: string }[] = [
  {
    value: "all",
    label: "All cards",
    description: "Study every card in the selected artifacts.",
  },
  {
    value: "weak",
    label: "Weak areas",
    description: "Focus on cards previously rated Unsure or Unknown.",
  },
  {
    value: "random",
    label: "Random",
    description: "Shuffle and draw a random sample of cards.",
  },
];

export function StudyModePicker({ mode, onChange }: StudyModePickerProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
        Study mode
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={cn(
              "border p-3 text-left transition-colors",
              mode === m.value
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-surface"
            )}
            aria-pressed={mode === m.value}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-semibold",
                  mode === m.value ? "text-primary" : "text-foreground"
                )}
              >
                {m.label}
              </span>
              {mode === m.value && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {m.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
