#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MCP Tool Template — Copy and customize for new MCP servers
# ═══════════════════════════════════════════════════════════════════════════════
# 
# HOW TO USE THIS TEMPLATE:
#   1. Copy to .pi/tools/<your-server-name>.sh
#   2. Replace all TODO comments with your implementation
#   3. Make executable: chmod +x .pi/tools/<your-server-name>.sh
#   4. Test: ./.pi/tools/<your-server-name>.sh <command>
#   5. Update .pi/skills/mcp-wrapper/SKILL.md with the new tool
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# TODO: Replace with your MCP server name
SERVER_NAME="TODO_SERVER_NAME"
NPM_PACKAGE="@modelcontextprotocol/server-TODO_PACKAGE"

# TODO: Replace with your required env var name
REQUIRED_ENV_VAR="TODO_ENV_VAR_NAME"
ENV_VAR_DESC="TODO: Description of what this env var is for"
ENV_VAR_URL="TODO: URL to get the API key/credential"

# TODO: Add your commands
COMMAND="${1:-}"

# ─── Validation ───────────────────────────────────────────────────────────────

if [ -z "$COMMAND" ]; then
    echo "Error: No command specified"
    echo ""
    echo "Usage: $0 <command> [args...]"
    echo ""
    echo "Available commands:"
    # TODO: List your commands here
    echo "  TODO: command1 <arg1> <arg2>    Description"
    echo "  TODO: command2 <arg>            Description"
    exit 1
fi

if [ -z "${!REQUIRED_ENV_VAR}" ]; then
    echo "Error: $REQUIRED_ENV_VAR environment variable not set"
    echo ""
    echo "To fix:"
    echo "  1. $ENV_VAR_DESC: $ENV_VAR_URL"
    echo "  2. Add to ~/.zshrc or ~/.bashrc:"
    echo "     export $REQUIRED_ENV_VAR=<your-value>"
    echo "  3. Reload: source ~/.zshrc"
    exit 1
fi

# ─── MCP Call Helper ──────────────────────────────────────────────────────────

mcp_call() {
    local tool="$1"
    local args="$2"
    
    local payload=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "$tool",
    "arguments": $args
  }
}
EOF
)
    
    echo "$payload" | npx -y "$NPM_PACKAGE" 2>/dev/null | node -e "
const data = '';
process.stdin.on('data', c => data.push(c));
process.stdin.on('end', () => {
  try {
    const result = JSON.parse(data.join(''));
    if (result.error) {
      console.error('MCP Error:', result.error.message);
      process.exit(1);
    }
    const content = result.result?.content?.[0]?.text;
    if (content) {
      console.log(content);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.log(data.join(''));
  }
});
" 2>/dev/null || echo "$payload" | npx -y "$NPM_PACKAGE" 2>/dev/null
}

# ─── Command Handlers ─────────────────────────────────────────────────────────

case "$COMMAND" in
    # TODO: Add your command handlers here
    # Example:
    # command1)
    #     ARG1="${2:-}"
    #     ARG2="${3:-}"
    #     
    #     if [ -z "$ARG1" ] || [ -z "$ARG2" ]; then
    #         echo "Error: command1 requires arg1 and arg2"
    #         echo "Usage: $0 command1 <arg1> <arg2>"
    #         exit 1
    #     fi
    #     
    #     mcp_call "tool_name" "{\"arg1\":\"$ARG1\",\"arg2\":\"$ARG2\"}"
    #     ;;
        
    *)
        echo "Error: Unknown command '$COMMAND'"
        echo "Run '$0' without arguments for usage"
        exit 1
        ;;
esac