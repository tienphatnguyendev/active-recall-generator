import asyncio
from note_taker.pipeline.graph import build_graph
from note_taker.pipeline.state import GraphState

async def main():
    graph = build_graph()
    initial_state = {
        "chunk_id": "test_chunk_id",
        "source_content": "This is a test content.",
        "source_hash": "",
        "force_refresh": True,
        "artifact": None,
        "outline": None,
        "skip_processing": False,
        "revision_count": 0,
        "persist_locally": False,
    }

    print("Starting stream...")
    for node_output in graph.stream(initial_state):
        print(f"Yielded: {node_output}")
        for node_name, output in node_output.items():
            print(f"Node: {node_name}, Output: {output}, Type: {type(output)}")

asyncio.run(main())
