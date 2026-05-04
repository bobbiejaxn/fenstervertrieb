---
name: orchestrator
description: "Autonomous multi-agent orchestrator that manages entire project lifecycle from request to verified deployment"
argument-hint: "[command] [options]"
keywords:
  - orchestrate
  - autonomous
  - multi-agent
  - coordinate
  - execute
  - plan
---

# Orchestrator - Autonomous Multi-Agent System

## What It Does

The orchestrator is an autonomous system that transforms high-level requests into verified, deployed features. It handles the entire lifecycle:

1. **Decomposes** requests into atomic tasks with dependencies
2. **Plans** execution graph identifying parallel opportunities
3. **Spawns** specialized agents (researcher, architect, tdd-guide, implementer)
4. **Coordinates** parallel execution with real-time conflict resolution
5. **Integrates** learnings from library automatically
6. **Self-heals** on failures (3-attempt retry with strategy adjustment)
7. **Verifies** deployments with real data
8. **Reports** results with evidence

## Commands

| Command | Purpose | Autonomy Level |
|---------|---------|----------------|
| `/orchestrator run "request"` | Execute request autonomously | Based on config |
| `/orchestrator plan "request"` | Show execution plan without running | All levels |
| `/orchestrator status` | Show current execution status | All levels |
| `/orchestrator config [level]` | Configure autonomy level | All levels |
| `/orchestrator cancel` | Cancel current execution | All levels |

## Autonomy Levels

Configure how much human approval is required:

### Supervised Mode (Default)
- **Asks before**: Research, architecture decisions, code changes, tests, commits, PRs
- **Best for**: Learning the system, critical projects, high-risk changes
- **When to use**: First time with orchestrator, production systems

### Semi-Auto Mode
- **Asks before**: Commits, PRs, deployments
- **Auto-handles**: Research, planning, implementation, testing, learning integration
- **Best for**: Active development, feature work, refactoring
- **When to use**: Trusted codebase, non-critical changes

### Autonomous Mode
- **Asks before**: Nothing (creates PR for review)
- **Auto-handles**: Everything from research to PR creation
- **Best for**: Well-defined tasks, trusted patterns, batch processing
- **When to use**: Routine work, pattern application, multiple similar tasks

Configure level:
```bash
/orchestrator config supervised   # Most control
/orchestrator config semi-auto    # Balanced
/orchestrator config autonomous   # Full automation
```

## Architecture

### Task Decomposition Engine
```
High-level request
    ↓
[Analyze dependencies]
    ↓
Atomic tasks with graph
    ↓
Execution plan
```

### Agent Coordination
```
Orchestrator
    ├─→ Researcher (parallel)
    ├─→ Architect (after research)
    ├─→ TDD Guide (parallel with implementation planning)
    └─→ Implementer(s) (parallel, non-conflicting files)
```

### Learning Integration
- Auto-injects promoted patterns from `/library`
- Applies learnings from previous executions
- Updates library with new patterns discovered

### Self-Healing
```
Task fails
    ↓
Analyze failure type
    ↓
Adjust strategy (simpler approach, different model, different agent)
    ↓
Retry (max 3 attempts)
    ↓
Escalate to human if all fail
```

## Features

### 1. Intelligent Task Decomposition
- Identifies atomic units of work
- Maps dependencies (blocks/blocked-by)
- Finds parallelization opportunities
- Estimates effort per task

### 2. Parallel Execution
- Runs independent tasks concurrently
- Prevents file conflicts (ownership assignment)
- Coordinates cross-file dependencies
- Manages agent communication

### 3. Pattern Integration
- Injects promoted patterns automatically
- Applies learnings from library
- Suggests pattern promotions
- Updates library with discoveries

### 4. Progress Tracking
- Real-time status updates
- Task completion visualization
- Agent activity monitoring
- Error tracking and reporting

### 5. Safety Guardrails
- Validates before destructive operations
- Creates checkpoints at milestones
- Maintains rollback capability
- Prevents concurrent file edits

### 6. Verification
- Runs tests after implementation
- Validates deployments with real data
- Checks exit criteria
- Provides evidence-based reports

## Examples

### Example 1: Feature Development (Supervised)

```bash
/orchestrator run "Add user authentication with JWT tokens"
```

