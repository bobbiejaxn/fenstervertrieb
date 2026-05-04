# Orchestrator Setup Guide

This guide walks you through initial configuration and your first orchestrator execution.

## Prerequisites

- Pi Launchpad installed
- Git repository initialized
- `/library` and `/prompts` skills set up (recommended)

## Step 1: Initial Configuration

### Check Current Config

```bash
/orchestrator config
```

**Expected Output** (first time):
```
Current Configuration:
=====================

Autonomy Level: supervised (default)

Approvals Required:
- Research: YES
- Architecture decisions: YES
- Code changes: YES
- Commits: YES
- Pull Requests: YES
- Deployments: YES

Safety Features:
- File conflict prevention: ENABLED
- Retry on failure (max 3): ENABLED
- Checkpoint at milestones: ENABLED
- Pattern injection: ENABLED
```

This is the safest starting point. You'll approve every major action.

### Choose Your Autonomy Level

**For learning** (recommended first time):
```bash
/orchestrator config supervised
```

**For active development**:
```bash
/orchestrator config semi-auto
```

**For maximum automation** (after you trust the system):
```bash
/orchestrator config autonomous
```

## Step 2: Set Up Git Hooks (Optional but Recommended)

Git hooks ensure the orchestrator respects your pre-commit checks:

```bash
# If setup script exists
./scripts/setup-hooks.sh

# Or manually
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
npm test
EOF
chmod +x .git/hooks/pre-commit
```

**Why this matters**: The orchestrator won't commit if tests fail.

## Step 3: Verify Library Integration

The orchestrator auto-injects promoted patterns from `/library`. Verify it's set up:

```bash
/library status
```

**Expected Output**:
```
Library Status:
- Promoted patterns: X
- Recent learnings: Y
- Ready for injection: ✓
```

If library isn't set up:
```bash
/library init
```

## Step 4: Your First Orchestrator Request

Start with something simple to understand the workflow.

### Simple Request (Supervised Mode)

```bash
/orchestrator run "Add a health check endpoint at GET /health that returns {status: 'ok'}"
```

**What Happens**:

1. **Task Decomposition** (shown to you):
   ```
   Tasks:
   1. Write test for health endpoint
   2. Implement health endpoint
   3. Update API documentation

   Dependencies:
   - Task 2 depends on 1 (test-first)
   - Task 3 depends on 2 (document after implementation)

   Agents needed:
   - 1 tdd-guide
   - 1 implementer
   - 1 doc-updater

   Estimated time: 8-12 minutes
   ```

2. **Approval Prompt**:
   ```
   Execute this plan? [y/n]
   ```
   Type `y` and press Enter.

3. **Research Phase**:
   ```
   Spawning tdd-guide...
   Writing test for health endpoint...

   Test created:
   - File: src/routes/health.test.ts
   - Test: "GET /health returns 200 with status ok"

   Proceed with implementation? [y/n]
   ```
   Type `y` and press Enter.

4. **Implementation Phase**:
   ```
   Spawning implementer...
   Implementing health endpoint...

   Changes:
   - Created: src/routes/health.ts
   - Modified: src/app.ts (registered route)

   Tests: ✓ All passing (1 new test)

   Proceed with documentation? [y/n]
   ```
   Type `y` and press Enter.

5. **Documentation Phase**:
   ```
   Spawning doc-updater...
   Updating API documentation...

   Changes:
   - Modified: docs/api.md (added /health endpoint)

   Create commit? [y/n]
   ```
   Type `y` and press Enter.

6. **Commit Phase**:
   ```
   Commit message:
   "feat: add health check endpoint

   - Add GET /health endpoint
   - Returns {status: 'ok'}
   - Include tests and documentation

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

   Create commit? [y/n]
   ```
   Type `y` and press Enter.

7. **Completion**:
   ```
   ✓ All tasks completed
   ✓ 1 test passing
   ✓ Commit created: a1b2c3d

   Summary:
   - Files changed: 3
   - Tests added: 1
   - Documentation updated: Yes
   - Time elapsed: 9m 23s
   ```

**Success!** You've completed your first orchestrator execution.

## Step 5: Review the Results

### Check the commit
```bash
git show HEAD
```

### Run the tests
```bash
npm test
```

### Test the endpoint
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

## Step 6: Try Planning Mode

Before executing, see the plan:

```bash
/orchestrator plan "Add user registration endpoint with email validation"
```

**Output**:
```
Execution Plan:
==============

Tasks (6 total):
1. [research] Investigate email validation libraries
2. [architecture] Design registration flow and validation
3. [testing] Write tests for registration endpoint
4. [testing] Write tests for email validation
5. [implementation] Implement registration endpoint
6. [implementation] Implement email validation

Dependencies:
- Task 2 depends on 1
- Tasks 3,4 depend on 2
- Tasks 5,6 depend on 3,4

Parallel Opportunities:
- Tasks 3,4 can run in parallel (different concerns)
- Tasks 5,6 can run in parallel (after tests)

Estimated Time:
- Supervised: 35-45 minutes
- Semi-auto: 20-28 minutes
- Autonomous: 18-25 minutes

Risk Assessment:
- Medium complexity
- External dependencies (validation library)
- Suggests: Supervised mode for first time
```

**Decision**: Execute or adjust the request based on the plan.

