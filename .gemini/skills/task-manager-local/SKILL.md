---
name: task-manager
description: Organizes workflows by unifying high-level planning in a Notion "Projects Hub" with granular action execution and daily proposals in Linear.
---

# Task Manager

## Overview

This skill manages your entire workflow by integrating a Notion database ("Projects Hub") for high-level planning and goals, with your Linear projects for day-to-day granular task execution. Notion acts as the "Brain" (features, goals, notes) while Linear acts as the "Muscle" (tasks, sub-tasks, daily logs).

## Prerequisites

To use this skill, the system expects you to have:
1.  **Notion "Projects Hub" Database:** A dedicated database (ID: `30e111cd-95f6-819b-9319-c83b11f174fc`) with the following properties:
    *   `Project Name` (Title)
    *   `Status` (Status: Backlog, In Progress, Blocked, Completed)
    *   `Priority` (Select: High, Medium, Low)
    *   `Linear Link` (URL)
    *   `Tags` (Multi-select)
2.  **Linear Team:** The primary execution team (e.g., `Solo`, ID: `afc070b3-8cdb-4314-9167-d039039b7ba7`).

## Intent Handling

### 1. Start a New High-Level Project/Goal

**Trigger:** "I want to start a new project called [Name]..." or "New Goal: [Name]..."

**Procedure:**
1.  **Create Notion Parent (The Plan):**
    *   Create a new page in the Notion "Projects Hub" database.
    *   Set `Project Name` to [Name].
    *   Set `Status` (Select) explicitly to `In Progress` (or user specified).
    *   Set `Priority` (Select) explicitly to `Medium` (default) or based on user request.
2.  **Create Linear Project (The Execution Space):**
    *   Use the `mcp_linear-mcp-server_save_project` tool to create a new project in your main team.
    *   Explicitly set the project `name`: [Name].
    *   Explicitly set the project `state`: `started` (or `planned` if Backlog).
    *   Explicitly set the project `priority`: 3 (Medium) or matching the Notion priority.
3.  **Link Systems:**
    *   Update the Notion entry's `Linear Link` property (URL) with the newly created Linear Project URL.
4.  **Format Output:** Present a success summary with links to both the Notion Plan and Linear Project.

### 2. Create Granular Tasks (CRUD Operations)

**Trigger:** "Add a task to [Project Name]..." or "I need to fix [Bug]..."

**Procedure:**
1.  **Check for Specified Project Context:** 
    *   *Condition:* Did the user specify which project this task belongs to?
    *   *If Yes:* Use `mcp_linear-mcp-server_list_projects` with a query matching the user's string to find the correct `projectId`.
    *   *If No:* Proceed without a specific `projectId` (it will be created logically as a loose task or you must prompt the user to specify one if ambiguous).
2.  **Determine Task Metadata:**
    *   Determine the issue Title/Description based on the user's prompt. 
    *   **CRITICAL NAMING RULE:** Enforce a "Clean" naming convention for the Title. Do NOT use bracketed tags (e.g., `[Bug]`, `[Feature]`, `[Phase 1]`, `[Project Name]`) in the task title. Use Linear fields (Projects, Labels, Milestones) to categorize tasks instead. The title should only be a concise, action-oriented description of the task (e.g., "Implement Application Kanban Board" instead of "[Phase 4] Application Kanban Board").
    *   Determine the Priority (0-4 in Linear) based on the user's prompt (default to 3/Normal if not specified).
    *   Check for relevant labels (e.g., if strictly a "Bug", use the Bug label ID; if a "Feature", use the Feature label ID). You may use `mcp_linear-mcp-server_list_issue_labels` if unsure.
3.  **Execute Issue Creation in Linear:**
    *   Call `mcp_linear-mcp-server_create_issue` using your determined parameters (`title`, `description`, `projectId`, `priority`, `labelIds`).
    *   *Crucial Rule:* Do not under any circumstances call the Notion API for this operation. Granular tasks exist exclusively in Linear.
4.  **Format Output:** Present a success summary containing the direct link to the newly created Linear issue.

### 3. Propose Daily Tasks (The Organizer)

**Trigger:** "Plan my day", "What should I do today?", or "Propose daily tasks."

