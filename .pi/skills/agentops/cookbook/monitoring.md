# Agent Performance Monitoring Cookbook

This cookbook covers Type 1 AgentOps: monitoring and improving AI agent performance.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Basic Monitoring](#basic-monitoring)
3. [Advanced Analytics](#advanced-analytics)
4. [A/B Testing](#ab-testing)
5. [Performance Optimization](#performance-optimization)
6. [Reporting](#reporting)

## Getting Started

### Initial Setup

Before monitoring, ensure your agents are instrumented:

```bash
# Check if monitoring is enabled
/agentops status

# Enable monitoring if needed
/agentops setup --enable-tracking

# Verify data collection
/agentops stats --last 1h
```

### Understanding the Metrics

Key metrics tracked for each agent:

- **Success Rate**: % of tasks completed successfully
- **Completion Time**: Average time from task start to completion
- **Token Usage**: Tokens consumed per task
- **Token Efficiency**: Compared to baseline (100% = baseline)
- **Cost per Task**: Estimated cost based on token usage
- **Failure Modes**: Categories of failures (timeout, error, invalid output)

## Basic Monitoring

### Daily Health Check

Start each day with a quick health check:

```bash
# Yesterday's performance
/agentops stats --last 24h

# Current active tasks
/agentops dashboard --snapshot

# Recent failures
/agentops failures --last 24h --limit 5
```

**What to look for**:
- Success rate below 90% (investigate)
- Completion time increasing (performance degradation)
- New failure modes (unexpected errors)

### Weekly Performance Review

Every Monday, review the past week:

```bash
# Full week stats
/agentops stats --last 7d --detailed

# Pattern analysis
/agentops patterns --period 7d

# Generate weekly report
/agentops report --period weekly --format markdown
```

**Action items**:
- Identify agents with declining performance
- Review new failure patterns
- Schedule optimization work for low performers

### Monthly Trend Analysis

Monthly deep dive:

```bash
# Month-over-month comparison
/agentops stats --period 30d --compare-to previous

# Long-term trends
/agentops trends --period 90d

# Cost analysis
/agentops costs --breakdown by-agent --period 30d
```

**Deliverables**:
- Monthly performance report for stakeholders
- Optimization roadmap for next month
- Budget forecast based on usage trends

## Advanced Analytics

### Failure Analysis

Deep dive into why agents fail:

```bash
# Get all failures for specific agent
/agentops analyze researcher --failures-only --last 7d

# Group failures by category
/agentops failures --group-by error-type --last 30d

# Find failure patterns
/agentops patterns --filter failures --min-occurrences 5
```

**Example output**:
```
Failure Analysis: researcher agent (Last 7 days)

Total Failures: 23 (4.2% of 547 tasks)

By Category:
  Timeout (12 failures, 52%)
    - Context too large (7 occurrences)
    - API rate limit (3 occurrences)
    - Slow external API (2 occurrences)

  Invalid Output (8 failures, 35%)
    - Schema validation failed (8 occurrences)
    - Pattern: Complex nested structures

  Error (3 failures, 13%)
    - Network timeout (2 occurrences)
    - Parse error (1 occurrence)

Recommendations:
  1. Increase timeout for large context tasks
  2. Add retry logic for rate limits
  3. Improve schema validation in prompts
```

### Performance Regression Detection

Automatically detect when performance degrades:

```bash
# Compare current week to baseline
/agentops regression-check --baseline 4-weeks-ago

# Set up alerts for regressions
/agentops alerts configure \
  --metric success-rate \
  --threshold 90 \
  --comparison below \
  --notify slack
```

**Example alert**:
```
⚠️ Performance Regression Detected

Agent: code-reviewer
Metric: Success Rate
Current: 87.3% (last 7d)
Baseline: 94.1% (4 weeks ago)
Change: -6.8% (statistically significant)

Recent Failures:
  - Schema validation errors (12 new failures)
  - Context overflow (5 new failures)

Recommended Actions:
  1. Review recent prompt changes
  2. Check for API changes
  3. Analyze failing task patterns
```

### Token Usage Optimization

Optimize costs without sacrificing quality:

```bash
# Find expensive agents
/agentops costs --sort-by total-desc

# Analyze token usage patterns
/agentops tokens analyze researcher

# Compare token efficiency
/agentops tokens compare researcher-v1 researcher-v2
```

**Example analysis**:
```
Token Usage Analysis: researcher agent

Average tokens per task: 15,234
Baseline: 12,400 (you're using 23% more)

Breakdown:
  Input tokens: 8,120 (53%)
    - Context: 6,200 (too large?)
    - Prompt: 1,920

  Output tokens: 7,114 (47%)
    - Main response: 6,800
    - JSON formatting: 314

Optimization Opportunities:
  1. Reduce context size (-25% tokens)
     - Use focused context instead of full files
     - Estimated savings: $0.006/task

  2. Use structured output (-5% tokens)
     - Replace JSON in text with native structured output
     - Estimated savings: $0.001/task

  3. Implement caching (-40% input tokens on repeated context)
     - Cache common context patterns
     - Estimated savings: $0.008/task

Total potential savings: 45% ($0.015 → $0.008 per task)
```

### Success Pattern Identification

Find what makes agents succeed:

```bash
# Analyze successful tasks
/agentops analyze researcher --success-only --limit 100

# Find common patterns in successes
/agentops patterns --filter success --min-correlation 0.7

# Compare success vs failure patterns
/agentops patterns compare success failure
```

**Example insights**:
```
Success Pattern Analysis: researcher agent

High Success Factors:
  1. Structured prompts (97% success vs 89% unstructured)
  2. Clear exit criteria (96% success vs 84% ambiguous)
  3. Iterative refinement enabled (98% success vs 91% single-pass)
  4. Context < 50K tokens (95% success vs 78% larger context)

Low Success Factors:
  1. Open-ended prompts (78% success)
  2. Missing examples (82% success)
  3. Complex nested schemas (81% success)

Recommendations:
  1. Always use structured prompt templates
  2. Require explicit exit criteria in tasks
  3. Enable iterative refinement by default
  4. Limit context to most relevant files
```

## A/B Testing

### Testing Prompt Changes

Compare different prompt templates:

```bash
# Start A/B test
/agentops test start \
  --name "research-prompt-optimization" \
  --variant-a prompt-v1 \
  --variant-b prompt-v2 \
  --metric accuracy \
  --duration 7d \
  --traffic-split 50/50

# Check progress
/agentops test status research-prompt-optimization

# Get results
/agentops test results research-prompt-optimization
```

**Example results**:
```
A/B Test Results: research-prompt-optimization

Duration: 7 days (complete)
Sample Size: 147 tasks per variant

Variant A (prompt-v1):
  Success Rate: 92.5%
  Avg Tokens: 12,400
  Avg Time: 18.7s
  Cost per Task: $0.024
  User Satisfaction: 4.2/5

Variant B (prompt-v2):
  Success Rate: 96.8% (+4.3% ✓)
  Avg Tokens: 15,200 (+22.6%)
  Avg Time: 21.3s (+13.9%)
  Cost per Task: $0.031 (+29.2%)
  User Satisfaction: 4.7/5 (+0.5 ✓)

Statistical Significance: p = 0.003 (significant)

Winner: Variant B (prompt-v2)

Reasoning:
  - 4.3% improvement in success rate is significant
  - User satisfaction increased meaningfully
  - Cost increase acceptable for quality gain
  - Deploy to 100% of traffic

Key Differences in Variant B:
  1. Added iterative refinement step
  2. Included 3 concrete examples
  3. Stricter output validation
  4. Enhanced error handling
```

### Testing Agent Configurations

Compare system-level changes:

```bash
# Test different model versions
/agentops test start \
  --name "model-comparison" \
  --variant-a claude-opus-4-6 \
  --variant-b claude-sonnet-4-5 \
  --metric cost-effectiveness \
  --duration 14d

# Test workflow changes
/agentops test start \
  --name "workflow-test" \
  --variant-a direct-implementation \
  --variant-b tdd-workflow \
  --metric success-rate \
  --duration 7d
```

### Multi-Armed Bandit Testing

Automatically allocate traffic to best-performing variants:

```bash
# Start bandit test (auto-optimizes traffic)
/agentops test bandit \
  --name "prompt-optimization" \
  --variants prompt-v1,prompt-v2,prompt-v3 \
  --metric success-rate \
  --exploration-rate 0.1 \
  --duration 14d

# Bandit will automatically shift traffic to winners
```

## Performance Optimization

### Optimization Workflow

Standard process for improving agent performance:

```
1. Baseline Measurement
   ↓
2. Identify Problem Areas
   ↓
3. Hypothesis Formation
   ↓
4. A/B Test Solution
   ↓
5. Deploy Winner
   ↓
6. Monitor Impact
```

### Example: Optimizing Response Time

```bash
# Step 1: Baseline
/agentops stats researcher --metric avg-time
# Result: 24.3s average

# Step 2: Identify bottlenecks
/agentops analyze researcher --breakdown by-phase
```

**Output**:
```
Time Breakdown: researcher agent

Phase Analysis:
  Context Loading: 3.2s (13%)
  Prompt Construction: 1.1s (5%)
  LLM Call: 18.7s (77%)  ← Bottleneck
  Response Parsing: 1.3s (5%)

LLM Call Analysis:
  Input tokens: 15,400
  Output tokens: 8,200
  Time per 1K tokens: 0.89s
  Expected time: 21.1s
  Actual time: 18.7s (within normal range)

Optimization Opportunities:
  1. Reduce input tokens → Faster LLM call
  2. Use streaming → Perceived faster response
  3. Implement caching → Skip LLM call when possible
```

```bash
# Step 3: Hypothesis
# "Reducing input tokens by 30% will decrease response time by ~6s"

# Step 4: Test solution
/agentops test start \
  --name "token-reduction" \
  --variant-a current-config \
  --variant-b reduced-context \
  --metric avg-time \
  --duration 7d

# Step 5: Review results
/agentops test results token-reduction
```

**Results**:
```
Winner: reduced-context
  Avg time: 18.1s (25% faster ✓)
  Success rate: 94.2% (maintained)
  Cost: $0.019 (21% cheaper ✓)
```

```bash
# Step 6: Deploy and monitor
/agentops deploy researcher --config reduced-context

# Monitor for regressions
/agentops monitor researcher --watch success-rate --alert-if below 93
```

### Optimization Checklist

Use this checklist for any optimization effort:

- [ ] Baseline metrics captured
- [ ] Problem area identified with data
- [ ] Clear hypothesis formed
- [ ] A/B test configured
- [ ] Statistical significance achieved
- [ ] Winner deployed
- [ ] Monitoring configured
- [ ] Results documented

## Reporting

### Daily Standup Report

Quick summary for daily team sync:

```bash
/agentops report daily --format slack
```

**Output**:
```
🤖 Agent Ops Daily Report - 2026-03-17

✅ Overall Health: Good
  Success Rate: 94.2% (target: 90%)
  Avg Response: 14.3s (within SLA)
  Active Agents: 5

📊 Yesterday's Activity:
  Total Tasks: 1,247
  Successful: 1,175
  Failed: 72 (5.8%)

⚠️ Attention Needed:
  • code-reviewer: Success rate 87% (below target)
    Action: Investigating schema validation errors

🎯 Active Optimizations:
  • researcher: A/B testing prompt-v3 (day 4/7)
  • tdd-guide: Token reduction experiment

💰 Costs:
  Yesterday: $142.30
  MTD: $3,241.15 (67% of budget)
```

### Weekly Executive Summary

High-level summary for leadership:

```bash
/agentops report weekly --format pdf --include-trends
```

**Contents**:
1. Executive Summary
   - Key metrics vs targets
   - Week-over-week trends
   - Critical issues

2. Performance Highlights
   - Best performing agents
   - Major improvements
   - Success stories

3. Areas of Concern
   - Underperforming agents
   - Recurring failures
   - Cost overruns

4. Optimization Initiatives
   - Active A/B tests
   - Completed improvements
   - Planned optimizations

5. Cost Analysis
   - Weekly spend
   - Cost per agent
   - Budget forecast

### Monthly Business Review

Comprehensive monthly report:

```bash
/agentops report monthly \
  --format presentation \
  --include-roi \
  --compare-to previous \
  --export /reports/agentops-march-2026.pdf
```

**Sections**:
1. Executive Summary
2. KPI Dashboard
3. Month-over-Month Trends
4. Agent Performance Deep Dive
5. Cost Analysis and ROI
6. Optimization Impact
7. Roadmap for Next Month
8. Appendix: Detailed Metrics

### Custom Reports

Build custom reports for specific needs:

```bash
# Cost report by team
/agentops report custom \
  --metric cost \
  --group-by team \
  --period 30d \
  --format csv

# Success rate by task type
/agentops report custom \
  --metric success-rate \
  --group-by task-type \
  --period 90d \
  --format chart

# Token efficiency over time
/agentops report custom \
  --metric token-efficiency \
  --group-by week \
  --period 180d \
  --format time-series
```

## Best Practices

### 1. Set Clear Baselines
Establish what "good" looks like before optimizing:
```bash
/agentops baseline set researcher --success-rate 93 --avg-time 20
```

### 2. Monitor Continuously
Don't just monitor during problems:
```bash
# Set up always-on dashboard
/agentops dashboard --persistent --refresh 5m
```

### 3. Act on Data
Use insights to drive improvements:
```bash
# Weekly optimization routine
/agentops analyze --find-opportunities
/agentops test start --based-on recommendations
```

### 4. Document Everything
Keep a log of changes and their impact:
```bash
# Add notes to experiments
/agentops test note "Changed prompt to include examples" \
  --test research-optimization
```

### 5. Share Results
Keep team informed:
```bash
# Auto-send weekly reports
/agentops report weekly --auto-send --channel #agent-ops
```

## Troubleshooting

### Low Success Rates

**Symptom**: Success rate below 85%

**Diagnosis**:
```bash
/agentops analyze [agent] --failures-only --group-by error-type
```

**Common causes**:
1. Invalid schema → Update schema validation
2. Timeout issues → Increase timeout or reduce context
3. API errors → Check API status and rate limits

### High Token Usage

**Symptom**: Token usage increasing over time

**Diagnosis**:
```bash
/agentops tokens analyze [agent] --trend 30d
```

**Common causes**:
1. Context bloat → Implement focused context
2. Inefficient prompts → Optimize prompt templates
3. Missing caching → Enable prompt caching

### Inconsistent Performance

**Symptom**: High variance in completion time or success rate

**Diagnosis**:
```bash
/agentops analyze [agent] --variance-analysis
```

**Common causes**:
1. Input size variance → Normalize input handling
2. External API issues → Add retry logic
3. Prompt ambiguity → Add structure and examples

## Advanced Techniques

### Cohort Analysis

Track performance by user cohort:

```bash
/agentops analyze --cohort-by user-segment
```

### Funnel Analysis

Understand where tasks fail in multi-step workflows:

```bash
/agentops funnel analyze \
  --steps research,analysis,report \
  --agent researcher
```

### Correlation Analysis

Find what factors correlate with success:

```bash
/agentops correlate success-rate \
  --with context-size,prompt-length,time-of-day
```

## Next Steps

1. Start with daily health checks
2. Set up weekly performance reviews
3. Identify your first optimization opportunity
4. Run your first A/B test
5. Automate reporting

For proactive automation, see the [DevOps Setup Cookbook](devops-setup.md).
