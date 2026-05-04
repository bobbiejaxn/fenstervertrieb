---
name: agentops
description: "Monitor agent performance and automate DevOps with proactive agents"
argument-hint: "[command] [options]"
---

# AgentOps - Dual Agent Operations System

AgentOps provides two complementary capabilities: monitoring AI agents for performance optimization, and using AI agents to automate DevOps tasks proactively.

## Two Types of AgentOps

### Type 1: Operating Agents (Monitoring AI Agents)
Monitor and improve the AI agents themselves:
- Track agent success rates and task completion
- Measure pattern and skill effectiveness
- Optimize prompt templates and workflows
- A/B test different agent configurations
- Identify bottlenecks and failure modes
- Generate performance reports

**Use when**: You want to understand and improve how your AI agents perform their tasks.

### Type 2: Agents Doing Ops (Proactive DevOps)
Let agents manage infrastructure and operations:
- Monitor CI/CD pipelines continuously
- Watch logs for errors and anomalies
- Auto-fix common deployment issues
- Deploy and scale services intelligently
- Perform health checks and diagnostics
- Alert on critical failures

**Use when**: You want AI agents to handle operational tasks autonomously.

## Commands

### Type 1: Operating Agents (Monitoring)

| Command | Purpose | Example |
|---------|---------|---------|
| `/agentops stats` | Show agent performance statistics | `/agentops stats --last 7d` |
| `/agentops stats [agent]` | Stats for specific agent | `/agentops stats researcher` |
| `/agentops patterns` | Show pattern effectiveness across agents | `/agentops patterns` |
| `/agentops dashboard` | Live performance dashboard | `/agentops dashboard --refresh 30s` |
| `/agentops report` | Generate comprehensive performance report | `/agentops report --format pdf` |
| `/agentops compare` | A/B test agent configurations | `/agentops compare agent-v1 agent-v2` |

### Type 2: Agents Doing Ops (DevOps Automation)

| Command | Purpose | Example |
|---------|---------|---------|
| `/agentops devops start` | Start DevOps agent in background | `/agentops devops start --watch ci` |
| `/agentops devops status` | Check DevOps agent health | `/agentops devops status` |
| `/agentops devops logs` | View auto-fix history | `/agentops devops logs --last 24h` |
| `/agentops devops stop` | Stop DevOps agent | `/agentops devops stop` |
| `/agentops devops configure` | Configure monitoring rules | `/agentops devops configure` |

## Examples

### Type 1: Operating Agents

#### Example 1: Basic Performance Stats
```bash
User: /agentops stats --last 30d

Agent: Agent Performance Statistics (Last 30 Days)

Overall Metrics:
  Total Tasks: 1,247
  Success Rate: 94.3%
  Avg Completion Time: 12.4s
  Token Efficiency: 87% (vs baseline)

By Agent Type:
  researcher:
    Tasks: 423
    Success: 96.2%
    Avg Time: 18.7s

  code-reviewer:
    Tasks: 318
    Success: 91.8%
    Avg Time: 8.3s

  tdd-guide:
    Tasks: 286
    Success: 95.1%
    Avg Time: 14.2s

Top Failures:
  1. API timeout (3.2%)
  2. Context overflow (1.8%)
  3. Invalid schema (0.7%)
```

#### Example 2: Pattern Effectiveness Analysis
```bash
User: /agentops patterns

Agent: Pattern Effectiveness Analysis

Skill Patterns:
  /library index --force:
    Usage: 45 invocations
    Success: 100%
    Avg Duration: 3.2s
    Token Cost: Low
    Recommendation: ✓ Keep using

  /orchestrator plan multi-agent:
    Usage: 23 invocations
    Success: 87%
    Avg Duration: 45.8s
    Token Cost: High
    Recommendation: ⚠ Review failures

  /prompts research academic:
    Usage: 67 invocations
    Success: 98.5%
    Avg Duration: 28.4s
    Token Cost: Medium
    Recommendation: ✓ Excellent

Prompt Template Performance:
  research-deep-v2: 96% success (recommended)
  research-fast-v1: 89% success (consider upgrading)

Workflow Patterns:
  TDD Flow (test → impl → verify): 97% success
  Direct Implementation: 84% success
  Recommendation: Prefer TDD flow for complex tasks
```

