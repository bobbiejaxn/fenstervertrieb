# Autonomous Mode Configuration Guide

This guide covers the three autonomy levels and how to configure them for maximum productivity with appropriate safety.

## Autonomy Levels Overview

| Level | Approval Points | Best For | Risk |
|-------|----------------|----------|------|
| **Supervised** | Research, architecture, code, commits, PRs | Learning, critical systems | Lowest |
| **Semi-Auto** | Commits, PRs, deployments | Active development | Medium |
| **Autonomous** | None (creates PR only) | Routine work, batch processing | Highest |

## Level 1: Supervised Mode

### When to Use
- First time with orchestrator
- Critical production systems
- High-risk changes
- Learning new patterns
- Unfamiliar codebases

### What Gets Approved
Every major action requires explicit approval:

1. **Research Phase**: "Run research on X?"
2. **Architecture Phase**: "Apply this architecture design?"
3. **Implementation Phase**: "Implement this code?"
4. **Testing Phase**: "Run these tests?"
5. **Commit Phase**: "Create commit with these changes?"
6. **PR Phase**: "Create pull request?"

### Configure Supervised Mode

```bash
/orchestrator config supervised
```

**Output**:
```
✓ Autonomy level set to: supervised

You will approve:
- Research tasks
- Architecture decisions
- Code implementations
- Test creation
- Commits
- Pull requests

Maximum control, minimum risk.
```

### Example Workflow

```bash
/orchestrator run "Add rate limiting middleware"
```

**Step-by-step approvals**:

1. **Research Approval**:
   ```
   Research Plan:
   - Investigate rate limiting libraries (express-rate-limit, rate-limiter-flexible)
   - Check best practices for API rate limiting
   - Review security considerations

   Estimated time: 3-5 minutes

   Execute research? [y/n]
   ```
   Type `y` → Research executes

2. **Architecture Approval**:
   ```
   Architecture Design:
   - Use express-rate-limit (most popular, well-maintained)
   - Apply globally with 100 req/15min default
   - Make configurable per-route
   - Store in Redis for distributed systems

   Files to modify:
   - src/middleware/rate-limit.ts (new)
   - src/app.ts (register middleware)
   - src/config/rate-limit.config.ts (new)

   Apply this architecture? [y/n]
   ```
   Type `y` → Architecture applied

3. **Implementation Approval**:
   ```
   Implementation Plan:
   - Create rate limit middleware (50 lines)
   - Configure Redis store (30 lines)
   - Register in Express app (5 lines)

   Tests included:
   - Rate limit enforces 100 req limit
   - Returns 429 when exceeded
   - Resets after window

   Implement these changes? [y/n]
   ```
   Type `y` → Implementation executes

4. **Commit Approval**:
   ```
   Changes:
   M  src/app.ts (+5, -0)
   A  src/middleware/rate-limit.ts (+50)
   A  src/config/rate-limit.config.ts (+30)
   A  src/middleware/rate-limit.test.ts (+45)

   Commit message:
   "feat: add rate limiting middleware

   - Add express-rate-limit with Redis store
   - Configure 100 requests per 15 minutes
   - Make configurable per-route
   - Include tests

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

   Create commit? [y/n]
   ```
   Type `y` → Commit created

5. **PR Approval**:
   ```
   Pull Request:
   Title: "Add rate limiting middleware"

   Summary:
   - Implements rate limiting with express-rate-limit
   - Configurable per-route
   - Tests included and passing

   Target branch: main
   Base branch: feature/rate-limiting

   Create pull request? [y/n]
   ```
   Type `y` → PR created

### Tips for Supervised Mode

**Quick Approvals**: If you trust the plan, just keep typing `y`

**Review Carefully**: This is your chance to catch issues early

**Ask for Changes**: Type `n` and provide feedback:
```
Apply this architecture? [y/n]
> n
> Use in-memory store instead of Redis for simplicity

Updated architecture...
Apply this architecture? [y/n]
> y
```

**Cancel Anytime**:
```bash
/orchestrator cancel
```

## Level 2: Semi-Auto Mode (Recommended)

### When to Use
- Active development
- Trusted codebases
- Non-critical changes
- Feature development
- Refactoring work

### What Gets Approved
Only final actions require approval:

- **Auto-handled**: Research, architecture, implementation, testing, learning integration
- **Approval needed**: Commits, PRs, deployments

### Configure Semi-Auto Mode