## Step 7: Monitor Progress

During execution, open a new terminal and check status:

```bash
/orchestrator status
```

**Output**:
```
Orchestrator Status:
===================

Request: "Add user registration endpoint with email validation"
Mode: Supervised
Started: 2026-03-17 14:23:11
Elapsed: 8m 42s

Progress: 3/6 tasks completed (50%)

Current Activity:
├─ [✓] researcher (idle) - Email validation research complete
├─ [✓] architect (idle) - Registration flow designed
├─ [→] tdd-guide-1 (active) - Writing registration tests
├─ [→] tdd-guide-2 (active) - Writing validation tests
└─ [ ] implementer-1 (waiting) - Blocked by tasks 3,4

Next Action: Waiting for tests completion
```

## Step 8: Adjust Autonomy (Optional)

After your first successful execution, you might want more automation:

### Switch to Semi-Auto
```bash
/orchestrator config semi-auto
```

**What changes**:
- ✓ Auto-handles: research, architecture, implementation, testing
- ⚠️ Still asks: commits, PRs, deployments

### Test Semi-Auto Mode
```bash
/orchestrator run "Add logging middleware"
```

**What happens**:
- Automatically researches logging approaches
- Automatically implements middleware
- Automatically writes tests
- **Asks approval** only for commit and PR

**Result**: Much faster, fewer interruptions, still safe.

## Step 9: Integration with Library

After successful executions, the orchestrator learns:

```bash
/library recent
```

**Output**:
```
Recent Learnings:
=================

1. Health Check Pattern (2026-03-17)
   - Simple endpoint: {status: 'ok'}
   - Used in: health endpoint
   - Success rate: 100%

2. Express Route Registration (2026-03-17)
   - Pattern: app.use('/path', router)
   - Used in: health endpoint
   - Success rate: 100%

Suggestions:
- Consider promoting "Health Check Pattern" to library
```

### Promote Useful Patterns
```bash
/library promote "Health Check Pattern"
```

**Why**: Future orchestrator executions will automatically inject this pattern.

## Step 10: Common Adjustments

### Increase Parallel Execution

For multi-core systems, edit config:
```bash
# Edit .pi/config/orchestrator.json
{
  "maxParallelAgents": 4,  // Increase from default 3
  "autonomyLevel": "semi-auto"
}
```

### Configure Retry Behavior

```bash
# Edit .pi/config/orchestrator.json
{
  "retryAttempts": 3,      // Max retry attempts
  "retryStrategy": "progressive"  // progressive | immediate
}
```

### Configure Pattern Injection

```bash
# Edit .pi/config/orchestrator.json
{
  "autoInjectPatterns": true,     // Inject promoted patterns
  "suggestPromotions": true,      // Suggest new patterns
  "updateLearnings": true         // Update library
}
```

## Verification Checklist

After setup, verify everything works:

- [ ] `/orchestrator config` shows your chosen autonomy level
- [ ] `/library status` shows library is ready
- [ ] `/orchestrator plan "simple task"` shows execution plan
- [ ] `/orchestrator run "simple task"` completes successfully
- [ ] Git hooks are respected (tests run before commit)
- [ ] `/orchestrator status` shows real-time progress
- [ ] Completed work appears in git history
- [ ] Tests pass after orchestrator execution

## Troubleshooting

### Issue: "Library not initialized"
**Solution**:
```bash
/library init
```

### Issue: "Git hooks not running"
**Solution**:
```bash
chmod +x .git/hooks/pre-commit
# Or run setup script
./scripts/setup-hooks.sh
```

### Issue: "Tasks taking too long"
**Solution**:
```bash
/orchestrator status  # Check progress
/orchestrator cancel  # Cancel if stuck
# Then try with simpler request or semi-auto mode
```

### Issue: "Permission denied"
**Solution**:
```bash
# Make sure orchestrator has necessary permissions
chmod +x .pi/skills/orchestrator/*
```

### Issue: "Agents conflicting"
**Solution**: This shouldn't happen (automatic prevention), but if it does:
```bash
/orchestrator cancel
/orchestrator config
# Check maxParallelAgents, reduce if needed
```

## Next Steps

1. **Read the main documentation**: [SKILL.md](../SKILL.md)
2. **Configure autonomy**: [autonomous-mode.md](./autonomous-mode.md)
3. **Learn monitoring**: [monitoring.md](./monitoring.md)
4. **Try complex requests**: Multi-file features, refactoring
5. **Integrate with CI/CD**: Automate deployments

## Quick Commands Reference

```bash
# Configuration
/orchestrator config [supervised|semi-auto|autonomous]
/orchestrator config  # View current config

# Execution
/orchestrator run "request"
/orchestrator plan "request"
/orchestrator cancel

# Monitoring
/orchestrator status

# Library integration
/library recent
/library promote "pattern name"
```

## Tips for Success

1. **Start supervised**: Build trust in the system
2. **Use planning**: Understand before executing
3. **Monitor progress**: Check status during long runs
4. **Review commits**: Even in auto mode, review before pushing
5. **Promote patterns**: Build your knowledge base
6. **Iterate**: Start simple, increase complexity gradually

---

**You're ready!** The orchestrator is now configured and tested. Start with simple requests in supervised mode, then increase autonomy as you build trust.
