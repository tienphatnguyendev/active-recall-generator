"""Tests for the Typer CLI entrypoint (SOLO-39)."""
import os
import pytest
from typer.testing import CliRunner
from note_taker.cli import app

runner = CliRunner()


class TestCliInvocation:

    def test_help_flag(self):
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "process" in result.output.lower() or "Usage" in result.output

    def test_missing_arguments_shows_error(self):
        result = runner.invoke(app, [])
        assert result.exit_code != 0

    def test_nonexistent_file_shows_error(self):
        result = runner.invoke(app, ["TestBook:Ch1", "/tmp/nonexistent_file_xyz.md"])
        assert result.exit_code != 0
        assert "not found" in result.output.lower() or "Error" in result.output or "error" in result.output

    def test_valid_file_processes_chunks(self, tmp_path):
        md = tmp_path / "test_chapter.md"
        md.write_text("# Section One\n\nHello world.\n\n# Section Two\n\nGoodbye.\n")
        result = runner.invoke(app, ["TestBook:Ch1", str(md)])
        assert result.exit_code == 0
        assert "2" in result.output  # Should report 2 chunks

    def test_force_refresh_flag(self, tmp_path):
        md = tmp_path / "test_chapter.md"
        md.write_text("# One\n\nText.\n")
        result = runner.invoke(app, ["TestBook:Ch1", str(md), "--force-refresh"])
        assert result.exit_code == 0


class TestCliWithRealData:

    DATA_DIR = os.path.join(
        os.path.dirname(__file__), "..", "data", "raw", "building-applications-with"
    )

    @pytest.mark.skipif(
        not os.path.exists(
            os.path.join(os.path.dirname(__file__), "..", "data", "raw", "building-applications-with", "chapter_000.md")
        ),
        reason="Raw data files not present"
    )
    def test_chapter_000_dry_run(self):
        path = os.path.join(self.DATA_DIR, "chapter_000.md")
        result = runner.invoke(app, ["BuildingAIAgents:Chapter1", path])
        assert result.exit_code == 0
        # Should process 16 chunks
        assert "16" in result.output
