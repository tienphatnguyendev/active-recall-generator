"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NotesEditorProps {
  initialNotes: string;
  onSave: (notes: string) => Promise<void>;
  disabled?: boolean;
}

export function NotesEditor({ initialNotes, onSave, disabled = false }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
    setIsDirty(false);
  }, [initialNotes]);

  const handleChange = (value: string) => {
    setNotes(value);
    setIsDirty(value !== initialNotes);
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(notes);
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save notes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Notes
        </p>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[10px] font-medium text-primary">Saved</span>
          )}
          {error && (
            <span className="text-[10px] text-destructive">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving || disabled}
            className={cn(
              "flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
              isDirty
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border text-muted-foreground"
            )}
          >
            {isSaving && (
              <span className="h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
            )}
            Save notes
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled || isSaving}
        placeholder="Add personal notes, mnemonics, or context for this artifact..."
        rows={5}
        className="w-full resize-none border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        aria-label="Personal notes"
      />
    </div>
  );
}