**What Happens**:
1. **Task Decomposition** (shows plan, asks approval):
   ```
   Tasks:
   1. Research JWT best practices
   2. Design auth architecture
   3. Write auth middleware tests
   4. Implement JWT middleware
   5. Add login endpoint tests
   6. Implement login endpoint
   7. Update documentation

   Dependencies:
   - Tasks 3,4 depend on 2
   - Tasks 5,6 depend on 4
   - Task 7 depends on 6
   ```

2. **Execution** (asks before each phase):
   - "Run research task?" → Spawns researcher
   - "Apply architecture from task 2?" → Spawns architect
   - "Implement auth middleware?" → Spawns tdd-guide + implementer
   - "Create commit?" → Shows changes, asks approval
   - "Create PR?" → Shows summary, asks approval

3. **Result**:
   ```
   ✓ All tasks completed
   ✓ 15 tests passing
   ✓ PR created: #123

   Evidence:
   - Test results: [output]
   - Deployment: staging verified
   - Documentation: updated
   ```

### Example 2: Bug Fix (Semi-Auto)

```bash
/orchestrator config semi-auto
/orchestrator run "Fix rate limiting not working in API"
```

**What Happens**:
1. **Auto-executes**:
   - Researcher investigates rate limiting implementation
   - Architect identifies design flaw
   - TDD Guide writes failing test
   - Implementer fixes bug
   - Verifies fix with tests

2. **Asks approval**:
   - "Create commit with these changes?" → Shows diff
   - "Create PR?" → Shows summary

3. **Result**:
   ```
   ✓ Bug fixed in 12 minutes
   ✓ 3 new tests added
   ✓ PR created: #124

   Root cause: Missing rate limit header check
   Fix: Added header validation in middleware
   ```

### Example 3: Refactoring (Autonomous)

```bash
/orchestrator config autonomous
/orchestrator run "Refactor report generation to use strategy pattern"
```

**What Happens**:
1. **Fully autonomous**:
   - Analyzes current implementation
   - Designs strategy pattern approach
   - Writes tests for each strategy
   - Implements pattern
   - Updates all call sites
   - Runs full test suite
   - Creates detailed PR

2. **No approval needed** - creates PR:
   ```
   PR #125: Refactor report generation to strategy pattern

   Changes:
   - Created ReportStrategy interface
   - Implemented 3 strategies (Discovery, PoC, Pilot)
   - Updated 12 call sites
   - Added 18 tests
   - All tests passing ✓
   ```

3. **Human reviews PR** when ready

### Example 4: Multiple Related Features (Autonomous)

```bash
/orchestrator config autonomous
/orchestrator run "Add CRUD endpoints for projects, teams, and users"
```

**What Happens**:
1. **Parallel execution**:
   - Spawns 3 implementers (one per resource)
   - Each owns their files (no conflicts)
   - Shares common patterns via library
   - Coordinates shared dependencies (auth middleware)

2. **Coordination**:
   ```
   Team Lead
       ├─→ Implementer-Projects (projects routes, tests)
       ├─→ Implementer-Teams (teams routes, tests)
       └─→ Implementer-Users (users routes, tests)

   Shared: Auth middleware (completed first, blocks others)
   ```

3. **Result**:
   ```
   ✓ 15 endpoints added in 25 minutes
   ✓ 45 tests passing
   ✓ PR created: #126

   Resources implemented:
   - Projects: 5 endpoints, 15 tests
   - Teams: 5 endpoints, 15 tests
   - Users: 5 endpoints, 15 tests
   ```

### Example 5: Investigation and Fix (Semi-Auto)

```bash
/orchestrator run "Investigate why deployments are slow and fix"
```

**What Happens**:
1. **Research phase** (auto):
   - Researcher analyzes deployment logs
   - Identifies bottleneck (Docker layer caching)
   - Documents findings in `/library`

2. **Architecture phase** (auto):
   - Architect designs multi-stage build
   - Plans layer optimization
   - Creates implementation spec

3. **Implementation phase** (auto):
   - Updates Dockerfile
   - Adds caching strategy
   - Tests build times

4. **Verification** (auto):
   - Measures before: 8m 23s
   - Measures after: 2m 41s
   - Documents optimization