**Procedure:**
1.  **Gather Context (High-Level):** Query the Notion "Projects Hub" for all active items with Status `In Progress` and Priority `High` or `Medium`.
2.  **Synthesize Plan:** Formulate a list of very actionable next steps based on those high-priority projects. Ensure the workload is realistic for one day.
3.  **Create Linear Action Items:**
    *   For each actionable step, use `mcp_linear-mcp-server_create_issue` to create a new ticket in Linear under the appropriate project (or as a loose task).
    *   **Crucial Step:** Automatically tag every single one of these new daily tasks with the `log:daily` label (Label ID: `13c729fc-31e9-47da-a55c-d8875092b8de`) so they appear in the user's daily planning view.
4.  **Format Output:** Present the daily plan directly to the user in the chat, along with the links to the newly created daily action items in Linear.

### 4. Progress Updates and Notes

**Trigger:** "Note for [Project]: [Content]..." or "Mark [Task] as done."

**Procedure:**
1.  **Notes:** Append the note content to the corresponding Notion page (The Brain) within the Projects Hub.
2.  **Task Updates:** Update the status of the specific Linear issue to `Done`. If updating an issue marks the completion of an entire high-level project, update the corresponding Notion `Status` to `Completed` as well.

## Required Tools & Detailed Examples

This skill relies heavily on specific MCP tools. Here is the exact list of tools the AI must use and examples of how to invoke them:

### Linear MCP Tools

1.  **`mcp_linear-mcp-server_get_user`**
    *   *Purpose:* Get the user's ID to assign issues.
    *   *Example Request:*
        ```json
        {
          "query": "me"
        }
        ```

2.  **`mcp_linear-mcp-server_list_teams`**
    *   *Purpose:* Fetch the team ID (e.g., Solo) to create issues/projects under.
    *   *Example Request:*
        ```json
        {
          "teamId": "afc070b3-8cdb-4314-9167-d039039b7ba7"
        }
        ```

3.  **`mcp_linear-mcp-server_list_projects`**
    *   *Purpose:* Retrieve the user's active projects for context when proposing tasks.
    *   *Example Request:*
        ```json
        {
          "team": "afc070b3-8cdb-4314-9167-d039039b7ba7",
          "query": "Vietnamese Dictation"
        }
        ```

4.  **`mcp_linear-mcp-server_list_issue_labels`**
    *   *Purpose:* Get specific label IDs, specifically the `log:daily` label for daily proposals.
    *   *Example Request:*
        ```json
        {
          "team": "afc070b3-8cdb-4314-9167-d039039b7ba7",
          "name": "log:daily"
        }
        ```

5.  **`mcp_linear-mcp-server_save_project`**
    *   *Purpose:* Create a new Linear project when the user starts a new High-Level goal.
    *   *Example Request:*
        ```json
        {
          "name": "Vietnamese Dictation App V2",
          "team": "afc070b3-8cdb-4314-9167-d039039b7ba7",
          "state": "started"
        }
        ```

### Notion MCP Tools

1.  **`mcp_notion-mcp-server_API-post-search`**
    *   *Purpose:* Identify existing Notion databases or search for active "In Progress" projects within the Projects Hub.
    *   *Example Request:* 
        ```json
        {
          "filter": {
            "property": "object", 
            "value": "database"
          }
        }
        ```
        *(Note: Requires manually setting headers in shell if the tool wrapper fails validation).*
2.  *(System-Level HTTP Call for Notion Schema Creation)*
    *   *Purpose:* Because the integrated Notion MCP tool sometimes fails with strict validation (e.g., `Notion-Version` errors), you may need to use `run_command` with cURL to directly interface with the Notion REST API using the bearer token from `settings.json`.
    *   *Example Request:*
        ```bash
        curl -X POST "https://api.notion.com/v1/databases" \
          -H "Authorization: Bearer <TOKEN>" \
          -H "Notion-Version: 2022-06-28" \
          -H "Content-Type: application/json" \
          -d @payload.json
        ```

## Output Formatting

Always provide clear, markdown-formatted summaries including direct URLs:

**Example Output for "Start a New High-Level Project":**
> I have set up the new project: **Vietnamese Dictation App V2**
>
> *   🧠 **Notion Plan:** [Link to Notion Page]
> *   💪 **Linear Execution:** [Link to Linear Project]

**Example Output for "Propose Daily Tasks":**
> Here is your proposed plan for today based on your active projects. I've logged this in Linear for tracking.
>
> 1.  [Task 1 from active project A]
> 2.  [Task 2 from active project B]
>
> *   📅 **Daily Log Tracking:** [Link to Linear Issue]