```bash
/orchestrator config semi-auto
```

**Output**:
```
✓ Autonomy level set to: semi-auto

Auto-handled:
- Research and investigation
- Architecture and design
- Code implementation
- Test creation and execution
- Library pattern integration

You will approve:
- Commits (with full diff)
- Pull requests (with summary)
- Deployments

Balanced automation with safety.
```

### Example Workflow

```bash
/orchestrator run "Add user profile caching with Redis"
```

**What happens automatically**:

1. **Research** (auto):
   ```
   Researching Redis caching patterns...
   ✓ Completed in 3m 12s
   ```

2. **Architecture** (auto):
   ```
   Designing cache layer...
   ✓ Cache-aside pattern selected
   ✓ TTL: 1 hour
   ✓ Completed in 2m 45s
   ```

3. **Implementation** (auto):
   ```
   Implementing cache layer...
   ✓ Created CacheService class
   ✓ Updated UserService
   ✓ Added cache middleware
   ✓ Tests written and passing (15 tests)
   ✓ Completed in 8m 23s
   ```

**First approval point** (commit):
```
Total time: 14m 20s (no interruptions)

Changes ready to commit:
M  src/services/user.service.ts (+25, -10)
A  src/services/cache.service.ts (+150)
A  src/middleware/cache.middleware.ts (+45)
A  src/services/cache.service.test.ts (+120)
M  src/config/redis.config.ts (+20, -0)

Tests: ✓ All passing (15 new, 0 failures)

Commit message:
"feat: add Redis caching for user profiles

- Implement cache-aside pattern
- Add CacheService with Redis backend
- Add cache middleware for GET endpoints
- 1-hour TTL for user profile cache
- Include comprehensive tests (15 tests)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

Create commit? [y/n]
```

Type `y` → Commit created

**Second approval point** (PR):
```
Pull Request Ready:

Title: "Add Redis caching for user profiles"

Body:
## Summary
Implements Redis-backed caching for user profile endpoints to reduce database load.

## Changes
- Cache-aside pattern implementation
- CacheService class with Redis backend
- Cache middleware for GET /users/:id
- 1-hour TTL configuration

## Testing
- 15 new tests (all passing)
- Tested with real Redis instance
- Cache hit/miss scenarios covered
- TTL expiration verified

## Performance Impact
- Expected 70% reduction in database queries for user profiles
- Response time improvement: ~150ms → ~5ms (cache hit)

Target: main
Labels: enhancement, performance

Create pull request? [y/n]
```

Type `y` → PR created

**Result**: 14 minutes of uninterrupted work, 2 approval points

### Tips for Semi-Auto Mode

**Review diffs carefully**: This is your quality gate
```bash
git diff HEAD~1  # Review the commit
```

**Trust the tests**: If tests pass, implementation is likely correct

**Provide feedback**: If commit needs changes, type `n` and explain:
```
Create commit? [y/n]
> n
> Add error handling for Redis connection failures

Updating implementation...
[automatic fixes]

Changes updated. Create commit? [y/n]
> y
```

**Monitor progress**: Use `/orchestrator status` to watch execution

### When Semi-Auto Works Best

✅ **Feature development**: Clear requirements, familiar domain

✅ **Refactoring**: Well-tested code, safe transformations

✅ **Bug fixes**: Known issues, clear solutions

✅ **Documentation updates**: Low risk, straightforward

❌ **New technologies**: Use supervised for learning

❌ **Critical systems**: Use supervised for safety

❌ **Ambiguous requirements**: Clarify first

## Level 3: Autonomous Mode (Expert)

### When to Use
- Routine work you've done many times
- Batch processing multiple similar tasks
- Well-defined requirements
- Trusted patterns from library
- Non-production environments

### What Gets Approved
**Nothing during execution** - creates PR for final review

- **Auto-handled**: Everything (research → implementation → tests → commit → PR)
- **Approval needed**: Merge PR (normal GitHub review process)

### Configure Autonomous Mode

```bash
/orchestrator config autonomous
```

**Output**:
```
⚠️  Autonomy level set to: autonomous

Fully autonomous operation:
- No approval prompts during execution
- Creates PR with all changes
- Human review happens at PR stage
- Maximum speed, trust required

Safety features still active:
- File conflict prevention
- Retry on failure (3 attempts)
- Test validation gates
- Checkpoint system

Are you sure? [y/n]
```

Type `y` → Autonomous mode enabled

