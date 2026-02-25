"""Tests for the Markdown chunking logic (SOLO-39)."""
import os
import pytest
from note_taker.processing import strip_boilerplate, parse_markdown_chunks

# --- Fixtures ---

SIMPLE_MD = """# Chapter 1. Introduction

Some intro text here.

# Defining AI Agents

Agents are systems that reason.

## Types of Agents

There are many types.

# Conclusion

Final thoughts.
"""

MD_WITH_CODE_FENCES = """# Chapter 5. Orchestration

Intro text.

## Tool Selection

Here is a code block:

```python
# Initialize the LLM with GPT-4o
llm = ChatOpenAI(model_name="gpt-4o")

# Define tool groups with descriptions
tool_groups = {"Computation": {"tools": []}}
```

More text after code block.

## Semantic Tool Selection

Another section.
"""

MD_WITH_BOILERPLATE = """# Chapter 1. Introduction

Some text.

# Conclusion

Final text.

close x

![](/covers/urn:orm:book:9781098176495/200w/)

### [Building Applications with AI Agents](/library/view/building-applications-with/9781098176495/)

[Michael Albada](https://learning.oreilly.com/search/?query=author)

Published by O'Reilly Media, Inc.

queue

21% complete

Content Progress 21% completedApprox. 8 hours left

Collapse

ContentsHighlights

1. ##### [Preface](/library/view/building-applications-with/9781098176495/preface01.html)

   queue

   100% complete
"""

SINGLE_HEADER_MD = """# Glossary

Agent: A system that acts autonomously.
LLM: Large Language Model.
RAG: Retrieval-Augmented Generation.
"""


# --- strip_boilerplate tests ---

class TestStripBoilerplate:

    def test_removes_trailing_oreilly_nav(self):
        result = strip_boilerplate(MD_WITH_BOILERPLATE)
        assert "close x" not in result
        assert "### [Building Applications" not in result
        assert "queue" not in result
        assert "21% complete" not in result

    def test_preserves_content_before_boilerplate(self):
        result = strip_boilerplate(MD_WITH_BOILERPLATE)
        assert "# Chapter 1. Introduction" in result
        assert "Some text." in result
        assert "Final text." in result

    def test_no_boilerplate_returns_unchanged(self):
        result = strip_boilerplate(SIMPLE_MD)
        assert result.strip() == SIMPLE_MD.strip()


# --- parse_markdown_chunks tests ---

class TestParseMarkdownChunks:

    def test_splits_on_h1_headers(self, tmp_path):
        f = tmp_path / "simple.md"
        f.write_text(SIMPLE_MD)
        chunks = parse_markdown_chunks(str(f))
        titles = [c["title"] for c in chunks]
        assert "Chapter 1. Introduction" in titles
        assert "Defining AI Agents" in titles
        assert "Conclusion" in titles

    def test_splits_on_h2_headers(self, tmp_path):
        f = tmp_path / "simple.md"
        f.write_text(SIMPLE_MD)
        chunks = parse_markdown_chunks(str(f))
        titles = [c["title"] for c in chunks]
        assert "Types of Agents" in titles

    def test_chunk_count_simple(self, tmp_path):
        f = tmp_path / "simple.md"
        f.write_text(SIMPLE_MD)
        chunks = parse_markdown_chunks(str(f))
        assert len(chunks) == 4  # 3 H1s + 1 H2

    def test_chunk_content_includes_header(self, tmp_path):
        f = tmp_path / "simple.md"
        f.write_text(SIMPLE_MD)
        chunks = parse_markdown_chunks(str(f))
        first = chunks[0]
        assert first["content"].startswith("# Chapter 1. Introduction")

    def test_code_fence_awareness(self, tmp_path):
        """# comments inside code fences must NOT create new chunks."""
        f = tmp_path / "code.md"
        f.write_text(MD_WITH_CODE_FENCES)
        chunks = parse_markdown_chunks(str(f))
        titles = [c["title"] for c in chunks]
        # Should NOT have "Initialize the LLM..." or "Define tool groups..." as chunk titles
        assert not any("Initialize" in t for t in titles)
        assert not any("Define tool" in t for t in titles)
        # Should have exactly 3 chunks: Ch5 heading, Tool Selection, Semantic Tool Selection
        assert len(chunks) == 3

    def test_strips_boilerplate_before_chunking(self, tmp_path):
        f = tmp_path / "boiler.md"
        f.write_text(MD_WITH_BOILERPLATE)
        chunks = parse_markdown_chunks(str(f))
        all_content = " ".join(c["content"] for c in chunks)
        assert "close x" not in all_content
        assert "### [Building Applications" not in all_content

    def test_single_header_returns_one_chunk(self, tmp_path):
        f = tmp_path / "glossary.md"
        f.write_text(SINGLE_HEADER_MD)
        chunks = parse_markdown_chunks(str(f))
        assert len(chunks) == 1
        assert chunks[0]["title"] == "Glossary"


class TestParseRealChapters:
    """Integration tests against the actual raw data files."""

    DATA_DIR = os.path.join(
        os.path.dirname(__file__), "..", "data", "raw", "building-applications-with"
    )

    @pytest.mark.skipif(
        not os.path.exists(
            os.path.join(os.path.dirname(__file__), "..", "data", "raw", "building-applications-with", "chapter_000.md")
        ),
        reason="Raw data files not present"
    )
    def test_chapter_000_no_code_fences(self):
        """chapter_000.md has 0 code fences, 12 H1s, 4 H2s = 16 real content chunks."""
        path = os.path.join(self.DATA_DIR, "chapter_000.md")
        chunks = parse_markdown_chunks(path)
        titles = [c["title"] for c in chunks]
        # Must contain known headers
        assert "Chapter 1. Introduction to Agents" in titles
        assert "Defining AI Agents" in titles
        assert "Conclusion" in titles
        # No boilerplate chunks
        assert not any("Building Applications" in t for t in titles)
        # 12 H1 + 4 H2 = 16 real chunks
        assert len(chunks) == 16

    @pytest.mark.skipif(
        not os.path.exists(
            os.path.join(os.path.dirname(__file__), "..", "data", "raw", "building-applications-with", "chapter_005.md")
        ),
        reason="Raw data files not present"
    )
    def test_chapter_005_code_fence_heavy(self):
        """chapter_005.md has many code blocks with # comments.
        Must NOT create chunks from code comments."""
        path = os.path.join(self.DATA_DIR, "chapter_005.md")
        chunks = parse_markdown_chunks(path)
        titles = [c["title"] for c in chunks]
        # Must NOT have code-comment chunks
        assert not any("Initialize the LLM" in t for t in titles)
        assert not any("Define tool groups" in t for t in titles)
        assert not any("Initialize OpenAI" in t for t in titles)
        # Must have real headers
        assert "Chapter 5. Orchestration" in titles
        assert "Agent Types" in titles
        assert "Tool Selection" in titles