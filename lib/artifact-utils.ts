/**
 * Parse an artifact's title and source_hash into display-friendly fields.
 * Single source of truth — used by pages, API routes, and exports.
 */
export function parseArtifactDisplay(
  title: string | null | undefined,
  sourceHash: string | null | undefined
) {
  const parts = title?.split(" - ") ?? [];
  return {
    book: parts[0] || "Unknown Book",
    chapter: parts[1] || "Unknown Chapter",
    section: title || (sourceHash ? `Document (${sourceHash.substring(0, 8)})` : "Document"),
    source: sourceHash ? sourceHash.substring(0, 8) + "..." : "Unknown Source",
  };
}