### Example Workflow

```bash
/orchestrator run "Add CRUD endpoints for projects, teams, and users"
```

**What happens (no prompts)**:

```
Starting autonomous execution...

[14:23:11] Decomposing request into tasks...
[14:23:15] ✓ 15 tasks identified, 3 parallel tracks

[14:23:16] Spawning agents...
           ├─ implementer-projects (owns: src/routes/projects.*)
           ├─ implementer-teams (owns: src/routes/teams.*)
           └─ implementer-users (owns: src/routes/users.*)

[14:23:18] Research phase...
[14:26:45] ✓ Research complete (3m 27s)

[14:26:46] Architecture phase...
[14:29:12] ✓ Architecture designed (2m 26s)

[14:29:13] Implementation phase (parallel)...
           ├─ [14:32:45] ✓ Projects endpoints complete (3m 32s)
           ├─ [14:33:01] ✓ Teams endpoints complete (3m 48s)
           └─ [14:33:15] ✓ Users endpoints complete (4m 02s)

[14:33:16] Testing phase...
[14:35:42] ✓ All tests passing (45 tests, 2m 26s)

[14:35:43] Creating commit...
[14:35:45] ✓ Commit created: a1b2c3d

[14:35:46] Creating pull request...
[14:35:50] ✓ PR created: #127

Total time: 12m 39s (zero interruptions)

Pull Request: https://github.com/user/repo/pull/127
Review when ready. All tests passing.
```

**Result**: Complete feature in 12 minutes, no interruptions

### Review the PR

The PR contains everything you need to review:

```markdown
# PR #127: Add CRUD endpoints for projects, teams, and users

## Summary
Implements complete CRUD operations for three resources with authentication, validation, and tests.

## Changes
### Projects Endpoints
- GET /projects - List all projects
- GET /projects/:id - Get single project
- POST /projects - Create project
- PUT /projects/:id - Update project
- DELETE /projects/:id - Delete project

### Teams Endpoints
(similar structure)

### Users Endpoints
(similar structure)

## Files Changed (18 files)
- Added: src/routes/projects.ts, projects.test.ts
- Added: src/routes/teams.ts, teams.test.ts
- Added: src/routes/users.ts, users.test.ts
- Added: src/services/projects.service.ts, projects.service.test.ts
- (full file list)

## Tests
✓ 45 tests passing
- Projects: 15 tests
- Teams: 15 tests
- Users: 15 tests

## Verification
- [x] All tests passing
- [x] Authentication middleware applied
- [x] Input validation on all endpoints
- [x] Error handling implemented
- [x] Documentation updated

## Performance
- Response times: 10-50ms
- Database queries optimized
- Pagination supported

## Security
- Authentication required on all endpoints
- Input validation with Zod schemas
- SQL injection prevention (parameterized queries)
- Rate limiting applied

---
**Generated by Orchestrator** in 12m 39s
```

### Review Process

**Quick approval** (if everything looks good):
```bash
# Review the code
gh pr view 127
gh pr diff 127

# Approve and merge
gh pr review 127 --approve
gh pr merge 127
```

**Request changes** (if issues found):
```bash
gh pr review 127 --request-changes --body "Please add error handling for X"
```

The orchestrator can then fix issues:
```bash
/orchestrator run "Fix issues in PR #127 based on review feedback"
```

### Tips for Autonomous Mode

**Build trust first**: Use supervised/semi-auto for a few weeks

**Start with small tasks**: Don't jump to huge features immediately

**Review PRs carefully**: This is your only approval point

**Use for batch work**: Perfect for multiple similar tasks
```bash
/orchestrator run "Add unit tests for all service classes"
```

**Monitor completion**: Check notifications
```bash
/orchestrator status  # In another terminal
```

**Have rollback ready**: Test your rollback process
```bash
git revert a1b2c3d
```

### When Autonomous Works Best

✅ **Repetitive tasks**: Same pattern applied multiple times

✅ **Well-understood domains**: Familiar territory

✅ **Non-critical systems**: Development/staging environments

✅ **Trusted patterns**: Using promoted library patterns

✅ **Batch processing**: Multiple similar items

❌ **First-time tasks**: Use supervised to learn

❌ **Production hotfixes**: Too risky without approvals

❌ **Complex unknowns**: Need human judgment

❌ **Security-critical**: Extra scrutiny required

## Switching Between Modes

### Dynamic Mode Switching

