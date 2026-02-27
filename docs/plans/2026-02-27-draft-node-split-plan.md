# Draft Node Split & API Load Balancing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the `draft_node` into `outline` and `qa` nodes to improve quality via N:1 mapping, and implement a Tiered LLM Factory to utilize all 9 API keys (Groq, SambaNova, Cerebras).

**Architecture:** 
1. `models.py`: Split `DraftResponse` into `OutlineResponse` and `QADraftResponse`.
2. `llm.py`: Update `get_llm` to be a `TieredLLMFactory` that accepts `tier="fast" | "reasoning"` and rotates across specific models and keys.
3. `nodes.py`: Replace `draft_node` with `outline_draft_node` and `qa_draft_node`. Update prompts for N:1 (1-3 questions per subtopic) Q&A generation.
4. `graph.py`: Wire the new nodes into the state machine.

**Tech Stack:** `langgraph`, `langchain`, `pydantic`.

---

### Task 1: Update Models

**Files:**
- Modify: `src/note_taker/models.py`

**Step 1: Write the failing test**
Create/Modify: `tests/test_models.py`
Add tests to verify `OutlineResponse` and `QADraftResponse` can be instantiated and validated.

**Step 2: Write minimal implementation**
In `src/note_taker/models.py`, replace `DraftResponse` with:
```python
class OutlineResponse(BaseModel):
    """LLM response from the outline draft node."""
    outline: List[OutlineItem]

class QADraftResponse(BaseModel):
    """LLM response from the QA draft node."""
    qa_pairs: List[QuestionAnswerPair]
```

**Step 3: Run test to verify it passes**
Run: `pytest tests/test_models.py`

**Step 4: Commit**
```bash
git add src/note_taker/models.py tests/test_models.py
git commit -m "feat: split DraftResponse into OutlineResponse and QADraftResponse"
```

---

### Task 2: Implement Tiered LLM Factory

**Files:**
- Modify: `src/note_taker/llm.py`
- Modify: `pyproject.toml` (ensure `langchain-cerebras` and `langchain-sambanova` are present)

**Step 1: Write the failing test**
Create/Modify: `tests/test_llm.py`
Test `get_llm(tier="fast")` returns expected models and `get_llm(tier="reasoning")` returns expected heavy models. Test rotation state if possible.

**Step 2: Write minimal implementation**
In `src/note_taker/llm.py`:
- Parse the 9 keys from `.env`.
- Implement `get_llm(tier: str = "reasoning") -> BaseChatModel`.
- For `tier="fast"`, round-robin across:
  - Cerebras (`llama3.1-8b`) - keys 1, 2, 3
  - Groq (`llama-3.1-8b-instant`) - keys 1, 2, 3
- For `tier="reasoning"`, round-robin across:
  - SambaNova (`DeepSeek-R1-Distill-Llama-70B`) - keys 1, 2, 3
  - Groq (`llama-3.3-70b-versatile`) - keys 1, 2, 3

**Step 3: Run test to verify it passes**
Run: `pytest tests/test_llm.py`

**Step 4: Commit**
```bash
git add src/note_taker/llm.py tests/test_llm.py
git commit -m "feat: implement tiered LLM factory with explicit model routing"
```

---

### Task 3: Implement Outline Node

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `src/note_taker/pipeline/state.py`

**Step 1: Update State**
In `state.py`, add `outline: Optional[List[OutlineItem]]` to `GraphState`.

**Step 2: Write implementation**
In `nodes.py`:
- Create `OUTLINE_SYSTEM_PROMPT`.
- Create `outline_draft_node(state: GraphState) -> dict`. It calls `get_llm(tier="fast")` and returns `{"outline": response.outline}`.

**Step 3: Run test to verify syntax**
Run: `pytest tests/pipeline/test_nodes.py` (Will need to update existing tests to mock the new node).

**Step 4: Commit**
```bash
git add src/note_taker/pipeline/nodes.py src/note_taker/pipeline/state.py
git commit -m "feat: implement outline_draft_node using fast tier"
```

---

### Task 4: Implement QA Draft Node (N:1 Mapping)

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`

**Step 1: Write implementation**
In `nodes.py`:
- Create `QA_SYSTEM_PROMPT` emphasizing the N:1 rule (1 to 3 questions per Level 2 subtopic depending on density).
- Create `qa_draft_node(state: GraphState) -> dict`. It calls `get_llm(tier="reasoning")`, passing both `state["source_content"]` and `state["outline"]`.
- It constructs the `FinalArtifactV1` using the state's outline and the new `qa_pairs`.

**Step 2: Run test to verify syntax**
Update and run `pytest tests/pipeline/test_nodes.py`.

**Step 3: Commit**
```bash
git add src/note_taker/pipeline/nodes.py
git commit -m "feat: implement qa_draft_node with flexible 1-3 Q&A mapping"
```

---

### Task 5: Wire Graph and Update Existing Nodes

**Files:**
- Modify: `src/note_taker/pipeline/graph.py`
- Modify: `src/note_taker/pipeline/nodes.py`

**Step 1: Write implementation**
- In `graph.py`, replace `draft_node` with `outline_draft_node` -> `qa_draft_node`. Update edges.
- In `nodes.py`, ensure `judge_node` uses `get_llm(tier="fast")` and `revise_node` uses `get_llm(tier="reasoning")`.

**Step 2: Run tests**
Run: `pytest tests/pipeline/test_graph.py tests/pipeline/test_nodes.py`

**Step 3: Commit**
```bash
git add src/note_taker/pipeline/graph.py src/note_taker/pipeline/nodes.py
git commit -m "feat: wire split draft nodes into state graph"
```