#### Example 3: Live Dashboard
```bash
User: /agentops dashboard --refresh 30s

Agent: [Opens live dashboard showing real-time agent activity]

┌─ Agent Operations Dashboard ──────────────────────┐
│ Active Agents: 3                 Refresh: 30s     │
├───────────────────────────────────────────────────┤
│ Current Tasks:                                    │
│   • researcher: Analyzing codebase structure      │
│     Progress: [████████░░] 80% | 24s elapsed     │
│                                                   │
│   • code-reviewer: Security audit on PR #47       │
│     Progress: [██████░░░░] 60% | 18s elapsed     │
│                                                   │
│   • doc-updater: Updating API documentation       │
│     Progress: [█████████░] 90% | 12s elapsed     │
├───────────────────────────────────────────────────┤
│ Recent Completions (Last 5m):                     │
│   ✓ tdd-guide: Test suite for auth module (14s)  │
│   ✓ researcher: Market analysis report (32s)     │
│   ✗ planner: Feature roadmap (timeout)           │
├───────────────────────────────────────────────────┤
│ Resource Usage:                                   │
│   Tokens: 847K / 2M daily limit (42%)            │
│   API Calls: 234 / 1000 hourly (23%)             │
│   Cache Hit Rate: 78%                             │
└───────────────────────────────────────────────────┘
```

#### Example 4: A/B Testing Agent Configs
```bash
User: /agentops compare researcher-v1 researcher-v2 --metric accuracy

Agent: A/B Comparison: researcher-v1 vs researcher-v2

Test Period: 7 days
Sample Size: 50 tasks each

Metric: Accuracy

researcher-v1 (baseline):
  Accuracy: 92.3%
  Avg Tokens: 12,400
  Avg Time: 18.7s
  Cost per task: $0.024

researcher-v2 (experimental):
  Accuracy: 96.8% (+4.5% ✓)
  Avg Tokens: 15,200 (+22.6%)
  Avg Time: 21.3s (+13.9%)
  Cost per task: $0.031 (+29.2%)

Statistical Significance: p < 0.01 (highly significant)

Recommendation: Deploy researcher-v2
Reasoning: 4.5% accuracy improvement justifies 29% cost increase
for high-value research tasks. Consider keeping v1 for quick
research where speed matters more than depth.

Changes in v2:
  - Added iterative refinement step
  - Increased context window for sources
  - Enhanced citation validation
```

#### Example 5: Performance Report Generation
```bash
User: /agentops report --period quarterly --format markdown

Agent: Generating Q1 2026 Agent Operations Report...

Created: /reports/agentops-q1-2026.md

Executive Summary:
  • 15,847 agent tasks completed
  • 94.2% overall success rate (up from 91.8% in Q4)
  • 23% reduction in avg task completion time
  • $4,231 total API costs (within budget)

Key Improvements:
  1. Implemented caching layer → 78% cache hit rate
  2. Optimized researcher agent → 18% faster research
  3. Added TDD workflow → 97% success rate vs 84% direct

Action Items:
  1. Investigate code-reviewer timeout issues (3.2% of failures)
  2. Consider upgrading all agents to use structured output
  3. Expand A/B testing to planner and architect agents
```

### Type 2: Agents Doing Ops

#### Example 6: Starting DevOps Agent
```bash
User: /agentops devops start --watch ci --watch logs

Agent: Starting DevOps Agent...

Configuration:
  Monitoring: CI/CD pipelines, application logs
  Auto-fix: Enabled for known issues
  Alert threshold: Critical and High severity
  Check interval: 2 minutes

DevOps Agent started (PID: 24891)

Initial checks:
  ✓ GitHub Actions API connected
  ✓ Log aggregator connected
  ✓ Deployment hooks configured

Monitoring:
  - GitHub Actions workflows
  - Vercel deployments
  - Application error logs
  - Database connection pool

Agent will run in background and alert on issues.
View status: /agentops devops status
View activity: /agentops devops logs
```

#### Example 7: Auto-Fix in Action
```bash
User: /agentops devops logs --last 24h

Agent: DevOps Agent Activity (Last 24 Hours)

Auto-Fixes Applied: 7
Alerts Sent: 2
False Positives: 1

Timeline:

[2026-03-17 08:23] DETECTED: Build failure in CI
  Pipeline: main branch → production
  Error: "Module '@pi/core' not found"
  Diagnosis: Stale node_modules cache

[2026-03-17 08:24] AUTO-FIX: Cache cleared, build restarted
  Action: Invalidated build cache, triggered rebuild
  Result: ✓ Build succeeded (2m 34s)

[2026-03-17 11:47] DETECTED: High error rate in production
  Service: API gateway
  Error rate: 12% (threshold: 5%)
  Pattern: "Database connection timeout"

[2026-03-17 11:48] AUTO-FIX: Connection pool adjusted
  Action: Increased max connections: 10 → 20
  Result: ✓ Error rate dropped to 0.3%
  Follow-up: Added monitoring for connection pool exhaustion

[2026-03-17 14:12] DETECTED: Deployment blocked
  Service: frontend deployment to Vercel
  Issue: Build exceeds memory limit

[2026-03-17 14:13] AUTO-FIX: Build optimization applied
  Actions:
    - Enabled Next.js memory optimization
    - Adjusted build concurrency
    - Updated Vercel config
  Result: ✓ Deployment succeeded

[2026-03-17 18:05] ALERT: Cannot auto-fix
  Issue: Database migration conflict
  Severity: High
  Details: Two conflicting migrations detected in PR #89
  Action: Notified team, assigned to @database-team
```