Switch modes anytime based on task risk:

```bash
# High-risk task → supervised
/orchestrator config supervised
/orchestrator run "Migrate database schema to new structure"

# Medium-risk → semi-auto
/orchestrator config semi-auto
/orchestrator run "Add new API endpoints"

# Low-risk batch → autonomous
/orchestrator config autonomous
/orchestrator run "Add JSDoc comments to all functions"
```

### Per-Request Override

Stay in one mode but override for specific request:

```bash
# You're in autonomous mode, but this is critical
/orchestrator run "Fix authentication vulnerability" --mode supervised

# You're in supervised mode, but this is routine
/orchestrator run "Update dependency versions" --mode autonomous
```

## Safety Features (All Modes)

Regardless of autonomy level, these safety features are always active:

### 1. File Conflict Prevention
```
Agent A assigned: src/routes/projects.ts
Agent B assigned: src/routes/teams.ts
→ No conflicts possible
```

### 2. Test Validation Gates
```
Implementation complete → Run tests → Tests fail → Retry → Tests pass → Proceed
```

### 3. Retry Logic (3 attempts)
```
Attempt 1: Original approach
Attempt 2: Simpler approach
Attempt 3: Different agent/model
→ Escalate if all fail
```

### 4. Checkpoint System
```
Milestone reached → Create checkpoint → Continue
→ Can rollback to any checkpoint
```

### 5. Git History
```
All changes versioned → Easy rollback → Full audit trail
```

## Configuration File

Advanced configuration via `.pi/config/orchestrator.json`:

```json
{
  "autonomyLevel": "semi-auto",
  "maxParallelAgents": 3,
  "retryAttempts": 3,
  "retryStrategy": "progressive",
  "safetyFeatures": {
    "fileConflictPrevention": true,
    "testValidationGates": true,
    "checkpointSystem": true
  },
  "approvals": {
    "research": false,
    "architecture": false,
    "implementation": false,
    "testing": false,
    "commits": true,
    "pullRequests": true,
    "deployments": true
  },
  "library": {
    "autoInjectPatterns": true,
    "suggestPromotions": true,
    "updateLearnings": true
  }
}
```

Edit approvals for custom autonomy level:
```json
{
  "autonomyLevel": "custom",
  "approvals": {
    "research": false,
    "architecture": true,    // Only approve architecture
    "implementation": false,
    "commits": true,
    "pullRequests": true
  }
}
```

## Best Practices by Mode

### Supervised Mode Best Practices
1. Read each prompt carefully
2. Ask for changes when needed
3. Learn the patterns
4. Build trust gradually
5. Use for 2-4 weeks before moving to semi-auto

### Semi-Auto Mode Best Practices
1. Review commits thoroughly
2. Trust the tests
3. Monitor progress periodically
4. Keep library updated with patterns
5. Use for most development work

### Autonomous Mode Best Practices
1. Review PRs carefully (your only gate)
2. Use for routine, low-risk work
3. Monitor completion notifications
4. Have rollback plan ready
5. Start with small tasks

## Troubleshooting

### Issue: Too Many Prompts (Supervised)
**Solution**: Switch to semi-auto
```bash
/orchestrator config semi-auto
```

### Issue: Not Enough Control (Autonomous)
**Solution**: Switch to semi-auto or supervised
```bash
/orchestrator config semi-auto
```

### Issue: Want Custom Approval Points
**Solution**: Edit config file
```bash
# Edit .pi/config/orchestrator.json
# Set specific approval points
```

### Issue: Concerned About Safety
**Solution**: All modes have safety features
- File conflict prevention: Always on
- Test validation: Always on
- Retry logic: Always on
- Rollback: Always available

## Quick Reference

```bash
# Set autonomy level
/orchestrator config supervised
/orchestrator config semi-auto
/orchestrator config autonomous

# View current config
/orchestrator config

# Override for single request
/orchestrator run "task" --mode supervised

# Cancel anytime
/orchestrator cancel
```

## Next Steps

1. **Choose your level**: Start supervised, progress to semi-auto, optionally to autonomous
2. **Test with simple tasks**: Build confidence
3. **Learn monitoring**: [monitoring.md](./monitoring.md)
4. **Integrate with library**: Use promoted patterns
5. **Review PRs carefully**: Even in autonomous mode

---

**Remember**: Autonomy is about trust. Build it gradually. All modes have safety features. You're always in control.
