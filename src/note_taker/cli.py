"""Typer CLI entrypoint for the note-taker pipeline (SOLO-39)."""
import hashlib
from pathlib import Path
from typing import Optional

import typer
from rich import print as rprint

from note_taker.processing import parse_markdown_chunks
from note_taker.database import DatabaseManager

app = typer.Typer(
    name="note-taker",
    help="Transform Markdown chapters into active recall artifacts.",
)


def _hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


@app.command()
def process(
    book_chapter: str = typer.Argument(
        ...,
        help='Book and chapter identifier, e.g. "BuildingAIAgents:Chapter1"',
    ),
    file_path: Path = typer.Argument(
        ...,
        help="Path to the Markdown file to process.",
        exists=False,  # we do manual validation for better error messages
    ),
    force_refresh: bool = typer.Option(
        False, "--force-refresh", help="Re-process all chunks even if unchanged."
    ),
) -> None:
    """Read a Markdown chapter, chunk it, and run the processing pipeline."""

    # --- Validate input file ---
    if not file_path.exists():
        rprint(f"[red]Error: File not found — {file_path}[/red]")
        raise typer.Exit(code=1)

    rprint(f"[bold]note-taker[/bold]  Processing [cyan]{file_path.name}[/cyan]")
    rprint(f"  Identifier : [yellow]{book_chapter}[/yellow]")

    # --- Chunk the file ---
    chunks = parse_markdown_chunks(str(file_path))
    rprint(f"  Chunks found: [green]{len(chunks)}[/green]")

    if not chunks:
        rprint("[yellow]No chunks found. Nothing to do.[/yellow]")
        raise typer.Exit(code=0)

    # --- Process single chapter ---
    from note_taker.pipeline.graph import build_graph
    
    db = DatabaseManager()
    db.ensure_database()
    graph = build_graph()

    source_hash = _hash("".join(c["content"] for c in chunks))

    if not force_refresh and db.check_hash(book_chapter, source_hash):
        rprint(f"  [dim]> {book_chapter} - unchanged, skipping[/dim]")
        raise typer.Exit(code=0)

    rprint(f"  [blue]* {book_chapter}[/blue] - processing mastery brief and QA...")
    
    initial_state = {
        "chunk_id": book_chapter,
        "source_chunks": chunks,
        "source_hash": source_hash,
        "force_refresh": bool(force_refresh),
        "chunk_outlines": None,
        "mastery_brief": None,
        "brief_revision_count": 0,
        "artifact": None,
        "qa_revision_count": 0,
        "skip_processing": False,
        "persist_locally": True,
    }
    
    try:
        graph.invoke(initial_state)
        rprint()
        rprint(f"[green]Done.[/green] Successfully processed {book_chapter}.")
    except Exception as e:
        rprint(f"  [red]x {book_chapter} failed: {e}[/red]")

if __name__ == "__main__":
    app()