#### Example 8: DevOps Agent Status Check
```bash
User: /agentops devops status

Agent: DevOps Agent Status

Status: ✓ Running (uptime: 3d 14h 28m)
PID: 24891
Last check: 42 seconds ago

Health Metrics:
  ✓ API connections: All healthy
  ✓ Memory usage: 234 MB / 512 MB (46%)
  ✓ Response time: avg 1.2s
  ⚠ Alert queue: 3 pending (normal)

Monitoring Coverage:
  ✓ GitHub Actions (6 workflows)
  ✓ Vercel (3 projects)
  ✓ Application logs (4 services)
  ✓ Database metrics
  ✗ AWS CloudWatch (not configured)

Recent Activity:
  Last 1h: 2 checks, 0 issues
  Last 24h: 47 checks, 7 auto-fixes, 2 alerts
  Last 7d: 342 checks, 28 auto-fixes, 9 alerts

Auto-Fix Success Rate: 78% (22 of 28 attempted)

Recommendations:
  1. Configure AWS CloudWatch for complete coverage
  2. Review false positive from 2026-03-17 16:33
  3. Consider adding Kubernetes monitoring
```

#### Example 9: Configuring DevOps Monitoring
```bash
User: /agentops devops configure

Agent: DevOps Agent Configuration

Current Rules:
  1. CI Build Failures → Clear cache and retry
  2. High Error Rate (>5%) → Scale up, investigate
  3. Deployment Blocked → Optimize and retry
  4. Database Timeout → Adjust connection pool
  5. Memory Leak Detected → Restart service

What would you like to configure?
  1. Add new monitoring rule
  2. Modify existing rule
  3. Adjust alert thresholds
  4. Change check intervals
  5. Configure integrations

User: Add new monitoring rule

Agent: New Monitoring Rule

Trigger condition (what to watch for):

User: API response time > 2 seconds for 5 consecutive requests

Agent: Auto-fix actions (what to do):
  1. Scale up service
  2. Clear cache
  3. Restart service
  4. Alert team
  5. Custom script

User: 1. Scale up service, then 2. Clear cache if still slow

Agent: Alert severity:
  - Low: Log only
  - Medium: Log + notification
  - High: Log + notification + wake on-call
  - Critical: Log + notification + wake on-call + escalate

User: High

Agent: Rule configured:

Trigger: API response time > 2s (5 consecutive)
Actions:
  1. Scale service +1 instance
  2. If still slow: Clear application cache
  3. Monitor for 5 minutes
Alert: High severity
Enabled: Yes

Rule saved. DevOps agent will apply this rule on next check cycle.
Test this rule: /agentops devops test-rule api-response-time
```

## Integration with Other Skills

### With /orchestrator
```bash
# Monitor orchestrator's multi-agent performance
/agentops stats orchestrator --breakdown by-team

# Optimize team compositions based on data
/agentops patterns --filter orchestrator-teams
```

### With /library
```bash
# Track which library patterns are most effective
/agentops patterns --filter library-usage

# Optimize package distribution strategies
/agentops report --focus library-performance
```

### With /prompts
```bash
# A/B test different prompt templates
/agentops compare prompt-v1 prompt-v2

# Find which prompts lead to best outcomes
/agentops patterns --filter prompt-effectiveness
```

## Decision Framework

### When to Use Type 1 (Operating Agents)

Use monitoring when you want to:
- **Understand** how agents perform tasks
- **Optimize** agent configurations and prompts
- **Debug** recurring agent failures
- **Justify** investment in agent infrastructure
- **Compare** different agent approaches
- **Report** on AI operations to stakeholders

**Example scenarios**:
- "Which agent configuration performs best for code reviews?"
- "Why does the researcher agent timeout on 8% of tasks?"
- "Is the TDD workflow worth the extra time investment?"
- "How much are agent operations costing per month?"

### When to Use Type 2 (Agents Doing Ops)

Use DevOps automation when you want to:
- **Reduce** manual operational toil
- **Respond** faster to production issues
- **Scale** operations without scaling team
- **Prevent** common deployment failures
- **Monitor** services continuously
- **Auto-remediate** known issue patterns

**Example scenarios**:
- "Automatically fix failed builds due to cache issues"
- "Scale services when response times degrade"
- "Monitor for database connection pool exhaustion"
- "Alert and auto-fix common deployment failures"

