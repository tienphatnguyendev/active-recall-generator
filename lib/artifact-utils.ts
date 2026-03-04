/**
 * Parse an artifact's title and source_hash into display-friendly fields.
 * Single source of truth — used by pages, API routes, and exports.
 */
export function parseArtifactDisplay(
  title: string | null | undefined,
  sourceHash: string | null | undefined
) {
  const parts = title?.split(" - ") ?? [];
  const book = parts[0] || "Unknown Book";
  const chapter = parts.length > 1 ? parts[1] : "Unknown Chapter";
  const section =
    parts.length > 2
      ? parts.slice(2).join(" - ")
      : title || (sourceHash ? `Document (${sourceHash.substring(0, 8)})` : "Document");

  return {
    book,
    chapter,
    section,
    source: sourceHash ? sourceHash.substring(0, 8) + "..." : "Unknown Source",
  };
}
