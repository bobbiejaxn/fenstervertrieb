---
name: mcp-wrapper
description: "Autonomous 7-step workflow for adding MCP servers to pi_launchpad"
argument-hint: "[server-name]"
---

# MCP Server Integration Skill

Autonomous 7-step workflow for adding MCP servers to pi_launchpad. Agents follow this skill when asked to "add an MCP server" or "integrate MCP tool".

## Trigger Phrases

- "add an MCP server"
- "integrate MCP tool"
- "add brave search" / "add github MCP" / "add postgres MCP"
- "wrap MCP server for CLI"
- "create MCP tool wrapper"

## Prerequisites

- Node.js installed (for npx)
- Environment variables configured in ~/.zshrc or ~/.bashrc

## Architecture

Tools are registered as TypeScript extensions in `.pi/extensions/*/index.ts` using `pi.registerTool()`.
Extensions are auto-discovered by pi on startup. No `package.json` is needed per extension.

**Already migrated to extensions:**
- `brave-search` — Web search via Brave Search REST API (`.pi/extensions/brave-search/`)
- `github-tools` — GitHub issues/PRs via REST API (`.pi/extensions/github-tools/`)
- `context7-tools` — Documentation search via Context7 MCP (`.pi/extensions/context7-tools/`)

For MCP servers that don't have a direct REST API, extensions can spawn the MCP server
via `child_process` (see `context7-tools` for an example).

## The 7-Step Autonomous Workflow

When user asks to add an MCP server, execute these steps automatically:

---

### Step 1: CHOOSE — Identify the MCP Server

**Action:** Determine the exact npm package name and required credentials.

