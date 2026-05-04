# Orchestrator Monitoring Guide

This guide covers how to track progress, understand agent coordination, handle errors, and interpret results during orchestrator execution.

## Real-Time Status Updates

### Basic Status Check

```bash
/orchestrator status
```

**Output**:
```
Orchestrator Status:
===================

Request: "Add user authentication with JWT tokens"
Mode: semi-auto
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

### Continuous Monitoring

Keep status visible during long executions:

```bash
# Terminal 1: Run orchestrator
/orchestrator run "Complex multi-file refactoring"

# Terminal 2: Watch status (updates every 2 seconds)
watch -n 2 "/orchestrator status"
```

## Understanding Agent States

### Agent State Indicators

| Indicator | State | Meaning |
|-----------|-------|---------|
| `[→]` | Active | Currently executing a task |
| `[✓]` | Idle | Task completed, waiting for new assignment |
| `[ ]` | Waiting | Not started, blocked by dependencies |
| `[!]` | Error | Task failed, retry in progress |
| `[⏸]` | Paused | Waiting for approval (supervised mode) |

### Example: Multi-Agent Coordination

```
Current Activity:
├─ [→] implementer-projects (active) - Creating project CRUD endpoints
├─ [→] implementer-teams (active) - Creating team CRUD endpoints
├─ [→] implementer-users (active) - Creating user CRUD endpoints
├─ [✓] tdd-guide (idle) - Tests written for all resources
├─ [ ] doc-updater (waiting) - Blocked by tasks 2,3,4
└─ [ ] integrator (waiting) - Blocked by task 5

Parallel execution: 3 agents working on independent files
No conflicts: Each owns their routes and services
```

**What this shows**:
- 3 implementers working in parallel (independent files)
- TDD guide finished first, now idle
- Doc updater waiting for all implementation to complete
- Integrator waits for documentation

## Progress Tracking

### Task Dependencies Visualization

```bash
/orchestrator status --verbose
```

**Output**:
```
Task Dependency Graph:
=====================

1. [✓] Research JWT libraries
2. [✓] Design auth architecture ← depends on 1
3. [✓] Write middleware tests ← depends on 2
4. [→] Implement middleware ← depends on 3
5. [ ] Write endpoint tests ← depends on 2
6. [ ] Implement endpoints ← depends on 4,5
7. [ ] Update docs ← depends on 6

Critical Path: 1 → 2 → 3 → 4 → 6 → 7 (estimated 18m)
Parallel Opportunity: Tasks 3 and 5 (saving 3m)

Bottleneck: Task 4 (currently executing, blocks 6)
```

### Progress Bar View

```bash
/orchestrator status --progress
```

**Output**:
```
Overall Progress:
[████████████░░░░░░░░] 60% (6/10 tasks)

Phase Progress:
Research:    [████████████████████] 100% (2/2 tasks)
Architecture:[████████████████████] 100% (1/1 task)
Testing:     [█████████████░░░░░░░] 66% (2/3 tasks)
Implement:   [██████░░░░░░░░░░░░░░] 33% (1/3 tasks)
Docs:        [░░░░░░░░░░░░░░░░░░░░] 0% (0/1 task)

Estimated time remaining: 7m 30s
```

### Time Tracking

```bash
/orchestrator status --timing
```

**Output**:
```
Time Analysis:
=============

Total elapsed: 12m 34s
Estimated remaining: 5m 20s
Estimated completion: 14:41:05

Phase breakdown:
├─ Research: 4m 12s (completed)
├─ Architecture: 2m 45s (completed)
├─ Testing: 3m 15s (in progress)
└─ Implementation: 2m 22s (in progress)

Agent utilization:
├─ researcher: 4m 12s active, 8m 22s idle
├─ architect: 2m 45s active, 9m 49s idle
├─ tdd-guide-1: 1m 23s active, 2m 15s idle (running)
├─ tdd-guide-2: 1m 52s active, 1m 46s idle (running)
└─ implementer-1: 2m 22s active (running)

Parallel efficiency: 78% (good)
```

## Agent Coordination View

### Inter-Agent Communication

```bash
/orchestrator status --coordination
```

**Output**:
```
Agent Coordination:
==================

