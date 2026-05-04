#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# security-gate.sh — Hard security checks that block ship/fix/ceo
# ──────────────────────────────────────────────────────────────────────────────
# Run as a gate before any code is merged or deployed.
# Returns exit 1 if any check fails.
#
# Checks:
#   1. No public repos (gh repo create must be --private)
#   2. No trivial/weak passwords in code
#   3. No hardcoded secrets/API keys
#   4. No unsafe code patterns (eval, exec, SQL injection, etc.)
#   5. No secrets in git diffs
#
# Portable: uses grep -E (POSIX) instead of grep -P (GNU-only)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VIOLATIONS=0

fail() { echo -e "${RED}  ✗ $1${NC}"; ((VIOLATIONS++)); }
pass() { echo -e "${GREEN}  ✓ $1${NC}"; }
info() { echo -e "${YELLOW}  → $1${NC}"; }

cd "$REPO_ROOT"

# Changed files (staged or last commit)
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only 2>/dev/null || echo "")

# ─── Check 1: No public repos ────────────────────────────────────────────────

info "Check 1: Repository visibility"

if command -v gh &>/dev/null; then
  REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REPO_URL" ]; then
    REPO_SLUG=$(echo "$REPO_URL" | sed -E 's|.*github.com[:/]([^/]+/[^.]+)(\.git)?|\1|' 2>/dev/null || echo "")
    if [ -n "$REPO_SLUG" ]; then
      VISIBILITY=$(gh repo view "$REPO_SLUG" --json isPrivate --jq '.isPrivate' 2>/dev/null || echo "unknown")
      if [ "$VISIBILITY" = "false" ]; then
        fail "Repository $REPO_SLUG is PUBLIC. All repos must be private."
      elif [ "$VISIBILITY" = "true" ]; then
        pass "Repository is private"
      fi
    fi
  fi
else
  info "gh CLI not available — skipping repo visibility check"
fi

# ─── Check 2: No trivial/weak passwords ───────────────────────────────────────

info "Check 2: Weak password patterns"

for file in $CHANGED_FILES; do
  [ -f "$file" ] || continue
  # Skip non-code files
  case "$file" in *.lock|*.map|*.min.*) continue ;; esac

  if grep -Ein '(password|passwd|pwd)\s*=\s*["'"'"'][^"'"'"']{1,8}["'"'"']' "$file" 2>/dev/null; then
    fail "$file: password under 9 characters"
  fi
  if grep -Ein '(password|passwd|pwd)\s*=\s*["'"'"'](password|admin|123456|letmein|welcome|qwerty|abc123|Password1|P@ssw0rd|secret|token)["'"'"']' "$file" 2>/dev/null; then
    fail "$file: trivial/trivial password detected"
  fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
  pass "No weak password patterns found"
fi

# ─── Check 3: No hardcoded secrets ────────────────────────────────────────────

info "Check 3: Hardcoded secrets"

# Files where secrets patterns are expected
EXCLUDE_PATTERN="(test|spec|mock|fixture|example|\.env\.example|\.env\.template|\.pi/config\.sh|\.env)"

for file in $CHANGED_FILES; do
  [ -f "$file" ] || continue
  echo "$file" | grep -qE "$EXCLUDE_PATTERN" && continue
  case "$file" in *.lock|*.map|package-lock*|yarn*|*.generated.*) continue ;; esac

  # AWS access keys
  if grep -En 'AKIA[0-9A-Z]{16}' "$file" 2>/dev/null; then
    fail "$file: AWS access key detected"
  fi
  # GitHub tokens
  if grep -En 'gh[ps]_[A-Za-z0-9_]{36,}' "$file" 2>/dev/null; then
    fail "$file: GitHub token detected"
  fi
  # Private keys
  if grep -En '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----' "$file" 2>/dev/null; then
    fail "$file: private key detected"
  fi
  # Connection strings with embedded passwords
  if grep -En '(postgres|mysql|mongodb|redis)://[^:]+:[^@]+@' "$file" 2>/dev/null; then
    fail "$file: connection string with embedded credentials"
  fi
  # Long hex tokens assigned to secret-ish variable names
  if grep -En '(secret|token|key|credential|auth).*=[[:space:]]*["'"'"'][A-Fa-f0-9]{32,}["'"'"']' "$file" 2>/dev/null | grep -viE '(placeholder|example|your[_-]?(key|token|secret)|xxx|REPLACE|TODO|process\.env|import|from |require)' 2>/dev/null; then
    fail "$file: potential hardcoded hex secret"
  fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
  pass "No hardcoded secrets found"