5. **Asks approval**:
   - "Create commit?" → Shows changes
   - "Create PR?" → Shows performance gains

6. **Result**:
   ```
   ✓ Deployment time reduced 68%
   ✓ Before: 8m 23s → After: 2m 41s
   ✓ PR created: #127

   Optimizations:
   - Multi-stage build
   - Cached dependencies layer
   - Parallel build stages
   ```

## Planning Without Execution

Use `/orchestrator plan` to see what would happen without executing:

```bash
/orchestrator plan "Add GraphQL API layer"
```

**Output**:
```
Execution Plan:
==============

Tasks (8 total):
1. [research] Investigate GraphQL best practices for Node.js
2. [architecture] Design GraphQL schema and resolver structure
3. [setup] Install and configure Apollo Server
4. [implementation] Define GraphQL type definitions
5. [implementation] Implement resolvers for queries
6. [implementation] Implement resolvers for mutations
7. [testing] Write integration tests for GraphQL endpoints
8. [docs] Update API documentation

Dependencies:
- Task 2 depends on 1 (research informs architecture)
- Tasks 3,4,5,6 depend on 2 (need architecture first)
- Task 7 depends on 5,6 (test after implementation)
- Task 8 depends on 7 (document after verification)

Parallel Opportunities:
- Tasks 4,5,6 can run in parallel (different files)
- Task 3 can run with task 4 (independent)

Estimated Time:
- Supervised: 45-60 minutes (with approval prompts)
- Semi-auto: 25-35 minutes
- Autonomous: 20-30 minutes

Agents Needed:
- 1 researcher
- 1 architect
- 3 implementers (parallel)
- 1 doc-updater

Risk Assessment:
- Medium complexity
- New technology (GraphQL)
- Suggests: Supervised or Semi-auto mode
```

## Status Monitoring

Track execution in real-time:

```bash
/orchestrator status
```

**Output**:
```
Orchestrator Status:
===================

Request: "Add user authentication with JWT tokens"
Mode: Semi-auto
Started: 2026-03-17 14:23:11
Elapsed: 8m 42s

Progress: 5/7 tasks completed (71%)

Current Activity:
├─ [✓] researcher (idle) - JWT research complete
├─ [✓] architect (idle) - Auth architecture designed
├─ [✓] tdd-guide (idle) - Tests written
├─ [→] implementer-1 (active) - Implementing login endpoint
└─ [ ] doc-updater (waiting) - Blocked by task 6

Completed Tasks:
✓ Task 1: Research JWT best practices (3m 12s)
✓ Task 2: Design auth architecture (2m 45s)
✓ Task 3: Write auth middleware tests (1m 23s)
✓ Task 4: Implement JWT middleware (4m 15s)
✓ Task 5: Add login endpoint tests (1m 34s)

Active Tasks:
→ Task 6: Implement login endpoint (in progress, 2m 18s elapsed)

Pending Tasks:
  Task 7: Update documentation (blocked by task 6)

Next Action: Waiting for task 6 completion, then ask approval for commit
```

## Configuration

### View Current Config
```bash
/orchestrator config
```

**Output**:
```
Current Configuration:
=====================

Autonomy Level: semi-auto

Approvals Required:
- Commits: YES
- Pull Requests: YES
- Deployments: YES

Auto-handled:
- Research: YES
- Architecture decisions: YES
- Code implementation: YES
- Test writing: YES
- Library integration: YES

Safety Features:
- File conflict prevention: ENABLED
- Retry on failure (max 3): ENABLED
- Checkpoint at milestones: ENABLED
- Pattern injection: ENABLED

Library Integration:
- Auto-inject promoted patterns: YES
- Suggest pattern promotions: YES
- Update learnings: YES
```

### Change Config
```bash
/orchestrator config autonomous
```

**Output**:
```
✓ Autonomy level changed to: autonomous

New behavior:
- Will create PRs without approval
- Human review happens on PR (before merge)
- Maximum automation, minimum interruption

⚠️  Safety features remain enabled:
- File conflict prevention
- Retry logic
- Checkpoint system
```

## Safety and Guardrails

### Automatic Safety Features

1. **File Conflict Prevention**
   - Assigns file ownership to agents
   - Prevents concurrent edits
   - Coordinates shared dependencies