Team Lead: orchestrator-main

Active Conversations:
├─ implementer-projects ↔ tdd-guide
│  └─ "Need clarification on validation schema"
│     Response: "Use projectSchema from shared types"
│
├─ implementer-teams ↔ implementer-users
│  └─ "Both need auth middleware, who implements?"
│     Resolution: implementer-users owns auth (shared dependency)
│
└─ doc-updater ↔ team-lead
   └─ "Waiting for implementation details"
      Status: Blocked, estimated 3m

Shared Resources:
├─ src/middleware/auth.ts
│  └─ Owner: implementer-users
│     Status: In progress
│     Blocks: implementer-projects, implementer-teams
│
└─ src/types/schemas.ts
   └─ Owner: tdd-guide
      Status: Complete
      Used by: All implementers

No conflicts detected ✓
```

### File Ownership Map

```bash
/orchestrator status --files
```

**Output**:
```
File Ownership:
==============

implementer-projects:
├─ src/routes/projects.ts (active)
├─ src/services/projects.service.ts (active)
└─ src/services/projects.service.test.ts (complete)

implementer-teams:
├─ src/routes/teams.ts (active)
├─ src/services/teams.service.ts (active)
└─ src/services/teams.service.test.ts (complete)

implementer-users:
├─ src/routes/users.ts (active)
├─ src/services/users.service.ts (active)
├─ src/services/users.service.test.ts (complete)
└─ src/middleware/auth.ts (active, shared dependency)

tdd-guide:
├─ src/types/schemas.ts (complete, shared by all)
└─ src/test/helpers.ts (complete, shared by all)

doc-updater:
└─ docs/api.md (waiting for implementation)

Conflict risk: NONE ✓
```

## Error Handling and Recovery

### Error State

When a task fails:

```
Current Activity:
├─ [!] implementer-1 (error) - Failed to implement JWT middleware
│  └─ Error: Module '@types/jsonwebtoken' not found
│     Retry: Attempt 1/3 in progress
│     Strategy: Install missing dependency first
│
├─ [⏸] implementer-2 (paused) - Blocked by implementer-1 failure
└─ [✓] tdd-guide (idle) - Tests written

Recent Errors:
[14:32:45] implementer-1: Module not found
           Cause: Missing dependency
           Action: Installing @types/jsonwebtoken
           ETA: 30s
```

### Retry Progress

```
Retry Status:
============

Task 4: Implement JWT middleware
├─ Attempt 1: FAILED (Module not found)
│  └─ Duration: 2m 15s
│
├─ Attempt 2: IN PROGRESS (Installing dependencies)
│  └─ Strategy: Install deps, then retry implementation
│     Duration: 45s elapsed
│     ETA: 1m 30s remaining
│
└─ Attempt 3: Available if needed
   └─ Strategy: Simpler approach without TypeScript types

Max attempts: 3
Escalation: After attempt 3, ask human for help
```

### Self-Healing Actions

```
Self-Healing Log:
================

[14:32:45] Detected: Missing TypeScript types
           Action: Added @types/jsonwebtoken to package.json
           Status: Installing...

[14:33:12] Detected: Test failures in login endpoint
           Action: Adjusted validation logic
           Status: Re-running tests...

[14:33:45] Detected: Circular dependency
           Action: Extracted shared types to separate file
           Status: Refactoring...

[14:34:20] All issues resolved
           Status: Resuming normal execution
```

## Result Reporting

### Completion Summary

```
Execution Complete:
==================

Request: "Add user authentication with JWT tokens"
Mode: semi-auto
Duration: 18m 34s

✓ All tasks completed successfully

Tasks Completed (7):
✓ Task 1: Research JWT best practices (3m 12s)
✓ Task 2: Design auth architecture (2m 45s)
✓ Task 3: Write auth middleware tests (1m 23s)
✓ Task 4: Implement JWT middleware (4m 15s, 2 retries)
✓ Task 5: Add login endpoint tests (1m 34s)
✓ Task 6: Implement login endpoint (3m 22s)
✓ Task 7: Update documentation (2m 03s)

