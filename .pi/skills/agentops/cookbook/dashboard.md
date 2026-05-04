# AgentOps Dashboard Cookbook

This cookbook covers using the AgentOps dashboard for real-time monitoring and analysis.

## Table of Contents
1. [Dashboard Overview](#dashboard-overview)
2. [Getting Started](#getting-started)
3. [Dashboard Views](#dashboard-views)
4. [Reading Metrics](#reading-metrics)
5. [Custom Dashboards](#custom-dashboards)
6. [Exporting Data](#exporting-data)
7. [Dashboard Tips](#dashboard-tips)

## Dashboard Overview

### What is the AgentOps Dashboard?

The AgentOps dashboard provides real-time visibility into:
- **Type 1**: AI agent performance and operations
- **Type 2**: DevOps agent activity and auto-fixes

### Dashboard Modes

Three modes available:

1. **Live Mode**: Real-time updates (default: 30s refresh)
2. **Historical Mode**: Time-range analysis
3. **Comparison Mode**: Compare different time periods

## Getting Started

### Launching the Dashboard

```bash
# Basic dashboard (live mode)
/agentops dashboard

# With custom refresh rate
/agentops dashboard --refresh 10s

# Historical view
/agentops dashboard --period 24h

# Comparison view
/agentops dashboard --compare yesterday today
```

### Dashboard Layouts

Choose from predefined layouts:

```bash
# Operations overview (default)
/agentops dashboard --layout operations

# Performance focus
/agentops dashboard --layout performance

# Cost analysis
/agentops dashboard --layout costs

# DevOps automation
/agentops dashboard --layout devops

# Executive summary
/agentops dashboard --layout executive
```

### First-Time Setup

```bash
User: /agentops dashboard

Agent: Opening AgentOps Dashboard...

Choose your default view:
  1. Operations Overview (agents + devops)
  2. Agent Performance Only
  3. DevOps Automation Only
  4. Cost Analysis
  5. Custom

User: 1

Agent: Refresh rate:
  1. Real-time (5s) - high resource usage
  2. Fast (10s) - moderate resource usage
  3. Standard (30s) - low resource usage
  4. Slow (1m) - minimal resource usage

User: 3

Agent: Dashboard preferences saved.

[Dashboard opens with Operations Overview]
```

## Dashboard Views

### Operations Overview

Combines agent performance and DevOps automation:

```
┌─ AgentOps Dashboard - Operations Overview ────────────────┐
│ Last updated: 2026-03-17 14:23:45 | Refresh: 30s          │
├───────────────────────────────────────────────────────────┤
│ AGENT OPERATIONS                                          │
│                                                           │
│ Active Agents: 3 of 5        Success Rate: 94.2% ▲       │
│ Tasks Today: 1,247           Avg Time: 14.3s ▼            │
│ Token Usage: 847K / 2M (42%) Cost Today: $142.30         │
│                                                           │
│ Currently Running:                                        │
│   researcher        [████████░░] 80% | 24s elapsed       │
│     Task: Analyzing codebase structure                    │
│                                                           │
│   code-reviewer     [██████░░░░] 60% | 18s elapsed       │
│     Task: Security audit on PR #47                        │
│                                                           │
│   doc-updater       [█████████░] 90% | 12s elapsed       │
│     Task: Updating API documentation                      │
│                                                           │
│ Recent Completions (5m):                                  │
│   ✓ tdd-guide: Test suite for auth (14s, $0.08)         │
│   ✓ researcher: Market analysis (32s, $0.18)            │
│   ✗ planner: Feature roadmap (timeout)                   │
├───────────────────────────────────────────────────────────┤
│ DEVOPS AUTOMATION                                         │
│                                                           │
│ DevOps Agent: ✓ Running (3d 14h uptime)                  │
│ Last Check: 42s ago          Auto-Fixes Today: 7         │
│ Alerts Today: 2              Success Rate: 89%            │
│                                                           │
│ Active Monitors:                                          │
│   GitHub Actions    ✓ 6 workflows | Last: 2m ago        │
│   Sentry Logs       ✓ 4 services  | Last: 1m ago        │
│   Vercel Deploy     ✓ 3 projects  | Last: 3m ago        │
│                                                           │
│ Recent Activity (1h):                                     │
│   08:23 ✓ AUTO-FIX: Build cache cleared → Success       │
│   11:47 ✓ AUTO-FIX: DB pool scaled → Error rate fixed   │
│   14:12 ✓ AUTO-FIX: Build optimized → Deploy succeeded  │
├───────────────────────────────────────────────────────────┤
│ ALERTS & NOTIFICATIONS                                    │
│                                                           │
│ ⚠ 1 Active Alert:                                         │
│   code-reviewer: Success rate 87% (below 90% target)     │
│   → Investigating schema validation errors               │
│                                                           │
│ 3 Pending Items:                                          │
│   • Review failed auto-fix from 16:33                     │
│   • A/B test result ready: researcher-prompt-v3           │
│   • Weekly report available                               │
└───────────────────────────────────────────────────────────┘

[q] Quit  [r] Refresh  [v] Change View  [f] Filter  [e] Export
```

### Agent Performance Dashboard

Focused on agent operations:

```
┌─ Agent Performance Dashboard ─────────────────────────────┐
│ Time Range: Last 24h | Refresh: 30s                      │
├───────────────────────────────────────────────────────────┤
│ OVERVIEW METRICS                                          │
│                                                           │
│ Total Tasks: 1,247      Success: 94.2% ▲ (+1.3%)        │
│ Avg Time: 14.3s ▼       Token Usage: 847K ▼             │
│ Cost: $142.30          Cost/Task: $0.114 ▼               │
├───────────────────────────────────────────────────────────┤
│ BY AGENT TYPE                                             │
│                                                           │
│ researcher (423 tasks)                                    │
│   Success: 96.2% ████████████████████▊ │ Time: 18.7s    │
│   Tokens: 342K   Cost: $61.20                            │
│                                                           │
│ code-reviewer (318 tasks)                                 │
│   Success: 91.8% ██████████████████▍   │ Time: 8.3s     │
│   Tokens: 198K   Cost: $28.40                            │
│                                                           │
│ tdd-guide (286 tasks)                                     │
│   Success: 95.1% ███████████████████   │ Time: 14.2s    │
│   Tokens: 215K   Cost: $34.50                            │
│                                                           │
│ doc-updater (142 tasks)                                   │
│   Success: 97.2% ███████████████████▍  │ Time: 9.1s     │
│   Tokens: 68K    Cost: $11.80                            │
│                                                           │
│ planner (78 tasks)                                        │
│   Success: 89.7% █████████████████▊    │ Time: 21.4s    │
│   Tokens: 24K    Cost: $6.40                             │
├───────────────────────────────────────────────────────────┤
│ FAILURE ANALYSIS                                          │
│                                                           │
│ Top Failure Modes:                                        │
│   1. Timeout (3.2%) - Most common in researcher          │
│   2. Schema validation (1.8%) - code-reviewer issue      │
│   3. Context overflow (0.9%) - Large file handling       │
│   4. API error (0.3%) - Transient failures               │
│                                                           │
│ Failure Trend: ▼ Down 0.8% from last period              │
├───────────────────────────────────────────────────────────┤
│ PERFORMANCE TRENDS (24h)                                  │
│                                                           │
│ Success Rate:                                             │
│   95% ┤        ╭─╮                                        │
│   94% ┤    ╭───╯ ╰─╮                                      │
│   93% ┼────╯       ╰─────╮                                │
│   92% ┤                  ╰─                               │
│       └─────────────────────── Time                       │
│         6am   12pm   6pm   12am                           │
│                                                           │
│ Response Time:                                            │
│   20s ┤                  ╭──╮                             │
│   15s ┼──────────────╭───╯  ╰─                            │
│   10s ┤          ╭───╯                                    │
│    5s ┤      ────╯                                        │
│       └─────────────────────── Time                       │
│         6am   12pm   6pm   12am                           │
└───────────────────────────────────────────────────────────┘

[d] Details  [a] Agent View  [p] Pattern Analysis  [e] Export
```

### DevOps Automation Dashboard

Focused on DevOps agent:

```
┌─ DevOps Automation Dashboard ─────────────────────────────┐
│ Time Range: Last 24h | Refresh: 30s                      │
├───────────────────────────────────────────────────────────┤
│ DEVOPS AGENT STATUS                                       │
│                                                           │
│ Status: ✓ Running                Uptime: 3d 14h 28m      │
│ Last Check: 42s ago              Health: Good            │
│ Memory: 234MB / 512MB (46%)      CPU: 12%                │
├───────────────────────────────────────────────────────────┤
│ MONITORING COVERAGE                                       │
│                                                           │
│ GitHub Actions    ✓ Healthy | 6 workflows | 47 checks   │
│   main: CI                 ✓ Last: 2m ago                │
│   main: Deploy Production  ✓ Last: 18m ago               │
│   staging: Deploy          ✓ Last: 45m ago               │
│                                                           │
│ Sentry Logs       ✓ Healthy | 4 services | 47 checks    │
│   API Gateway      ✓ Errors: 0.3% Last: 1m ago          │
│   Web Frontend     ✓ Errors: 0.1% Last: 1m ago          │
│   Worker Service   ✓ Errors: 0.0% Last: 1m ago          │
│                                                           │
│ Vercel Deploy     ✓ Healthy | 3 projects | 47 checks    │
│   pi-web           ✓ Deployed Last: 3m ago               │
│   pi-docs          ✓ Deployed Last: 15m ago              │
├───────────────────────────────────────────────────────────┤
│ AUTO-FIX ACTIVITY (24h)                                   │
│                                                           │
│ Total Attempts: 7            Successful: 6 (86%)         │
│ Failed: 1                    Avg Time: 3.2m              │
│                                                           │
│ Timeline:                                                 │
│   08:23 ✓ Build cache cleared                            │
│     Issue: Module not found                               │
│     Action: Cleared npm cache, retried build              │
│     Result: Build succeeded (2m 34s)                      │
│                                                           │
│   11:47 ✓ DB connection pool scaled                      │
│     Issue: High error rate (12%)                          │
│     Action: Increased pool 10→20 connections              │
│     Result: Error rate → 0.3% (4m 12s)                   │
│                                                           │
│   14:12 ✓ Build memory optimized                         │
│     Issue: Deployment memory exceeded                     │
│     Action: Enabled optimization, adjusted config         │
│     Result: Deployment succeeded (5m 48s)                │
│                                                           │
│   16:33 ✗ Migration conflict                             │
│     Issue: Conflicting database migrations                │
│     Action: Unable to auto-fix                            │
│     Result: Escalated to @database-team                   │
├───────────────────────────────────────────────────────────┤
│ ALERT SUMMARY (24h)                                       │
│                                                           │
│ Total Alerts: 2              Critical: 0  High: 1        │
│                                                           │
│   11:47 HIGH: High error rate → Auto-fixed               │
│   16:33 HIGH: Migration conflict → Manual fix needed     │
├───────────────────────────────────────────────────────────┤
│ EFFECTIVENESS METRICS                                     │
│                                                           │
│ Issues Detected: 8           Auto-Fixed: 6 (75%)         │
│ MTTR: 3.2m (Mean Time to Resolution)                     │
│ Time Saved: ~2.1 hours (vs manual intervention)          │
│                                                           │
│ Auto-Fix Success Rate Trend:                              │
│   90% ┤                      ╭─                           │
│   80% ┼──────────╭───────────╯                            │
│   70% ┤      ╭───╯                                        │
│   60% ┤  ────╯                                            │
│       └─────────────────────── Time                       │
│         Week 1  Week 2  Week 3  Week 4                    │
└───────────────────────────────────────────────────────────┘

[r] Rules  [l] Logs  [c] Configure  [t] Test  [e] Export
```

### Cost Analysis Dashboard

Financial metrics and optimization:

```
┌─ Cost Analysis Dashboard ─────────────────────────────────┐
│ Time Range: Last 30 days | Budget: $5,000/mo             │
├───────────────────────────────────────────────────────────┤
│ COST OVERVIEW                                             │
│                                                           │
│ Month to Date: $3,241.15 (65% of budget) ▲ +12%         │
│ Daily Avg: $142.30           Projected: $4,269           │
│ Remaining: $1,758.85         Days Left: 14               │
│                                                           │
│ Status: ✓ On Track (13% under budget)                    │
├───────────────────────────────────────────────────────────┤
│ COST BY AGENT                                             │
│                                                           │
│ researcher         $1,642.50 ████████████████▌  (51%)    │
│   12,847 tasks @ $0.128/task                              │
│   High usage due to deep research tasks                   │
│                                                           │
│ code-reviewer      $784.20   ███████▌         (24%)      │
│   6,432 tasks @ $0.122/task                               │
│   Moderate usage, good efficiency                         │
│                                                           │
│ tdd-guide          $542.15   █████▍           (17%)      │
│   4,218 tasks @ $0.129/task                               │
│   Moderate usage                                          │
│                                                           │
│ doc-updater        $187.40   █▊                (6%)      │
│   1,847 tasks @ $0.101/task                               │
│   Low usage, very efficient                               │
│                                                           │
│ planner            $84.90    ▊                 (3%)      │
│   712 tasks @ $0.119/task                                 │
│   Low usage                                               │
├───────────────────────────────────────────────────────────┤
│ COST TRENDS                                               │
│                                                           │
│ Daily Cost:                                               │
│  $200 ┤                                                   │
│  $150 ┼─╮   ╭──╮      ╭─╮                                │
│  $100 ┤ ╰───╯  ╰──────╯ ╰──────                          │
│   $50 ┤                                                   │
│       └─────────────────────── Time                       │
│         Week 1  Week 2  Week 3  Week 4                    │
│                                                           │
│ Cost per Task:                                            │
│  $0.15 ┤                                                  │
│  $0.12 ┼───────╮                                          │
│  $0.10 ┤       ╰──────────────                            │
│  $0.08 ┤                                                  │
│        └─────────────────────── Time                      │
│          Week 1  Week 2  Week 3  Week 4                   │
│                                                           │
│ ✓ Cost per task decreasing (optimization working)        │
├───────────────────────────────────────────────────────────┤
│ OPTIMIZATION OPPORTUNITIES                                │
│                                                           │
│ 1. Implement caching for researcher                       │
│    Potential savings: $328/mo (20% of researcher cost)    │
│                                                           │
│ 2. Use Haiku for simple code reviews                      │
│    Potential savings: $157/mo (20% of reviewer cost)      │
│                                                           │
│ 3. Batch doc updates (daily vs real-time)                │
│    Potential savings: $37/mo (20% of updater cost)        │
│                                                           │
│ Total potential savings: $522/mo (16% reduction)          │
└───────────────────────────────────────────────────────────┘

[o] Optimization Plan  [b] Budget Alerts  [f] Forecast  [e] Export
```

### Executive Summary Dashboard

High-level metrics for stakeholders:

```
┌─ Executive Summary ───────────────────────────────────────┐
│ Period: Last 30 days                                      │
├───────────────────────────────────────────────────────────┤
│ KEY METRICS                                               │
│                                                           │
│ Agent Operations                                          │
│   Tasks Completed: 15,847    Success Rate: 94.2% ▲       │
│   Avg Response Time: 14.3s   Efficiency: +23% ▲          │
│   Cost: $3,241.15           Budget Status: ✓ On Track    │
│                                                           │
│ DevOps Automation                                         │
│   Issues Detected: 89        Auto-Fixed: 67 (75%)        │
│   Time Saved: 28.4 hours     MTTR: 3.2 minutes           │
│   Alerts Sent: 22           False Positives: 3 (14%)     │
├───────────────────────────────────────────────────────────┤
│ BUSINESS IMPACT                                           │
│                                                           │
│ Time Savings:                                             │
│   Agent automation: ~87 hours of human work              │
│   DevOps auto-fix: ~28 hours of incident response        │
│   Total: 115 hours ($11,500 value @ $100/hr)             │
│                                                           │
│ Quality Improvements:                                     │
│   Code review coverage: 100% (up from 67%)                │
│   Test coverage: 94% (up from 78%)                        │
│   Documentation: Always current (was 2-4 weeks stale)     │
│                                                           │
│ Operational Excellence:                                   │
│   Incident response: 3.2m (was 45m average)               │
│   Deployment success: 98% (up from 89%)                   │
│   Production errors: -67% reduction                       │
├───────────────────────────────────────────────────────────┤
│ ROI ANALYSIS                                              │
│                                                           │
│ Investment: $3,241.15 (agent costs)                       │
│ Returns: $11,500 (time savings)                           │
│ ROI: 355%                                                 │
│                                                           │
│ Payback period: 8.5 days                                  │
├───────────────────────────────────────────────────────────┤
│ TRENDS                                                    │
│                                                           │
│ ✓ Success rates improving (+1.3% MoM)                    │
│ ✓ Response times decreasing (-23% MoM)                   │
│ ✓ Cost efficiency improving (+18% MoM)                   │
│ ✓ Auto-fix success increasing (+12% MoM)                 │
│                                                           │
│ Overall Status: ✓ Exceeding Expectations                 │
└───────────────────────────────────────────────────────────┘

[d] Detailed Report  [s] Share  [e] Export PDF
```

## Reading Metrics

### Understanding Success Rate

Success rate = (Successful tasks / Total tasks) × 100

**Interpreting values**:
- **95-100%**: Excellent performance
- **90-95%**: Good performance (normal range)
- **85-90%**: Concerning, investigate failures
- **<85%**: Critical, immediate action needed

**Trend indicators**:
- ▲ Improving (green)
- ▼ Degrading (yellow/red)
- ─ Stable (blue)

### Understanding Response Time

Average time from task start to completion.

**Interpreting values**:
- **<10s**: Fast (simple tasks)
- **10-20s**: Normal (standard tasks)
- **20-30s**: Slow (complex tasks)
- **>30s**: Very slow, may need optimization

**What affects response time**:
- Input token count (context size)
- Output token count (response length)
- Model speed (Haiku < Sonnet < Opus)
- API latency
- Processing overhead

### Understanding Token Efficiency

Token efficiency = (Baseline tokens / Actual tokens) × 100

**Interpreting values**:
- **>100%**: Using fewer tokens than baseline (good)
- **100%**: At baseline
- **<100%**: Using more tokens than baseline (review needed)

**How to improve**:
- Reduce context size
- Use structured output
- Implement caching
- Optimize prompts

### Understanding Auto-Fix Success Rate

Auto-fix success = (Successful fixes / Total attempts) × 100

**Interpreting values**:
- **>90%**: Excellent, reliable automation
- **80-90%**: Good, normal range
- **70-80%**: Fair, review failure patterns
- **<70%**: Poor, revise auto-fix rules

### Understanding MTTR

Mean Time To Resolution: Average time to resolve incidents.

**Target values**:
- **<5m**: Excellent (fully automated)
- **5-15m**: Good (mostly automated)
- **15-30m**: Fair (semi-automated)
- **>30m**: Poor (mostly manual)

## Custom Dashboards

### Creating Custom Views

```bash
# Create new dashboard layout
/agentops dashboard create-layout my-dashboard

# Add widgets
/agentops dashboard add-widget my-dashboard \
  --type metric \
  --metric success-rate \
  --agent researcher

/agentops dashboard add-widget my-dashboard \
  --type chart \
  --metric cost \
  --group-by agent \
  --period 30d

/agentops dashboard add-widget my-dashboard \
  --type timeline \
  --source devops-logs \
  --filter auto-fix
```

### Example Custom Dashboard: Research Operations

```bash
/agentops dashboard create-layout research-ops

# Add research-specific widgets
/agentops dashboard add-widget research-ops \
  --type metric \
  --metric success-rate \
  --agent researcher

/agentops dashboard add-widget research-ops \
  --type chart \
  --metric avg-time \
  --agent researcher \
  --breakdown by-research-type

/agentops dashboard add-widget research-ops \
  --type table \
  --source recent-tasks \
  --agent researcher \
  --limit 10

# Launch custom dashboard
/agentops dashboard --layout research-ops
```

## Exporting Data

### Export Formats

```bash
# Export as CSV
/agentops dashboard export \
  --format csv \
  --output /reports/agentops-2026-03.csv

# Export as JSON
/agentops dashboard export \
  --format json \
  --output /reports/agentops-2026-03.json

# Export as PDF (includes charts)
/agentops dashboard export \
  --format pdf \
  --output /reports/agentops-2026-03.pdf

# Export as image (screenshot)
/agentops dashboard export \
  --format png \
  --output /reports/dashboard-snapshot.png
```

### Scheduled Exports

```bash
# Schedule daily exports
/agentops dashboard schedule-export \
  --frequency daily \
  --time 9am \
  --format pdf \
  --email team@company.com

# Schedule weekly reports
/agentops dashboard schedule-export \
  --frequency weekly \
  --day monday \
  --time 9am \
  --format pdf \
  --layout executive \
  --email leadership@company.com
```

### Export Specific Data

```bash
# Export agent performance data
/agentops stats export \
  --agent researcher \
  --period 30d \
  --format csv

# Export DevOps logs
/agentops devops logs export \
  --period 7d \
  --format json

# Export cost data
/agentops costs export \
  --breakdown by-agent \
  --period 90d \
  --format csv
```

## Dashboard Tips

### Performance Tips

1. **Use appropriate refresh rates**
   - Real-time monitoring: 10-30s
   - Periodic checks: 1-5m
   - Historical analysis: Static/no refresh

2. **Filter data to reduce load**
   ```bash
   /agentops dashboard --filter agent=researcher --filter status=failed
   ```

3. **Use summary views for overview**
   - Detailed views for deep dives
   - Summary views for monitoring

### Interpretation Tips

1. **Look for trends, not absolutes**
   - A single failure is normal
   - Increasing failure rate is a concern

2. **Context matters**
   - Weekend usage vs weekday
   - Post-deployment vs steady state
   - Peak hours vs off-hours

3. **Correlate metrics**
   - Success rate drop + response time increase = resource issue
   - Cost increase + task count stable = inefficiency
   - Auto-fix failures + specific error type = rule needs update

### Workflow Tips

1. **Daily health check routine**
   ```bash
   /agentops dashboard --snapshot
   # Quick scan for red flags
   # Check recent failures
   # Review costs
   ```

2. **Weekly deep dive**
   ```bash
   /agentops dashboard --period 7d --layout performance
   # Analyze trends
   # Identify optimization opportunities
   # Review auto-fix effectiveness
   ```

3. **Monthly business review**
   ```bash
   /agentops dashboard --period 30d --layout executive
   # ROI analysis
   # Cost projections
   # Strategic planning
   ```

## Keyboard Shortcuts

When dashboard is active:

- `q`: Quit dashboard
- `r`: Force refresh
- `v`: Change view/layout
- `f`: Apply filters
- `e`: Export current view
- `d`: Detailed view (drill down)
- `h`: Help / Show shortcuts
- `s`: Settings
- `←/→`: Navigate time periods
- `/`: Search

## Troubleshooting

### Dashboard Not Loading

```bash
# Check dashboard service
/agentops dashboard status

# Reset dashboard cache
/agentops dashboard reset-cache

# Verify data availability
/agentops stats --last 1h
```

### Slow Dashboard Performance

```bash
# Reduce refresh rate
/agentops dashboard --refresh 1m

# Limit data range
/agentops dashboard --period 12h

# Use summary metrics
/agentops dashboard --mode summary
```

### Missing Data

```bash
# Verify data collection
/agentops status --verbose

# Check integration connectivity
/agentops devops test-integrations

# Refresh data
/agentops dashboard --force-refresh
```

## Best Practices

1. **Set up persistent dashboard**
   - Keep it running on a dedicated monitor
   - Use appropriate refresh rate
   - Configure alerts for anomalies

2. **Create role-specific views**
   - Engineers: Performance dashboard
   - DevOps: Automation dashboard
   - Leadership: Executive summary
   - Finance: Cost analysis

3. **Schedule regular exports**
   - Daily: Operations team
   - Weekly: Management
   - Monthly: Leadership

4. **Integrate with workflows**
   - Link from alerting system
   - Include in incident runbooks
   - Reference in performance reviews

## Next Steps

1. Launch your first dashboard
2. Customize layout for your needs
3. Set up scheduled exports
4. Create alerts based on dashboard metrics
5. Share with team and stakeholders

For more on monitoring, see the [Monitoring Cookbook](monitoring.md).

For DevOps automation, see the [DevOps Setup Cookbook](devops-setup.md).
