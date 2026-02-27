import sqlite3
import json

db = sqlite3.connect(".note-taker.db")
cursor = db.cursor()
cursor.execute("SELECT id, artifact_json FROM processed_content WHERE id LIKE 'BuildingAIAgents:Chapter5%' ORDER BY id")
rows = cursor.fetchall()

if not rows:
    print("No rows found!")

with open("data/building-applications-with/chapter_005_output.md", "w") as f:
    f.write("# Building AI Agents: Chapter 5 Active Recall Notes\n\n")
    for row in rows:
        chunk_id = row[0]
        data = json.loads(row[1])
        f.write(f"## {chunk_id}\n\n")
        f.write("### Outline\n")
        for item in data.get("outline", []):
            indent = "  " * (item["level"] - 1)
            f.write(f"{indent}- {item['title']}\n")
        f.write("\n### Q&A\n")
        for qa in data.get("qa_pairs", []):
            f.write(f"**Q:** {qa['question']}\n")
            f.write(f"**A:** {qa['answer']}\n")
            f.write(f"*Context:* {qa['source_context']}\n")
            
            # Show judge scores if any
            if qa.get('judge_score'):
                f.write(f"*Judge Score:* {qa['judge_score']}\n")
                if qa.get('judge_feedback'):
                    f.write(f"*Judge Feedback:* {qa['judge_feedback']}\n")
            f.write("\n")

print(f"Export completed: {len(rows)} chunks saved.")