Files Changed (8):
M  src/app.ts (+12, -0)
A  src/middleware/auth.ts (+75)
A  src/middleware/auth.test.ts (+45)
A  src/routes/login.ts (+60)
A  src/routes/login.test.ts (+55)
M  src/types/user.ts (+15, -0)
M  docs/api.md (+45, -0)
M  package.json (+2, -0)

Tests:
✓ 10 new tests added
✓ All tests passing (45 total)
✓ Coverage: 87% (+3%)

Commits:
✓ 1 commit created: a1b2c3d

Pull Requests:
✓ PR #127 created
  URL: https://github.com/user/repo/pull/127

Next Steps:
1. Review PR #127
2. Merge when ready
3. Deploy to staging
```

### Verification Evidence

```bash
/orchestrator status --verify
```

**Output**:
```
Verification Results:
====================

Exit Criteria: ✓ All met

✓ Tests passing
  Evidence: npm test output
  Result: 45 tests, 0 failures
  Coverage: 87%

✓ Deployment verified
  Environment: staging
  URL: https://staging.example.com
  Health check: 200 OK
  Auth endpoint: 200 OK (tested with valid JWT)

✓ Documentation updated
  Files: docs/api.md, README.md
  Completeness: All endpoints documented
  Examples: Included

✓ Performance acceptable
  Login endpoint: avg 45ms (target <100ms)
  Auth middleware: avg 5ms (target <10ms)
  Memory usage: +12MB (acceptable)

✓ Security checks passed
  JWT validation: Working
  Token expiry: Working
  Invalid tokens: Properly rejected
  SQL injection: Protected (parameterized queries)
```

### Learning Summary

```
Learnings Captured:
==================

New Patterns Discovered:
1. JWT Auth Middleware Pattern
   - express-jwt with RS256
   - Success rate: 100%
   - Suggest: Promote to library

2. Login Endpoint Structure
   - Validation → Auth → Token generation
   - Success rate: 100%
   - Suggest: Promote to library

3. Test Helper: Mock JWT
   - Reusable mock for JWT tokens
   - Used in: 10 tests
   - Suggest: Add to test helpers

Updated Learnings:
- Express middleware patterns (confidence: high → very high)
- JWT best practices (new knowledge added)
- Integration testing (new example added)

Library Suggestions:
[1] Promote "JWT Auth Middleware Pattern"
[2] Promote "Login Endpoint Structure"
[3] Add "Mock JWT Helper" to test utilities

Accept all suggestions? [y/n]
```

## Notification System

### Real-Time Notifications

Configure notifications for key events:

```bash
# Edit .pi/config/orchestrator.json
{
  "notifications": {
    "taskComplete": true,
    "phaseComplete": true,
    "errorOccurred": true,
    "approvalNeeded": true,
    "executionComplete": true
  }
}
```

### Notification Examples

**Task completion**:
```
[Notification] Task Complete
Task: "Implement JWT middleware"
Duration: 4m 15s
Status: Success (after 2 retries)
Next: Implementing login endpoint
```

**Phase completion**:
```
[Notification] Phase Complete
Phase: Implementation
Tasks completed: 3/3
Duration: 12m 45s
Next phase: Documentation
```

**Error occurred**:
```
[Notification] Error Occurred
Task: "Install dependencies"
Error: Network timeout
Retry: Attempt 1/3 starting now
```

**Approval needed** (supervised/semi-auto):
```
[Notification] Approval Needed
Action: Create commit
Changes: 8 files, 245 additions, 12 deletions
Review and approve in terminal
```

**Execution complete**:
```
[Notification] Execution Complete
Request: "Add user authentication"
Duration: 18m 34s
Status: Success
PR created: #127
Action: Review PR when ready
```

## Advanced Monitoring

### Export Status Log

```bash
/orchestrator status --export log.json
```

**Output**: `log.json` with full execution history

```json
{
  "request": "Add user authentication with JWT tokens",
  "mode": "semi-auto",
  "started": "2026-03-17T14:23:11Z",
  "completed": "2026-03-17T14:41:45Z",
  "duration": "18m34s",
  "tasks": [
    {
      "id": "task-1",
      "name": "Research JWT best practices",
      "agent": "researcher",
      "started": "2026-03-17T14:23:15Z",
      "completed": "2026-03-17T14:26:27Z",
      "duration": "3m12s",
      "status": "success",
      "retries": 0
    }
    // ... more tasks
  ],
  "agents": [
    {
      "name": "researcher",
      "totalTime": "4m12s",
      "activeTime": "4m12s",
      "idleTime": "14m22s",
      "tasksCompleted": 2
    }
    // ... more agents
  ],
  "files": [
    {
      "path": "src/middleware/auth.ts",
      "action": "created",
      "lines": 75,
      "agent": "implementer-1"
    }
    // ... more files
  ]
}
```

### Performance Analysis

```bash
/orchestrator status --analyze
```

**Output**:
```
Performance Analysis:
====================