**Sources:**
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [MCP Community Registry](https://github.com/modelcontextprotocol/servers#community-servers)
- User specification

**Common Servers:**

| Server | NPM Package | Required Env Var | Credential Source |
|--------|-------------|------------------|-------------------|
| GitHub | `@modelcontextprotocol/server-github` | `GITHUB_TOKEN` | `gh auth token` or [tokens](https://github.com/settings/tokens) |
| Brave Search | `@modelcontextprotocol/server-brave-search` | `BRAVE_API_KEY` | [Brave API](https://api.search.brave.com/app/keys) |
| Filesystem | `@modelcontextprotocol/server-filesystem` | None (scoped paths) | N/A |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | `DATABASE_URL` | Your DB credentials |
| Slack | `@modelcontextprotocol/server-slack` | `SLACK_BOT_TOKEN` | [Slack Apps](https://api.slack.com/apps) |
| Memory | `@modelcontextprotocol/server-memory` | None | N/A |

**Output:** Note the npm package and required environment variable.

---

### Step 2: INSTALL — Add the MCP Server

**Action:** Install globally or verify npx availability.

```bash
# Check if already available via npx (preferred method)
npx -y <npm-package> --help 2>/dev/null && echo "Available via npx"

# Or install globally
npm install -g <npm-package>
```

**Decision:**
- If npx works: No installation needed
- If npx fails: Install globally with npm

---

### Step 3: CONFIGURE — Set Environment Variables

**Action:** Check and guide user to set required credentials.

```bash
# Check if env var is set
if [ -z "${REQUIRED_VAR:-}" ]; then
    echo "Error: REQUIRED_VAR not set"
    echo "Get credential at: <URL from Step 1>"
    echo "Add to ~/.zshrc: export REQUIRED_VAR=value"
fi
```

**User Instructions to Provide:**
1. Where to get the credential (URL)
2. What env var name to use
3. Command to add to shell profile

**Do NOT:**
- Ask user for their credential value
- Store credentials in files

---

### Step 4: TEST — Verify Standalone Operation

**Action:** Test the MCP server responds correctly.

```bash
# Direct MCP call test
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}' | npx -y <npm-package>
```

**Expected:** JSON response with available tools list.

**If Fails:**
- Check env var is exported: `echo $VAR_NAME`
- Check credential is valid (test via API directly)
- Verify MCP server package name is correct

---

### Step 5: WRAP — Create Extension

**Action:** Create `.pi/extensions/<server-name>/index.ts` TypeScript extension.

**Preferred approach: Direct REST API** (if available)
```typescript
// .pi/extensions/<server-name>/index.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "tool_name",
    label: "Display Label",
    description: "What the tool does",
    parameters: Type.Object({ ... }),
    async execute(_toolCallId, params) {
      // Direct API call
      const response = await fetch("https://api.example.com/...", { ... });
      return { content: [{ type: "text", text: result }] };
    },
  });
}
```

**Fallback: MCP server spawn** (when no REST API available)
See `.pi/extensions/context7-tools/index.ts` for the pattern of spawning
an MCP server via `child_process`.

**Legacy template:** `.pi/skills/mcp-wrapper/mcp-template.sh` (bash reference only)

**Output:** Extension at `.pi/extensions/<server-name>/index.ts`

---

### Step 6: DOCUMENT — Update Documentation

**Action:** Document the new extension tool.

Extensions are auto-discovered by pi and appear in the `[Extensions]` list on startup.
Document usage in the extension file's JSDoc header and optionally in project docs.

---

### Step 7: VERIFY — End-to-End Test

**Action:** Test the complete integration.

1. Run `pi` and check the extension appears in the `[Extensions]` list
2. Use `/tool <tool_name>` to test the tool interactively
3. Verify output is valid and human-readable

**Success Criteria:**
- Extension loads without errors on pi startup
- Tool appears in the available tools list
- Tool returns valid output for test inputs
- No "Error:" in output (unless testing error case)

---

## Quick Reference: Existing Extensions

### Web Search (Brave) — `.pi/extensions/brave-search/`

```
# Env var: BRAVE_API_KEY (from https://api.search.brave.com/app/keys)
# Tool name: web_search
# Parameters: query (required), count, freshness, country
```

### GitHub — `.pi/extensions/github-tools/`

```
# Env var: GITHUB_TOKEN or GH_TOKEN
# Tool name: github
# Commands: list-issues, get-issue, search-issues, list-prs, get-pr
# Parameters: command, owner, repo, number, query, state
```

### Context7 — `.pi/extensions/context7-tools/`

```
# Env var: CONTEXT7_API_KEY (from https://context7.com)
# Tool name: context7
# Commands: resolve (find library ID), query (search docs)
# Parameters: command, libraryName, libraryId, query
```

---

## File Structure

After adding extensions, your project should have:

```
.pi/
├── extensions/
│   ├── brave-search/
│   │   └── index.ts       # Web search via Brave REST API
│   ├── github-tools/
│   │   └── index.ts       # GitHub issues/PRs via REST API
│   ├── context7-tools/
│   │   └── index.ts       # Documentation search via Context7 MCP
│   ├── deepseek/
│   │   └── index.ts       # DeepSeek provider
│   ├── straico/
│   │   └── index.ts       # Straico provider (70+ models)
│   ├── subagent/
│   │   └── index.ts       # Subagent delegation
│   └── <your-extension>/
│       └── index.ts       # Your new extension
├── skills/
│   └── mcp-wrapper/
│       ├── SKILL.md        # This file
│       └── mcp-template.sh # Legacy bash template (reference)
└── agents/                 # Agent definitions
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "command not found" | npx not installed | Install Node.js |
| "MCP Error" | Invalid credentials | Check env var, regenerate token |
| Empty output | JSON parse error | Test with `npx` directly |
| "npx: command not found" | Node.js not installed | Install Node.js |
| "tool not found" | Wrong tool name | Check `tools/list` output |

---

## Example: Complete Session Log

**User:** "Add Brave Search integration"

**Agent Actions:**

1. **CHOOSE:** Identified Brave Search REST API, requires `BRAVE_API_KEY`
2. **INSTALL:** No npm install needed (direct REST API via fetch)
3. **CONFIGURE:** Informed user to get key from https://api.search.brave.com/app/keys
4. **TEST:** User set env var, tested API endpoint — success
5. **WRAP:** Created `.pi/extensions/brave-search/index.ts` with `pi.registerTool()`
6. **DOCUMENT:** Added JSDoc header to extension file
7. **VERIFY:** Ran pi, confirmed extension appears in `[Extensions]` list

**Result:** Tool ready for agent use via `/tool web_search`.