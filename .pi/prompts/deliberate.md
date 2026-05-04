# /deliberate — Board Deliberation

Deliberate on: $@

Run a structured board deliberation on a strategic question. Board members debate from opposing perspectives, then the CEO synthesizes a decision memo.

## Usage

```
/deliberate <brief-path-or-question>
```

- If a path to a brief `.md` file is provided, validate and use it
- If a question string is provided, create an ad-hoc brief

## Workflow

### Step 0: Validate Input

If the input is a file path:
1. Run `./scripts/validate-brief.sh <path>` to check required sections
2. If validation fails, tell the user what's missing and stop
3. Load all `.md` files from the brief's directory as context

If the input is a question string:
1. Create a minimal brief with the question as both Situation and Key Question
2. Skip validation (ad-hoc mode)

### Step 1: Initialize

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SLUG=$(echo "<question>" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | head -c 50)
MEMO_PATH="specs/deliberations/${TIMESTAMP}-${SLUG}.md"
```

### Step 2: CEO Frames the Question

Invoke the board-ceo agent with the brief content and ask it to:
1. Frame the decision for the board
2. Identify the core tension
3. Broadcast the opening question

```json
{
  "agent": "board/board-ceo",
  "task": "Read this brief and frame the question for your board:\n\n<brief content>\n\nYour board members are: Ship Fast, Architect, Security Advisor, DX Advocate, Moonshot, Tech Debt Auditor, Contrarian.\n\nFrame the core tension and ask your opening question to ALL board members.",
  "agentScope": "project",
  "confirmProjectAgents": false
}
```

### Step 3: Board Debate (2-3 rounds)

**Round 1 — Initial Positions:**
Invoke all board members in parallel with the CEO's framing:

```json
{
  "tasks": [
    {"agent": "board/ship-fast", "task": "<CEO framing + brief>\n\nRespond with your position."},
    {"agent": "board/board-architect", "task": "<CEO framing + brief>\n\nRespond with your position."},
    {"agent": "board/security-advisor", "task": "<CEO framing + brief>\n\nRespond with your position."},
    {"agent": "board/dx-advocate", "task": "<CEO framing + brief>\n\nRespond with your position."},
    {"agent": "board/board-moonshot", "task": "<CEO framing + brief>\n\nRespond with your position."},
    {"agent": "board/tech-debt-auditor", "task": "<CEO framing + brief>\n\nRespond with your position."}
  ],
  "agentScope": "project",
  "confirmProjectAgents": false
}
```

Then invoke Contrarian last (always speaks last):
```json
{
  "agent": "board/board-contrarian",
  "task": "<CEO framing + brief + all other positions>\n\nYou speak last. Challenge the emerging consensus.",
  "agentScope": "project",
  "confirmProjectAgents": false
}
```

**Round 2 — CEO Follow-ups:**
Send all Round 1 responses back to board-ceo. The CEO identifies tensions and asks targeted follow-up questions to specific members. Execute those follow-ups.

**Round 3 (optional) — Final Statements:**
If significant disagreement remains, ask each member for a 2-3 sentence final position. Contrarian last.

### Step 4: Synthesize Memo

Invoke board-ceo with the full debate transcript:

```json
{
  "agent": "board/board-ceo",
  "task": "Here is the full board deliberation:\n\n<all rounds>\n\nSynthesize this into a decision memo. Write it to: <MEMO_PATH>\n\nUse the memo format from your instructions.",
  "agentScope": "project",
  "confirmProjectAgents": false
}
```

### Step 5: Report

Print:
```
✅ Deliberation complete.
📋 Memo: <MEMO_PATH>
📊 Board: 7 members, N rounds
⏱️ Duration: X minutes

Decision: <1-line summary from memo>
```

## Notes

- The orchestrator (you) manages the conversation flow. Board members don't call each other directly.
- You assemble each round's context by concatenating prior responses.
- Contrarian ALWAYS speaks last among board members.
- The memo is the deliverable — it must exist at MEMO_PATH when done.
- If invoked during `/ship` Phase 0.5, pass the memo path to subsequent agents.
