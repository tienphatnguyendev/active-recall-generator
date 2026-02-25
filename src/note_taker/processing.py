"""Markdown processing: reading, cleaning, and chunking input files."""
import re
from typing import List, Dict

MAX_CHUNK_CHARS = 10000

# Pattern to detect the start of O'Reilly trailing boilerplate.
# Every raw chapter file ends with "close x" followed by a cover image
# and the book's navigation/TOC block.
_BOILERPLATE_PATTERN = re.compile(
    r"\nclose\s+x\s*\n",
    re.IGNORECASE,
)

# Matches a Markdown H1 or H2 header at the start of a line.
_HEADER_RE = re.compile(r"^(#{1,2})\s+(.+)$")

# Matches a Markdown H3 header at the start of a line.
_H3_RE = re.compile(r"^(#{3})\s+(.+)$")

# Matches the opening/closing of a fenced code block.
_CODE_FENCE_RE = re.compile(r"^(`{3,}|~{3,})")


def strip_boilerplate(text: str) -> str:
    """Remove the trailing O'Reilly navigation boilerplate from chapter text.

    The boilerplate typically starts with 'close x' followed by a cover image
    and a table-of-contents sidebar.  We truncate everything from that point.
    """
    match = _BOILERPLATE_PATTERN.search(text)
    if match:
        return text[: match.start()].rstrip()
    return text


def subdivide_large_chunk(chunk: Dict[str, str], max_chars: int = MAX_CHUNK_CHARS) -> List[Dict[str, str]]:
    """Subdivide a large chunk into smaller parts based on H3 or paragraphs."""
    if len(chunk["content"]) <= max_chars:
        return [chunk]

    # Try H3 split first
    lines = chunk["content"].split("\n")
    sub_chunks: List[Dict[str, str]] = []
    current_title = chunk["title"]
    current_lines = []
    in_code_fence = False
    fence_marker = ""

    for line in lines:
        fence_match = _CODE_FENCE_RE.match(line)
        if fence_match:
            marker_char = fence_match.group(1)[0]
            marker_len = len(fence_match.group(1))
            if not in_code_fence:
                in_code_fence = True
                fence_marker = marker_char
            elif marker_char == fence_marker[0] if fence_marker else '' and marker_len >= len(fence_marker):
                in_code_fence = False
                fence_marker = ""
            current_lines.append(line)
            continue

        if not in_code_fence:
            h3_match = _H3_RE.match(line)
            if h3_match:
                if current_lines:
                    content_str = "\n".join(current_lines).strip()
                    if content_str:
                        sub_chunks.append({"title": current_title, "content": content_str})
                h3_title = h3_match.group(2).strip()
                current_title = f"{chunk['title']} - {h3_title}"
                current_lines = [line]
                continue

        current_lines.append(line)

    if current_lines:
        content_str = "\n".join(current_lines).strip()
        if content_str:
            sub_chunks.append({"title": current_title, "content": content_str})

    # Verify if any sub_chunks are STILL > max_chars
    final_chunks: List[Dict[str, str]] = []
    for sc in sub_chunks:
        if len(sc["content"]) <= max_chars:
            final_chunks.append(sc)
            continue
            
        # Fallback: split by paragraph
        paragraphs = sc["content"].split("\n\n")
        part_number = 1
        current_para_group = []
        current_len = 0
        
        for para in paragraphs:
            para_len = len(para) + 2  # account for \n\n
            if current_len + para_len > max_chars and current_para_group:
                final_chunks.append({
                    "title": f"{sc['title']} - Part {part_number}",
                    "content": "\n\n".join(current_para_group).strip()
                })
                current_para_group = [para]
                current_len = para_len
                part_number += 1
            else:
                current_para_group.append(para)
                current_len += para_len
                
        if current_para_group:
            final_chunks.append({
                "title": f"{sc['title']} - Part {part_number}",
                "content": "\n\n".join(current_para_group).strip()
            })

    return final_chunks


def parse_markdown_chunks(file_path: str) -> List[Dict[str, str]]:
    """Read a Markdown file and split it into chunks on H1/H2 boundaries.

    Key behaviours:
    * Strips trailing O'Reilly boilerplate before chunking.
    * Tracks fenced code blocks (``` / ~~~) so that ``# comments`` inside
      code are **not** mistaken for Markdown headers.
    * Each returned dict has ``title`` (header text without ``#`` prefix)
      and ``content`` (full text of the section **including** the header line).

    Returns:
        A list of ``{"title": str, "content": str}`` dicts, one per section.
    """
    with open(file_path, "r", encoding="utf-8") as fh:
        raw = fh.read()

    text = strip_boilerplate(raw)
    lines = text.split("\n")

    chunks: List[Dict[str, str]] = []
    current_title: str = ""
    current_lines: List[str] = []
    in_code_fence = False
    fence_marker = ""  # tracks which fence char opened the block

    for line in lines:
        # --- Toggle code-fence tracking ---
        fence_match = _CODE_FENCE_RE.match(line)
        if fence_match:
            marker_char = fence_match.group(1)[0]  # '`' or '~'
            marker_len = len(fence_match.group(1))
            if not in_code_fence:
                in_code_fence = True
                fence_marker = marker_char
            elif marker_char == fence_marker[0] if fence_marker else '' and marker_len >= len(fence_marker):
                # Close only if same char and at least same length
                in_code_fence = False
                fence_marker = ""
            current_lines.append(line)
            continue

        # --- Check for header (only outside code fences) ---
        if not in_code_fence:
            header_match = _HEADER_RE.match(line)
            if header_match:
                # Flush previous chunk
                if current_title or current_lines:
                    content = "\n".join(current_lines).strip()
                    if content:
                        chunks.append({
                            "title": current_title,
                            "content": content,
                        })
                current_title = header_match.group(2).strip()
                current_lines = [line]
                continue

        current_lines.append(line)

    # Flush last chunk
    if current_title or current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            chunks.append({
                "title": current_title,
                "content": content,
            })

    # Subdivide oversized chunks before returning
    final_chunks = []
    for chunk in chunks:
        final_chunks.extend(subdivide_large_chunk(chunk))

    return final_chunks