fi

# ─── Check 4: Unsafe code patterns ───────────────────────────────────────────

info "Check 4: Unsafe code patterns"

UNSAFE_EXCLUDE="(test|spec|mock|\.d\.ts|\.test\.|\.spec\.)"

for file in $CHANGED_FILES; do
  [ -f "$file" ] || continue
  echo "$file" | grep -qE "$UNSAFE_EXCLUDE" && continue
  # Only check code files
  case "$file" in *.ts|*.tsx|*.js|*.jsx|*.py|*.rb|*.go|*.rs|*.java|*.php) ;; *) continue ;; esac

  # eval() — only flag if not in a "don't use" comment context
  if grep -En 'eval\s*\(' "$file" 2>/dev/null | grep -viE '(no |never |don'"'"'t |unsafe |avoid )' 2>/dev/null; then
    fail "$file: eval() usage"
  fi
  # dangerouslySetInnerHTML
  if grep -En 'dangerouslySetInnerHTML' "$file" 2>/dev/null; then
    fail "$file: dangerouslySetInnerHTML"
  fi
  # SQL string concatenation
  if grep -En '(query|execute|raw)\s*\([^)]*\+' "$file" 2>/dev/null; then
    fail "$file: potential SQL injection via string concatenation"
  fi
  # subprocess shell=True
  if grep -En 'subprocess\.\w+\([^)]*shell\s*=\s*True' "$file" 2>/dev/null | grep -viE '(no |never |don'"'"'t |unsafe )' 2>/dev/null; then
    fail "$file: subprocess with shell=True"
  fi
  # os.system with variable
  if grep -En 'os\.system\s*\([^)]*\+' "$file" 2>/dev/null; then
    fail "$file: os.system with string concatenation"
  fi
  # SSL verify disabled
  if grep -En 'verify\s*=\s*False' "$file" 2>/dev/null | grep -viE '(no |never |don'"'"'t |unsafe )' 2>/dev/null; then
    fail "$file: SSL verification disabled"
  fi
  if grep -En 'rejectUnauthorized\s*:\s*false' "$file" 2>/dev/null | grep -viE '(no |never |don'"'"'t |unsafe )' 2>/dev/null; then
    fail "$file: rejectUnauthorized: false"
  fi
  # CORS allow all in production code
  if grep -En 'Access-Control-Allow-Origin.*\*' "$file" 2>/dev/null | grep -viE '(test|spec|dev|local|comment)' 2>/dev/null; then
    fail "$file: CORS allow all origins"
  fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
  pass "No unsafe code patterns found"
fi

# ─── Check 5: Git hygiene — no secrets in diff ───────────────────────────────

info "Check 5: Git diff secret scan"

for file in $CHANGED_FILES; do
  [ -f "$file" ] || continue
  case "$file" in *.lock|*.map|*.generated.*) continue ;; esac

  SECRETS_IN_DIFF=$(git diff HEAD~1 -- "$file" 2>/dev/null | grep '^+' | grep -Ei '(api.?key|secret|token|password)\s*[=:]' | grep -viE '(placeholder|example|CONFIG_|process\.env|import |from |require|"type")' || true)
  if [ -n "$SECRETS_IN_DIFF" ]; then
    fail "$file: potential secret in git diff"
    echo "$SECRETS_IN_DIFF" | head -3
  fi
done

if [ "$VIOLATIONS" -eq 0 ]; then
  pass "No secrets in git diff"
fi

# ─── Result ──────────────────────────────────────────────────────────────────

echo ""
if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}SECURITY GATE FAILED: $VIOLATIONS violation(s)${NC}"
  exit 1
else
  echo -e "${GREEN}SECURITY GATE PASSED: 0 violations${NC}"
  exit 0
fi
