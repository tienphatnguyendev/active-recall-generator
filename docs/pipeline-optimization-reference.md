# Pipeline Optimization Reference — SOLO-157

> **Result: avg 37.7s → 2.8s (13.5x improvement)**  
> Date: 2026-03-04 | Branch: `feature/SOLO-157-pipeline-optimization`

---

## Table of Contents

1. [Agent Architecture](#1-agent-architecture)
2. [Pipeline Workflow](#2-pipeline-workflow)
3. [Structured JSON Output Techniques](#3-structured-json-output-techniques)
4. [Prompt Engineering for Small Models](#4-prompt-engineering-for-small-models)
5. [Multi-Provider Resilience Layer](#5-multi-provider-resilience-layer)
6. [Performance Bottleneck Analysis](#6-performance-bottleneck-analysis)
7. [Benchmark Results](#7-benchmark-results)

---

## 1. Agent Architecture

### Pattern: Self-Improvement Loop (Self-Refine)

After studying [17 agentic architectures](https://github.com/FareedKhan-dev/all-agentic-architectures), our pipeline maps to **Architecture 15: Self-Improvement Loop** — an iterative Draft → Critique → Revise cycle where the agent's own output is evaluated and refined until it meets a quality bar.

```
                                    ┌──────────────┐
                                    │  revise_node │
                                    │  (fast tier)  │
                                    └──────┬───────┘
                                           │
                                           ▼
START → check_db → outline_draft → qa_draft → judge ──┐
                    (fast)         (fast)     (fast)    │
                                                       ▼
                                              score ≥ 0.8? ──yes──→ save → END
                                                       │
                                                       no (or max 3 revisions)
                                                       │
                                              ┌────────┘
                                              ▼
                                        revise → judge (loop back)
```

### Why Self-Refine and Not Other Patterns

| Pattern | Verdict | Reason |
|---------|---------|--------|
| **Self-Refine (15)** | ✅ Used | Our task IS iterative refinement — generate → score → fix |
| **Reflection (1)** | ✅ Subset | Self-Refine subsumes reflection; our judge IS the critic |
| **PEV (6)** | ⚠️ Inspired | Borrowed the "verify each step, recover on failure" principle for circuit breaker |
| **Ensemble (13)** | ❌ Rejected | Multiplies API calls — kills free-tier TPM budget |
| **Planning (4)** | ❌ Rejected | Over-engineered for a fixed pipeline; we know the steps upfront |
| **Simulator (10)** | ❌ Rejected | No real-world consequences to simulate — we're generating study cards |

### Key Architecture Decisions

1. **Separate Outline + QA nodes** (not monolithic): Outline anchors QA count, prevents under/over-generation
2. **Fast tier for ALL nodes** (including judge): Scoring is structured evaluation, not reasoning — 8B models handle it with grammar constraints
3. **Quality threshold = 0.8**: Empirically tuned to trigger revision ~20-30% of the time
4. **Max 3 revision loops**: Hard cap to prevent infinite loops on adversarial/ambiguous inputs

---

## 2. Pipeline Workflow

### LangGraph State Machine

The pipeline is orchestrated by [LangGraph](https://langchain-ai.github.io/langgraph/), a framework for building stateful multi-agent workflows as directed graphs.

**File:** `src/note_taker/pipeline/graph.py`

```python
# Graph structure
START → check_database_node → [skip?] → END
                            → outline_draft_node → qa_draft_node → judge_node
                                                                      ↓
                                                              should_continue()
                                                              ├── score ≥ 0.8 → save_to_db_node → END
                                                              ├── revisions < 3 → revise_node → judge_node (loop)
                                                              └── revisions ≥ 3 → save_to_db_node → END
```

### Node Responsibilities

| Node | Purpose | Tier | Token Est. | Schema |
|------|---------|------|-----------|--------|
| `check_database_node` | Cache check via SQLite hash | N/A | N/A | N/A |
| `outline_draft_node` | Extract 2-level topic outline | fast | 400 | `OutlineResponse` |
| `qa_draft_node` | Generate 1 Q&A per L2 item | fast | 600 | `QADraftResponse` |
| `judge_node` | Score each Q&A on 3 criteria | fast | 800 | `JudgeVerdict` |
| `revise_node` | Rewrite failing Q&A pairs | fast | 600 | `RevisionResponse` |
| `save_to_db_node` | Persist to SQLite | N/A | N/A | N/A |

### State Schema

**File:** `src/note_taker/pipeline/state.py`

```python
class GraphState(TypedDict):
    chunk_id: str                    # Unique ID for the text chunk
    source_content: str              # Raw markdown content
    source_hash: str                 # SHA-256 for cache invalidation
    force_refresh: bool              # Bypass cache
    artifact: Optional[FinalArtifactV1]  # The evolving output
    outline: Optional[OutlineResponse]   # Intermediate outline
    skip_processing: bool            # Set by check_db if cached
    revision_count: int              # Tracks revision loop iterations
    persist_locally: bool            # Whether to write to SQLite
```

---

## 3. Structured JSON Output Techniques

This is the most technically nuanced part of the pipeline. We need **guaranteed valid JSON** from LLMs, but different providers handle this differently.

### The Two Paths

**File:** `src/note_taker/llm.py` → `_invoke_single_outlines()`

```python
def _invoke_single_outlines(model, prompt, schema, config, token_estimate=500):
    supports_json_schema = config.get("supports_json_schema", True)

    if supports_json_schema:
        # Path A: Grammar-constrained decoding
        result = model(prompt, output_type=schema)
    else:
        # Path B: Schema-in-prompt fallback
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        modified_prompt = prompt + f"\n\nYou must output ONLY valid JSON matching this schema:\n```json\n{schema_json}\n```"
        result = model(modified_prompt)
```

### Path A: Grammar-Constrained Decoding (Outlines)

**Used by:** Cerebras (`llama3.1-8b`) — `supports_json_schema: True` (default)

How it works:
1. [Outlines](https://github.com/dottxt-ai/outlines) converts the Pydantic schema into a finite-state machine (FSM)
2. At each token generation step, the FSM masks out tokens that would produce invalid JSON
3. The model can ONLY generate tokens that result in valid JSON matching the schema
4. **Zero post-processing needed** — output is always valid

```python
# Outlines wraps the OpenAI client
model = outlines.from_openai(client, "llama3.1-8b")
# Grammar constraint is applied via output_type
result = model(prompt, output_type=QADraftResponse)  # Always valid JSON
```

**Advantages:**
- 100% JSON validity guarantee at the token level
- No schema bloat in the prompt (saves input tokens, reduces latency)
- Model focuses on content, not format

**When to use:** Always prefer this when the provider and model support it.

### Path B: Schema-in-Prompt Fallback

**Used by:** Groq models (`llama-4-scout`, `llama-4-maverick`, `llama-3.3-70b`) — `supports_json_schema: False`

How it works:
1. Pydantic schema is serialized to JSON Schema and appended to the prompt
2. Model generates free-form text (hopefully JSON)
3. We strip markdown code fences and validate with Pydantic

```python
# Append schema to prompt
schema_json = json.dumps(schema.model_json_schema(), indent=2)
modified_prompt = prompt + f"\n\nOutput ONLY valid JSON matching this schema:\n```json\n{schema_json}\n```"

# Generate without grammar constraints
result = model(modified_prompt)

# Post-processing: clean markdown fences
if isinstance(result, str):
    clean_str = result.strip()
    if clean_str.startswith("```json"):
        clean_str = clean_str[7:]
    if clean_str.endswith("```"):
        clean_str = clean_str[:-3]
    return schema.model_validate_json(clean_str.strip())
```

**Risks and mitigations:**
- Model might wrap JSON in markdown → strip ````json` and ```` ``` ````
- Model might add commentary → "Output ONLY valid JSON" instruction
- Model might produce invalid JSON → Pydantic `model_validate_json` raises `ValidationError`, circuit breaker fails over

### Pydantic Model Validators for Robustness

**File:** `src/note_taker/models.py`

Some models return `{"outline": "[{\"title\": ...}]"}` — a stringified JSON array inside a JSON object. The `@model_validator(mode="before")` handles this:

```python
class OutlineResponse(BaseModel):
    outline: List[LLMOutlineItem]

    @model_validator(mode="before")
    @classmethod
    def parse_str_to_list(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "outline")

def _parse_embedded_json(data, field_name):
    """If a field value is a JSON string, parse it into a proper object."""
    if isinstance(data, dict):
        val = data.get(field_name)
        if isinstance(val, str):
            try:
                data[field_name] = json.loads(val)
            except json.JSONDecodeError:
                data[field_name] = ast.literal_eval(val)
    return data
```

This handles 3 failure modes:
1. **Normal dict** → pass through
2. **Stringified JSON** → `json.loads()` parses it
3. **Python literal string** → `ast.literal_eval()` as final fallback

### Provider Config: `supports_json_schema` Flag

```python
TIER_CONFIGS = {
    "fast": [
        {
            "provider": "cerebras",
            "model": "llama3.1-8b",
            # supports_json_schema defaults to True → Path A (grammar-constrained)
        },
        {
            "provider": "groq",
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "supports_json_schema": False,  # → Path B (schema-in-prompt)
        },
    ],
}
```

**Rule of thumb:** Set `supports_json_schema: False` when:
- The provider doesn't support OpenAI-compatible `response_format.json_schema`
- The model frequently produces malformed JSON with grammar constraints
- You observe outlines raising errors about unsupported schema features

---

## 4. Prompt Engineering for Small Models

Small models (8B–17B parameters) behave fundamentally differently from large models (70B+). Here are the principles we learned and applied.

### Principle 1: Terse > Verbose

Large models can follow nuanced, paragraph-long instructions. Small models get confused. We replaced verbose prompts with minimal, imperative ones.

```diff
- """You are an expert educator planning a study session.
- Given a section of a textbook, generate a 2-level hierarchical outline of the key concepts.
- Level 1 should cover main topics. Level 2 should cover detailed subtopics.
- This outline will be used to generate active recall questions."""

+ """Extract a 2-level outline from the text below.
+ Level 1 = main topics (typically section headings).
+ Level 2 = key facts or concepts under each topic.
+ Output ONLY the outline items, nothing else."""
```

**Why:** The grammar constraint already enforces the JSON structure, so the prompt only needs to guide *content selection*, not formatting.

### Principle 2: Field Contracts > Vague Rules

Instead of "questions should test understanding," we give explicit field-level specifications with bounds:

```python
QA_SYSTEM_PROMPT = """You are a study-card generator.

Task: Given source text and a hierarchical outline, output EXACTLY one
active-recall Q&A pair for every Level-2 outline item — no more, no fewer.

Field contract:
- question : single sentence; tests a concept or mechanism from the source; self-contained
- answer   : 1–3 sentences; fully answers the question using only information in the source
- source_context : ≤ 2 verbatim or near-verbatim sentences from the source that support the answer

Do NOT invent facts outside the source. Do NOT add commentary."""
```

**Key elements:**
- **"EXACTLY one per Level-2 item"** — explicit count anchor prevents under/over-generation
- **"single sentence"** / **"1–3 sentences"** — hard bounds on field length
- **"verbatim or near-verbatim"** — prevents hallucination in source_context
- **"Do NOT"** — small models respond well to explicit prohibitions

### Principle 3: Few-Shot Calibration for Scoring

The judge prompt uses concrete scoring examples to anchor the model's numeric scale:

```python
JUDGE_SYSTEM_PROMPT = """Score each Q&A pair. Be strict — do NOT give high scores
to vague or trivial items.

Criteria (0.0–1.0 each):
- accuracy_score: answer is factually correct per the source
- clarity_score: question is clear and unambiguous
- recall_worthiness_score: question tests understanding, not just a yes/no or trivial fact
- overall_score: average of the three

Examples:
- Q: "What drives evaporation?" A: "Solar heating converts liquid water to vapor." → overall 0.9
- Q: "What is evaporation?" A: "Water goes up." → overall 0.4 (vague, incomplete)
- Q: "Is water wet?" A: "Yes." → overall 0.2 (trivial)

Provide feedback for any pair scoring below 0.8. Reference by index (0-based)."""
```

**Why this works for small models:**
- "Be strict" + "do NOT give high scores" counters the default sycophantic bias
- Three concrete examples anchor the 0.2 / 0.4 / 0.9 scale
- Small models calibrate their own scores relative to the examples

### Principle 4: Count Anchoring in Prompts

The QA node explicitly tells the model how many items to generate:

```python
prompt = (
    f"### Outline ({len(level2_items)} Level-2 items → generate {len(level2_items)} Q&A pairs)\n"
    f"{outline_text}"
)
```

Without this, 8B models frequently generate 1-2 pairs regardless of outline length, or hallucinate extra pairs not anchored to the outline.

---

## 5. Multi-Provider Resilience Layer

### Architecture Overview

```
invoke_outlines_with_backoff()
    │
    ├── for each provider in TIER_CONFIGS[tier]:
    │       ├── circuit_breaker.is_allowed(provider)?
    │       ├── tracker.wait_if_needed(provider, tokens)?
    │       ├── openai.OpenAI(timeout=10.0)
    │       ├── outlines.from_openai(client, model)
    │       ├── _invoke_single_outlines(model, prompt, schema)
    │       │       ├── [Path A] grammar-constrained
    │       │       └── [Path B] schema-in-prompt
    │       ├── on success → circuit_breaker.record_success(), return
    │       └── on failure → circuit_breaker.record_failure(), try next
    │
    └── all failed → raise RuntimeError("All providers exhausted")
```

### Per-Provider Token Tracking

**The single biggest performance fix (37.7s → 2.8s).**

**Problem:** A global `TokenTracker` with a 6,000 TPM limit was shared across all providers. Cerebras has 12k TPM and Groq has 30k TPM independently. After 2 fast calls (~400+600 tokens), the shared budget triggered 60-second sleeps even though neither provider was near its limit.

**Solution:** Per-provider tracking with each provider's actual TPM:

```python
class TokenTracker:
    def __init__(self):
        self._usage: Dict[str, deque] = {}    # provider_id → deque[(timestamp, tokens)]
        self._limits: Dict[str, int] = {}     # provider_id → tpm

    def set_limit(self, provider_id: str, tpm: int):
        self._limits[provider_id] = tpm

    def wait_if_needed(self, provider_id: str, estimated_next_tokens: int):
        limit = self._limits.get(provider_id, 6000)
        # Only wait if THIS provider's 60s window is full
        ...
```

Each provider's TPM is declared in `TIER_CONFIGS`:

```python
{"provider": "cerebras", "model": "llama3.1-8b", "tpm": 12_000}
{"provider": "groq", "model": "llama-4-scout-17b", "tpm": 30_000}
```

### Circuit Breaker

Tracks consecutive failures per provider. After 2 failures within 60s, the provider is temporarily disabled (circuit "open"). After 60s cooldown, one retry is allowed (half-open state).

```python
class ProviderCircuitBreaker:
    failure_threshold = 2    # failures before circuit opens
    reset_timeout = 60       # seconds before half-open retry

    def record_failure(self, provider_id): ...
    def record_success(self, provider_id): ...  # resets counter
    def is_allowed(self, provider_id) -> bool: ...
```

### Per-Request Timeout

```python
client = openai.OpenAI(base_url=base_url, api_key=api_key, timeout=10.0)
```

Caps individual HTTP requests at 10 seconds. When a provider hangs (e.g., Cerebras cold start), `openai.APITimeoutError` is raised → circuit breaker records failure → next provider is tried.

### Error Classification

```python
_PERMANENT_ERROR_TYPES = (NotFoundError, AuthenticationError)

def _is_permanent_error(exc):
    """Permanent errors skip circuit breaker (don't penalize provider for config issues)."""
    return isinstance(exc, _PERMANENT_ERROR_TYPES) or \
           any(tag in str(exc).lower() for tag in ("model_not_found", "does not exist"))
```

- **Permanent errors** (wrong model name, bad API key): Don't trip circuit breaker, skip to next provider
- **Transient errors** (rate limit, timeout, server error): Trip circuit breaker, may disable provider temporarily

---

## 6. Performance Bottleneck Analysis

### Root Cause Breakdown

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | Global TokenTracker with 6k TPM | +60s sleep between pipeline runs | Per-provider tracking with actual TPM limits |
| 2 | `judge_node` on `reasoning` tier (120B model) | 24s avg for a simple scoring task | Moved to `fast` tier (8B model, 0.6s avg) |
| 3 | Inflated `token_estimate` values (1000-1500) | TokenTracker thought each call was 3x larger | Reduced to realistic values (400-800) |
| 4 | No per-request timeout | Cerebras cold starts caused 59s outliers | Added `timeout=10.0` to OpenAI client |
| 5 | Generic prompts for 8B models | Wasted tokens, confused small models | Tightened prompts with field contracts and count anchors |
| 6 | `revise_node` on `reasoning` tier | 120B model for a simple rewrite | Moved to `fast` tier |

### What We Measured vs. What We Thought

The benchmark showed `judge_node` averaging 24s. We initially assumed this was model inference time (120B model is slow). In reality:

- **Actual model inference:** 0.5–1.5s (even for 120B)
- **TokenTracker sleep:** 20–58s (waiting for the rolling 60s window to clear)

The fix wasn't just moving the judge to a faster tier — it was eliminating the artificial throttle sleep that dominated wall-clock time.

---

## 7. Benchmark Results

### Before Optimization (5 runs)

```
│ Stage                  │      Min (s) │      Avg (s) │      Max (s) │
│ outline_draft_node     │        0.550 │       12.448 │       58.247 │
│ qa_draft_node          │        0.582 │        0.832 │        1.239 │
│ judge_node             │        0.838 │       24.404 │       59.551 │
│ revise_node            │        0.000 │        0.000 │        0.000 │  ← skipped
│ TOTAL                  │        2.863 │       37.688 │       61.034 │
```

### After Optimization (3 runs)

```
│ Stage                  │      Min (s) │      Avg (s) │      Max (s) │
│ outline_draft_node     │        0.741 │        1.198 │        2.014 │
│ qa_draft_node          │        0.755 │        0.940 │        1.084 │
│ judge_node             │        0.544 │        0.630 │        0.774 │
│ revise_node            │        0.000 │        0.000 │        0.000 │  ← skipped
│ TOTAL                  │        2.070 │        2.771 │        3.878 │
```

### Per-Run Detail (with new benchmark logging)

```
Run 1: outline=2.0s → qa=1.1s → judge=0.8s  (TOTAL=3.9s)
       Providers: cerebras:llama3.1-8b → groq:llama-4-scout → groq:llama-4-maverick
       Judge scores: [0.93, 0.93, 0.90]

Run 2: outline=0.7s → qa=0.8s → judge=0.6s  (TOTAL=2.1s)
       Providers: cerebras:llama3.1-8b → groq:llama-4-scout → groq:llama-4-maverick
       Judge scores: [0.93, 0.90, 0.90]

Run 3: outline=0.8s → qa=1.0s → judge=0.5s  (TOTAL=2.4s)
       Providers: cerebras:llama3.1-8b → groq:llama-4-scout → groq:llama-4-maverick
       Judge scores: [0.93, 0.90, 0.87]
```

### Key Files Changed

| File | What Changed |
|------|-------------|
| [llm.py](../src/note_taker/llm.py) | Per-provider TokenTracker, 10s timeout, circuit breaker |
| [nodes.py](../src/note_taker/pipeline/nodes.py) | All prompts rewritten for 8B, token estimates reduced, all nodes on fast tier |
| [graph.py](../src/note_taker/pipeline/graph.py) | Quality threshold 0.7 → 0.8 |
| [models.py](../src/note_taker/models.py) | `@model_validator` for stringified JSON robustness |
| [benchmark_pipeline.py](../scripts/benchmark_pipeline.py) | Per-run logging, provider visibility, judge score display |
| [test_llm.py](../tests/test_llm.py) | Added `APITimeoutError` failover test |