### Use Both Together

Combine monitoring and automation for:
- **Learn then automate**: Monitor failures, then create auto-fix rules
- **Validate automation**: Track DevOps agent effectiveness
- **Continuous improvement**: Use monitoring data to improve auto-fix rules
- **Cost optimization**: Monitor DevOps agent to justify automation ROI

**Example workflow**:
1. Monitor production issues (Type 1)
2. Identify recurring patterns
3. Create auto-fix rules (Type 2)
4. Monitor auto-fix success rate (Type 1)
5. Refine rules based on data

## Cookbooks

Detailed guides for specific use cases:

- **[Monitoring Cookbook](cookbook/monitoring.md)** - Track and analyze agent performance
- **[DevOps Setup Cookbook](cookbook/devops-setup.md)** - Configure proactive DevOps automation
- **[Dashboard Cookbook](cookbook/dashboard.md)** - Use the live dashboard effectively

## Common Patterns

### Pattern 1: Weekly Performance Review
```bash
# Every Monday
/agentops stats --last 7d
/agentops patterns
/agentops report --period weekly --email team@company.com
```

### Pattern 2: Continuous Optimization Loop
```bash
# 1. Identify low-performing agents
/agentops stats --sort-by success-rate-asc

# 2. Deep dive into failures
/agentops analyze [agent-name] --failures-only

# 3. Test improvements
/agentops compare [agent]-v1 [agent]-v2

# 4. Deploy winner
/agentops deploy [agent]-v2
```

### Pattern 3: Proactive Production Monitoring
```bash
# Start DevOps agent with comprehensive monitoring
/agentops devops start \
  --watch ci \
  --watch logs \
  --watch metrics \
  --auto-fix enabled \
  --alert-channel slack

# Check effectiveness weekly
/agentops devops logs --period 7d --summary
```

## Troubleshooting

### Type 1: Monitoring Issues

**Problem**: Stats show low success rates
**Solution**:
```bash
/agentops analyze [agent] --failures-only
# Review failure patterns, adjust agent configuration
```

**Problem**: Dashboard not updating
**Solution**:
```bash
/agentops dashboard --reset-cache
```

**Problem**: A/B test results inconclusive
**Solution**: Increase sample size or test duration
```bash
/agentops compare agent-v1 agent-v2 --duration 14d --min-samples 100
```

### Type 2: DevOps Automation Issues

**Problem**: DevOps agent not detecting issues
**Solution**:
```bash
# Check configuration and connectivity
/agentops devops status --verbose

# Adjust check intervals
/agentops devops configure --check-interval 1m
```

**Problem**: Too many false positive alerts
**Solution**:
```bash
# Review alert thresholds
/agentops devops configure --adjust-thresholds

# Add noise reduction rules
/agentops devops configure --add-filter
```

**Problem**: Auto-fix attempts failing
**Solution**:
```bash
# Review recent auto-fix attempts
/agentops devops logs --filter failed-fixes

# Adjust auto-fix rules or disable for specific issues
/agentops devops configure --modify-rule [rule-id]
```

## Best Practices

### For Type 1 (Monitoring)
1. **Review stats regularly** - Weekly at minimum
2. **Set baselines** - Establish what "good" looks like
3. **Act on insights** - Use data to drive improvements
4. **A/B test changes** - Validate improvements with data
5. **Share reports** - Keep stakeholders informed

### For Type 2 (DevOps Automation)
1. **Start conservative** - Monitor before auto-fixing
2. **Test rules thoroughly** - Use test mode first
3. **Set appropriate thresholds** - Balance speed vs safety
4. **Review auto-fixes** - Ensure rules remain effective
5. **Maintain override controls** - Always allow manual intervention

### For Both
1. **Monitor the monitors** - Track agent performance itself
2. **Iterate continuously** - Use data to improve operations
3. **Document patterns** - Share effective rules and configs
4. **Balance automation vs control** - Not everything should be automated
5. **Measure ROI** - Track time saved and issues prevented

## Related Skills

- `/orchestrator` - Multi-agent coordination (monitored by Type 1)
- `/library` - Package management (can be automated by Type 2)
- `/prompts` - Prompt templates (effectiveness tracked by Type 1)
- `/research` - Research workflows (monitored and optimized)

## Next Steps

1. **Start monitoring**: `/agentops stats` to see current performance
2. **Review patterns**: `/agentops patterns` to identify improvements
3. **Try DevOps automation**: `/agentops devops start` for proactive ops
4. **Read cookbooks**: Detailed guides for specific workflows

---

**Remember**: Type 1 helps you understand and improve agent operations. Type 2 lets agents handle operations autonomously. Use both for comprehensive agent operations management.