2. **Checkpoint System**
   - Creates restore points at milestones
   - Enables rollback on failure
   - Maintains git history

3. **Retry Logic**
   - 3 attempts with strategy adjustment
   - Learns from failures
   - Escalates after exhaustion

4. **Validation Gates**
   - Tests must pass before proceeding
   - Schema validation on data changes
   - Deployment verification required

### Manual Safety Controls

1. **Cancel Anytime**
   ```bash
   /orchestrator cancel
   ```
   - Stops current execution
   - Keeps completed work
   - No partial commits

2. **Review Before Merge**
   - All PRs require human review
   - Even in autonomous mode
   - Final quality gate

3. **Rollback Capability**
   ```bash
   git revert <commit>
   ```
   - All changes are versioned
   - Easy rollback on issues
   - History preserved

## Integration with Other Skills

### Works With /library
- Auto-injects promoted patterns
- Updates learnings after execution
- Suggests promotions for new patterns

### Works With /prompts
- Uses prompts for agent instructions
- Applies domain-specific guidance
- Maintains consistency

### Works With Git Hooks
- Respects pre-commit checks
- Triggers post-commit actions
- Integrates with CI/CD

## Troubleshooting

### Issue: Tasks Taking Too Long
**Solution**: Check status, consider canceling and adjusting plan
```bash
/orchestrator status    # See what's taking time
/orchestrator cancel    # Stop if needed
/orchestrator plan "..."  # Revise approach
```

### Issue: Agent Conflicts
**Solution**: Orchestrator prevents this automatically
- Assigns unique file ownership
- Coordinates shared dependencies
- Retry with different assignment if needed

### Issue: Test Failures
**Solution**: Self-healing retry logic
- Attempt 1: Retry same approach
- Attempt 2: Simpler approach
- Attempt 3: Different agent/model
- After 3: Escalate to human

### Issue: Want More Control
**Solution**: Use supervised mode
```bash
/orchestrator config supervised
```

### Issue: Want Less Interruption
**Solution**: Use autonomous mode
```bash
/orchestrator config autonomous
```

## Best Practices

### 1. Start Supervised
- Learn how orchestrator works
- Understand task decomposition
- Build trust in the system

### 2. Clear Requests
✅ **Good**: "Add user authentication with JWT, including login/logout endpoints and middleware"

❌ **Bad**: "Make auth better"

### 3. Use Planning
- Run `/orchestrator plan` first
- Review execution strategy
- Adjust request if needed

### 4. Monitor Progress
- Check status during long executions
- Verify agents are making progress
- Cancel if stuck

### 5. Trust the System
- Self-healing works well
- Retry logic is smart
- Escalates when truly stuck

### 6. Review PRs Carefully
- Even in autonomous mode
- Final quality gate
- Learn from patterns

### 7. Update Library
- Promote successful patterns
- Document learnings
- Improve future executions

## Limitations

### What Orchestrator Can't Do
- Make product decisions (feature priority, UX choices)
- Handle ambiguous requirements (need clarity first)
- Access external systems without credentials
- Override safety guardrails

### When to Use Direct Work Instead
- Single-file quick fixes (< 50 lines)
- Clarification questions
- Exploratory work without clear goal

### When to Use Subagents Instead
- Focused task in one domain
- Sequential pipeline (research → plan → implement)
- Security reviews

## See Also

- [Setup Guide](./cookbook/setup.md) - Initial configuration
- [Autonomous Mode Guide](./cookbook/autonomous-mode.md) - Autonomy configuration
- [Monitoring Guide](./cookbook/monitoring.md) - Progress tracking
- [/library skill](../library/SKILL.md) - Pattern management
- [/prompts skill](../prompts/SKILL.md) - Prompt engineering

## Quick Reference

```bash
# Execute request
/orchestrator run "request"

# Plan without executing
/orchestrator plan "request"

# Check status
/orchestrator status

# Configure autonomy
/orchestrator config [supervised|semi-auto|autonomous]

# Cancel execution
/orchestrator cancel

# View config
/orchestrator config
```

---

**Remember**: The orchestrator is your autonomous teammate. Start supervised, build trust, then go autonomous for maximum productivity.