Execution efficiency: 78% (good)

Time breakdown:
├─ Active work: 14m 30s (78%)
├─ Agent idle time: 3m 15s (17%)
└─ Waiting for approval: 49s (5%)

Parallel effectiveness:
├─ Potential parallel time: 18m
├─ Actual parallel time: 12m
└─ Time saved: 6m (33% improvement)

Bottlenecks identified:
1. Task 4 (JWT middleware) blocked 2 other tasks
   Impact: 3m 22s delay
   Suggestion: Prioritize shared dependencies

2. Agent idle time during retries
   Impact: 2m 15s wasted
   Suggestion: Assign idle agents to pending tasks

Optimization suggestions:
- Consider autonomous mode (save approval time: 49s)
- Increase parallel agents from 3 to 4 (potential 15% speedup)
- Pre-install common dependencies (avoid retry delays)
```

## Monitoring Best Practices

### 1. Check Status Periodically

For long executions (>10 minutes):
```bash
# Check every 5 minutes
/orchestrator status
```

### 2. Monitor Errors

If you see `[!]` errors:
```bash
/orchestrator status --verbose
# Review error details and retry strategy
```

### 3. Verify Progress

If stuck on one task too long:
```bash
/orchestrator status --timing
# Check if task is progressing or stuck
```

### 4. Understand Coordination

For parallel execution:
```bash
/orchestrator status --coordination
# Ensure no conflicts, communication is working
```

### 5. Review Results

After completion:
```bash
/orchestrator status --verify
# Check all exit criteria met
```

### 6. Export Logs

For post-mortem analysis:
```bash
/orchestrator status --export execution-log.json
# Analyze patterns, optimize future runs
```

## Troubleshooting

### Issue: Status Not Updating
**Solution**: Check if orchestrator is running
```bash
ps aux | grep orchestrator
# Or restart status monitoring
```

### Issue: Can't See Agent Details
**Solution**: Use verbose mode
```bash
/orchestrator status --verbose
```

### Issue: Want Real-Time Updates
**Solution**: Use watch command
```bash
watch -n 2 "/orchestrator status"
```

### Issue: Too Much Information
**Solution**: Use basic status
```bash
/orchestrator status  # Basic view only
```

### Issue: Need Historical Data
**Solution**: Export logs
```bash
/orchestrator status --export log.json
# Analyze log.json for trends
```

## Quick Reference

```bash
# Basic status
/orchestrator status

# Verbose details
/orchestrator status --verbose

# Progress bars
/orchestrator status --progress

# Timing analysis
/orchestrator status --timing

# Agent coordination
/orchestrator status --coordination

# File ownership
/orchestrator status --files

# Verification results
/orchestrator status --verify

# Performance analysis
/orchestrator status --analyze

# Export logs
/orchestrator status --export log.json

# Continuous monitoring
watch -n 2 "/orchestrator status"
```

## Next Steps

1. **Monitor your first execution**: Use basic status command
2. **Learn status indicators**: Understand agent states
3. **Track progress**: Use progress and timing views
4. **Review results**: Check verification evidence
5. **Analyze performance**: Use performance analysis
6. **Export logs**: Build historical data

---

**Remember**: Monitoring gives you confidence. Check status anytime. The orchestrator is transparent about what it's doing and why.
