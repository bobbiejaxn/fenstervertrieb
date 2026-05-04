# DevOps Automation Setup Cookbook

This cookbook covers Type 2 AgentOps: using AI agents to automate DevOps tasks proactively.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Initial Configuration](#initial-configuration)
3. [CI/CD Monitoring](#cicd-monitoring)
4. [Log Monitoring](#log-monitoring)
5. [Auto-Fix Rules](#auto-fix-rules)
6. [Alert Configuration](#alert-configuration)
7. [Advanced Patterns](#advanced-patterns)

## Getting Started

### What is a DevOps Agent?

A DevOps agent is an autonomous AI agent that:
- Runs continuously in the background
- Monitors your infrastructure and services
- Detects issues automatically
- Attempts to fix known problems
- Alerts humans when manual intervention is needed

### Philosophy: Progressive Automation

Start conservative, automate incrementally:

1. **Monitor Only** (Week 1): Watch and learn patterns
2. **Alert on Issues** (Week 2): Notify team of problems
3. **Suggest Fixes** (Week 3): Recommend solutions
4. **Auto-Fix Safe Issues** (Week 4): Fix known-safe problems
5. **Expand Coverage** (Ongoing): Add more auto-fix rules

### Prerequisites

Before starting:

```bash
# Verify DevOps agent is available
/agentops devops check-requirements

# Install required integrations
/agentops devops setup-integrations

# Configure credentials
/agentops devops configure-credentials
```

## Initial Configuration

### First-Time Setup

Step-by-step initial setup:

```bash
# Step 1: Initialize DevOps agent
/agentops devops init

# Step 2: Configure monitoring targets
/agentops devops configure

# Step 3: Test configuration
/agentops devops test

# Step 4: Start in monitor-only mode
/agentops devops start --mode monitor-only
```

### Interactive Configuration

```bash
User: /agentops devops configure

Agent: DevOps Agent Configuration

What would you like to monitor?
  [x] CI/CD Pipelines
  [x] Application Logs
  [ ] Infrastructure Metrics
  [ ] Database Performance
  [ ] External APIs

Select integrations:

User: CI/CD Pipelines and Application Logs

Agent: CI/CD Pipeline Configuration

Which CI/CD platform?
  1. GitHub Actions
  2. GitLab CI
  3. CircleCI
  4. Jenkins
  5. Other

User: GitHub Actions

Agent: GitHub Configuration

Repository: [auto-detected: owner/pi_launchpad]
Workflows to monitor:
  [x] CI (test and build)
  [x] Deploy Production
  [x] Deploy Staging
  [ ] Nightly Tests

Check interval: [2m] ___
Alert on: [x] Failures  [x] Warnings  [ ] Slow builds

Configure auto-fix? [Monitor only for now]

User: Monitor only for now

Agent: Application Logs Configuration

Log aggregator:
  1. CloudWatch
  2. Datadog
  3. Sentry
  4. LogDNA
  5. Custom

User: Sentry

Agent: Sentry Integration

Project: [auto-detected: pi-launchpad]
Environment to monitor:
  [x] Production
  [x] Staging
  [ ] Development

Alert threshold:
  Error rate: [5%] ___
  Response time: [2s] ___

Check interval: [2m] ___

User: [Accept defaults]

Agent: Configuration Summary

Monitoring:
  ✓ GitHub Actions (pi_launchpad)
    - CI, Deploy Production, Deploy Staging
    - Check every 2 minutes
    - Alert on failures and warnings

  ✓ Sentry (pi-launchpad)
    - Production and Staging environments
    - Alert if error rate > 5% or response time > 2s
    - Check every 2 minutes

Mode: Monitor Only (no auto-fix)
Alerts: Console notifications

Save configuration? [yes]

User: yes

Agent: Configuration saved to ~/.config/pi/agentops-devops.json

Start DevOps agent: /agentops devops start
Test configuration: /agentops devops test
```

### Configuration File

Example configuration file structure:

```json
{
  "version": "1.0",
  "mode": "monitor-only",
  "check-interval": "2m",
  "integrations": {
    "github-actions": {
      "enabled": true,
      "repository": "owner/pi_launchpad",
      "workflows": ["ci", "deploy-production", "deploy-staging"],
      "alert-on": ["failures", "warnings"]
    },
    "sentry": {
      "enabled": true,
      "project": "pi-launchpad",
      "environments": ["production", "staging"],
      "thresholds": {
        "error-rate": 5,
        "response-time": 2000
      }
    }
  },
  "alerts": {
    "channels": ["console"],
    "severity-levels": ["high", "critical"]
  },
  "auto-fix": {
    "enabled": false,
    "rules": []
  }
}
```

## CI/CD Monitoring

### GitHub Actions Setup

Monitor GitHub Actions workflows:

```bash
# Add GitHub Actions monitoring
/agentops devops add-integration github-actions

# Configure workflows to watch
/agentops devops configure github-actions \
  --workflows ci,deploy-production,deploy-staging \
  --alert-on failures,warnings \
  --check-interval 2m
```

### Common CI/CD Issues to Monitor

1. **Build Failures**
   - Compilation errors
   - Test failures
   - Lint/format issues
   - Dependency resolution

2. **Deployment Failures**
   - Environment configuration
   - Permission issues
   - Resource constraints
   - Service availability

3. **Performance Issues**
   - Slow builds (>10m)
   - Timeout errors
   - Rate limiting
   - Cache misses

### Example: Build Failure Detection

```bash
[2026-03-17 08:23] DETECTED: Build failure in CI
  Pipeline: main → production
  Workflow: deploy-production
  Run: #1247
  Branch: main
  Commit: f25c25b (docs: add section explaining pi package prefixes)

  Error: "Module '@pi/core' not found"
  Exit code: 1

  Build logs:
    > npm run build
    Error: Cannot find module '@pi/core'
    Module resolution failed at src/index.ts:3:23

  Diagnosis: Dependency installation likely failed or cache is stale

  Confidence: High (seen 47 times, auto-fixed 42 times)

  Suggested Actions:
    1. Clear node_modules cache
    2. Re-run npm install
    3. Retry build

  Auto-fix: Not enabled (monitor-only mode)
  Alert: Sent to console
```

### GitLab CI / CircleCI / Jenkins

Similar setup for other CI platforms:

```bash
# GitLab
/agentops devops add-integration gitlab-ci \
  --project pi-launchpad \
  --pipelines ci,deploy

# CircleCI
/agentops devops add-integration circleci \
  --project pi_launchpad \
  --workflows build-and-test,deploy

# Jenkins
/agentops devops add-integration jenkins \
  --url https://jenkins.company.com \
  --jobs pi-launchpad-ci,pi-launchpad-deploy
```

## Log Monitoring

### Application Error Monitoring

Monitor application logs for errors:

```bash
# Add Sentry integration
/agentops devops add-integration sentry \
  --project pi-launchpad \
  --environments production,staging

# Configure error thresholds
/agentops devops configure sentry \
  --error-rate-threshold 5 \
  --response-time-threshold 2000
```

### Example: Error Rate Spike Detection

```bash
[2026-03-17 11:47] DETECTED: High error rate in production
  Service: API Gateway
  Environment: Production

  Current State:
    Error rate: 12.3% (threshold: 5%)
    Requests/min: 847
    Errors/min: 104

  Error Pattern:
    Top error: "Database connection timeout" (78 occurrences)
    Affected endpoint: POST /api/reports
    Started: 11:42 (5 minutes ago)

  Recent Errors:
    11:47:23 - DatabaseTimeoutError: Connection pool exhausted
    11:47:18 - DatabaseTimeoutError: Connection pool exhausted
    11:47:12 - DatabaseTimeoutError: Connection pool exhausted

  Diagnosis: Database connection pool exhaustion
  Root cause: Sudden traffic spike (3x normal load)

  Suggested Actions:
    1. Increase connection pool size
    2. Scale database connections
    3. Restart connection pool

  Impact:
    Affected users: ~850/min
    Business impact: High

  Auto-fix: Not enabled (monitor-only mode)
  Alert: Sent to console + Slack
```

### Log Aggregation Integrations

Support for various log platforms:

```bash
# CloudWatch
/agentops devops add-integration cloudwatch \
  --log-group /aws/lambda/pi-launchpad \
  --filter-pattern "ERROR"

# Datadog
/agentops devops add-integration datadog \
  --service pi-launchpad \
  --env production

# Custom logs
/agentops devops add-integration custom-logs \
  --path /var/log/app/*.log \
  --pattern "ERROR|WARN|FATAL"
```

### Structured Log Analysis

For structured logs (JSON):

```bash
/agentops devops configure logs \
  --format json \
  --error-fields level,message,stack \
  --alert-on level=error,level=fatal
```

## Auto-Fix Rules

### Enabling Auto-Fix

After monitoring for 1-2 weeks, enable auto-fix:

```bash
# Switch from monitor-only to auto-fix mode
/agentops devops configure --mode auto-fix

# Start with safe fixes only
/agentops devops configure --auto-fix-level conservative
```

### Auto-Fix Levels

Three levels of automation:

1. **Conservative**: Only fix known-safe issues
   - Clear caches
   - Restart services
   - Scale within limits
   - Retry failed operations

2. **Moderate**: Include low-risk fixes
   - Configuration adjustments
   - Resource allocation changes
   - Permission fixes
   - Dependency updates

3. **Aggressive**: All automated fixes
   - Database migrations
   - Code deployments
   - Infrastructure changes
   - Third-party integrations

### Creating Auto-Fix Rules

#### Rule 1: Build Cache Failures

```bash
/agentops devops add-rule

# Interactive rule creation
Name: clear-build-cache
Description: Clear build cache when module not found errors occur
Trigger: Build fails with "Module not found" or "Cannot find module"
Conditions:
  - Error message contains "Module" AND "not found"
  - Build failed (exit code 1)
  - Previous build succeeded (not persistent failure)
Actions:
  1. Clear npm cache
  2. Clear build cache
  3. Retry build
  4. If still fails: Alert team
Max retries: 2
Cooldown: 5m (prevent retry loops)
Alert: On success and on failure
Severity: Medium
```

Configuration:
```json
{
  "name": "clear-build-cache",
  "description": "Clear build cache for module resolution failures",
  "trigger": {
    "event": "build-failure",
    "conditions": [
      {"field": "error-message", "contains": ["Module", "not found"]},
      {"field": "exit-code", "equals": 1},
      {"field": "previous-build", "equals": "success"}
    ]
  },
  "actions": [
    {"type": "command", "run": "npm cache clean --force"},
    {"type": "api-call", "endpoint": "github-actions", "method": "clear-cache"},
    {"type": "retry", "workflow": "current", "wait": "30s"}
  ],
  "safeguards": {
    "max-retries": 2,
    "cooldown": "5m",
    "require-approval": false
  },
  "alerts": {
    "on-success": true,
    "on-failure": true,
    "severity": "medium"
  }
}
```

#### Rule 2: Database Connection Pool Exhaustion

```bash
/agentops devops add-rule

Name: scale-db-connections
Description: Increase DB connection pool when exhausted
Trigger: Error rate > 5% AND errors contain "connection timeout"
Conditions:
  - Error rate > threshold for 2 minutes
  - Error message contains "connection" AND "timeout"
  - Connection pool metrics show >90% utilization
Actions:
  1. Check current pool size
  2. Increase pool size by 50% (max: 50 connections)
  3. Monitor for 5 minutes
  4. If error rate drops: Success
  5. If error rate persists: Alert DBA team
Max pool size: 50
Rollback: Decrease pool if idle >80% for 10m
Alert: Always
Severity: High
```

#### Rule 3: Deployment Memory Errors

```bash
/agentops devops add-rule

Name: optimize-build-memory
Description: Fix build memory limit exceeded errors
Trigger: Deployment fails with memory limit error
Conditions:
  - Build/deploy fails
  - Error contains "memory limit" OR "out of memory"
  - Platform: Vercel or Netlify
Actions:
  1. Enable memory optimization flags
  2. Adjust build concurrency
  3. Update platform config
  4. Retry deployment
Safeguards:
  - Only apply once per deployment
  - Revert if build time increases >50%
Alert: On changes
Severity: Medium
```

### Testing Auto-Fix Rules

Before enabling in production:

```bash
# Test rule in dry-run mode
/agentops devops test-rule clear-build-cache --dry-run

# Simulate specific scenario
/agentops devops test-rule clear-build-cache \
  --simulate "Module '@pi/core' not found"

# Review what would happen
/agentops devops test-rule clear-build-cache --explain
```

**Output**:
```
Testing Rule: clear-build-cache

Simulated Scenario:
  Event: Build failure
  Error: "Module '@pi/core' not found"
  Exit code: 1
  Previous build: Success

Rule Evaluation:
  ✓ Trigger matched
  ✓ All conditions satisfied
  ✓ No safeguard violations

Actions that would execute:
  1. Command: npm cache clean --force
     Effect: Clears npm cache (~50MB)
     Risk: Low (safe operation)

  2. API Call: Clear GitHub Actions cache
     Effect: Removes workflow cache
     Risk: Low (next build will recreate)

  3. Retry: Re-run current workflow
     Effect: Triggers new build
     Risk: Low (standard retry)

Expected Outcome:
  Success probability: 89% (based on 42 similar cases)
  Estimated time: 3-5 minutes
  Cost: ~$0.02 (rebuild)

Safeguards Active:
  ✓ Max retries: 2
  ✓ Cooldown: 5 minutes
  ✓ Alert on completion

Recommendation: Safe to enable
```

### Monitoring Auto-Fix Effectiveness

Track how well auto-fixes work:

```bash
# View auto-fix success rate
/agentops devops stats --metric auto-fix-success

# Analyze failed auto-fixes
/agentops devops logs --filter failed-fixes --last 7d

# Compare manual vs auto resolution
/agentops devops compare manual auto-fix --metric resolution-time
```

## Alert Configuration

### Alert Channels

Configure where alerts are sent:

```bash
# Console output (default)
/agentops devops alerts add-channel console

# Slack
/agentops devops alerts add-channel slack \
  --webhook-url $SLACK_WEBHOOK \
  --channel #devops-alerts

# Email
/agentops devops alerts add-channel email \
  --recipients devops@company.com,oncall@company.com

# PagerDuty
/agentops devops alerts add-channel pagerduty \
  --integration-key $PAGERDUTY_KEY

# Custom webhook
/agentops devops alerts add-channel webhook \
  --url https://api.company.com/alerts \
  --auth-header "Bearer $API_TOKEN"
```

### Alert Severity Levels

Define what gets alerted at each level:

```bash
/agentops devops alerts configure-severity

# Critical: Wake on-call engineer
Severity: Critical
Trigger:
  - Production outage
  - Data loss risk
  - Security breach
Channels: PagerDuty, Slack, Email
Throttle: None (always alert)

# High: Notify team immediately
Severity: High
Trigger:
  - Service degradation
  - Repeated auto-fix failures
  - Error rate spike
Channels: Slack, Email
Throttle: 5 minutes

# Medium: Team notification
Severity: Medium
Trigger:
  - Single service issue
  - Deployment warning
  - Performance degradation
Channels: Slack
Throttle: 15 minutes

# Low: Log only
Severity: Low
Trigger:
  - Info messages
  - Successful auto-fixes
  - Routine maintenance
Channels: Console
Throttle: 1 hour
```

### Alert Templates

Customize alert messages:

```bash
/agentops devops alerts configure-template

Template: Build Failure Alert

Subject: 🔴 Build Failed: {{workflow}} on {{branch}}

Body:
Repository: {{repository}}
Workflow: {{workflow}}
Branch: {{branch}}
Commit: {{commit-sha}} ({{commit-message}})
Triggered by: {{author}}

Error: {{error-message}}

Build logs: {{logs-url}}
Workflow run: {{run-url}}

Auto-fix: {{auto-fix-status}}
{{#if auto-fix-attempted}}
  Actions taken:
  {{#each auto-fix-actions}}
    - {{this}}
  {{/each}}

  Result: {{auto-fix-result}}
{{/if}}

---
Reply with /agentops devops manual-fix {{run-id}} for manual intervention
```

### Smart Alerting

Reduce alert noise with smart features:

```bash
# Alert grouping
/agentops devops alerts configure-grouping \
  --group-by error-type \
  --window 15m \
  --max-alerts 1

# Alert suppression during maintenance
/agentops devops alerts suppress \
  --reason "Database migration in progress" \
  --duration 30m

# Alert escalation
/agentops devops alerts configure-escalation \
  --level-1 slack --wait 5m \
  --level-2 email --wait 10m \
  --level-3 pagerduty
```

## Advanced Patterns

### Pattern 1: Progressive Deployment Monitoring

Monitor staged rollouts and auto-rollback on issues:

```bash
/agentops devops add-rule

Name: progressive-deployment-monitor
Description: Monitor staged deployments and rollback on errors
Trigger: Deployment started
Actions:
  1. Monitor error rate in canary (5% traffic)
  2. If error rate > 2x baseline: Rollback
  3. If stable for 10m: Promote to 25%
  4. If stable for 10m: Promote to 50%
  5. If stable for 10m: Promote to 100%
  6. Alert on completion or rollback
```

### Pattern 2: Predictive Scaling

Scale before issues occur:

```bash
/agentops devops add-rule

Name: predictive-scaling
Description: Scale proactively based on traffic patterns
Trigger: Traffic analysis
Conditions:
  - Historical pattern: Traffic increases at 9am
  - Current time: 8:45am
  - Current capacity: <70%
Actions:
  1. Pre-scale services to 150% capacity
  2. Monitor traffic
  3. Scale down after peak (if utilization <30%)
```

### Pattern 3: Dependency Health Monitoring

Monitor external dependencies:

```bash
/agentops devops add-integration external-apis

Name: monitor-external-apis
APIs to monitor:
  - https://api.stripe.com/healthcheck
  - https://api.openai.com/status
  - https://api.github.com/status

Check interval: 5m
Actions on failure:
  1. Alert team
  2. Enable fallback mode
  3. Cache responses
  4. Notify users of degraded service
```

### Pattern 4: Cost Optimization

Automatically optimize costs:

```bash
/agentops devops add-rule

Name: auto-scale-down
Description: Scale down idle services to save costs
Trigger: Service metrics
Conditions:
  - CPU < 10% for 30 minutes
  - Requests < 10/min
  - Time: Outside business hours (9pm-6am)
Actions:
  1. Scale down to minimum instances
  2. Alert team
  3. Re-enable auto-scaling
```

### Pattern 5: Security Auto-Response

Respond to security events:

```bash
/agentops devops add-rule

Name: security-auto-response
Description: Respond to security alerts
Trigger: Security alert from scanner
Severity: Critical
Actions:
  1. Identify affected service
  2. Isolate service (remove from load balancer)
  3. Create security incident ticket
  4. Alert security team
  5. Preserve logs for forensics
  6. Wait for manual remediation
```

## Gradual Rollout Strategy

### Week 1: Monitor Only

```bash
/agentops devops start --mode monitor-only

# Review logs daily
/agentops devops logs --last 24h

# Identify patterns
/agentops devops patterns --period 7d
```

### Week 2: Alert on Issues

```bash
/agentops devops configure --enable-alerts

# Configure alert channels
/agentops devops alerts add-channel slack

# Tune alert thresholds
/agentops devops alerts configure-severity
```

### Week 3: Suggest Fixes

```bash
/agentops devops configure --mode suggest-fixes

# Review suggestions
/agentops devops logs --filter suggestions

# Evaluate suggestion quality
/agentops devops stats --metric suggestion-quality
```

### Week 4: Enable Auto-Fix (Conservative)

```bash
/agentops devops configure --mode auto-fix --level conservative

# Enable safest fixes first
/agentops devops enable-rule clear-build-cache
/agentops devops enable-rule restart-service

# Monitor success rate
/agentops devops stats --metric auto-fix-success
```

### Week 5+: Expand Coverage

```bash
# Add more auto-fix rules
/agentops devops enable-rule scale-db-connections
/agentops devops enable-rule optimize-build-memory

# Increase automation level
/agentops devops configure --auto-fix-level moderate

# Monitor and iterate
/agentops devops report weekly
```

## Best Practices

### 1. Start Conservative
- Begin with monitor-only mode
- Enable auto-fix gradually
- Test rules thoroughly before enabling

### 2. Maintain Override Controls
- Always allow manual intervention
- Provide easy disable switches
- Document emergency procedures

### 3. Set Appropriate Safeguards
- Max retry limits
- Cooldown periods
- Rollback conditions
- Approval requirements for risky actions

### 4. Monitor the Monitor
- Track DevOps agent health
- Alert on agent failures
- Review auto-fix effectiveness

### 5. Document Everything
- Rule rationale
- Configuration changes
- Incident resolutions
- Lessons learned

### 6. Regular Reviews
- Weekly: Auto-fix success rate
- Monthly: Rule effectiveness
- Quarterly: Coverage gaps

## Troubleshooting

### DevOps Agent Not Starting

```bash
# Check requirements
/agentops devops check-requirements

# Verify configuration
/agentops devops validate-config

# Check logs
/agentops devops logs --level error

# Test integrations
/agentops devops test-integrations
```

### Auto-Fix Not Working

```bash
# Check if auto-fix is enabled
/agentops devops status --verbose

# Test specific rule
/agentops devops test-rule [rule-name]

# Review failed attempts
/agentops devops logs --filter failed-fixes

# Verify credentials
/agentops devops test-credentials
```

### Too Many False Alerts

```bash
# Increase alert thresholds
/agentops devops alerts adjust-threshold [alert] --increase

# Enable alert grouping
/agentops devops alerts configure-grouping

# Add noise filters
/agentops devops alerts add-filter \
  --exclude-pattern "known-noise"
```

## Next Steps

1. Complete initial setup
2. Run in monitor-only mode for 1-2 weeks
3. Review patterns and create first auto-fix rule
4. Test auto-fix rule thoroughly
5. Enable conservative auto-fix
6. Monitor effectiveness and iterate

For monitoring DevOps agent performance, see the [Monitoring Cookbook](monitoring.md).

For using the dashboard, see the [Dashboard Cookbook](dashboard.md).
