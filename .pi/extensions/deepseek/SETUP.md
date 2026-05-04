# Quick Setup Guide

## ⚠️ SECURITY FIRST

**Your API key was exposed in the conversation. You MUST:**

1. Go to https://platform.deepseek.com
2. Revoke/delete the key: `sk-3242aa2eac2d...`
3. Create a NEW API key
4. Set it as an environment variable (see below)

## 1. Set Environment Variable

**Option A: Add to shell profile (recommended)**

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export DEEPSEEK_API_KEY="sk-YOUR-NEW-KEY-HERE"' >> ~/.zshrc

# Reload
source ~/.zshrc
```

**Option B: Add to .env file (project-specific)**

```bash
# Copy example
cp .env.example .env

# Edit .env and add your key
nano .env

# Add this line:
DEEPSEEK_API_KEY=sk-YOUR-NEW-KEY-HERE
```

**Option C: Temporary (current session)**

```bash
export DEEPSEEK_API_KEY="sk-YOUR-NEW-KEY-HERE"
pi
```

## 2. Verify Installation

```bash
pi
/model deepseek/deepseek-reasoner
# Should show: DeepSeek-R1 (Reasoning Mode)
```

## 3. Test the Agent

```bash
pi agent reasoning-researcher "What are the trade-offs between microservices and monolith architecture?"
```

## Usage Examples

### Complex Reasoning (DeepSeek)
```bash
pi agent reasoning-researcher "Should I use Redis or PostgreSQL for caching?"
```

### Current Info (Straico Perplexity)
```bash
pi agent researcher "What's the latest version of Next.js?"
```

### Deep Multi-Source Research (Straico Deep)
```bash
pi agent deep-researcher "Compare authentication methods for SaaS apps in 2026"
```

## Agent Roster (Updated)

| Agent | Model | Use For | Cost |
|-------|-------|---------|------|
| `researcher` | Straico Perplexity Sonar | Latest docs, current versions, quick lookups | ~1 coin |
| `deep-researcher` | Straico Perplexity Deep | Multi-source analysis, tech comparisons | ~192 coins |
| `reasoning-researcher` | DeepSeek-R1 | Architecture decisions, debugging strategies | ~$0.01-0.05 |

## When to Use Each

**Use `reasoning-researcher` (DeepSeek) when:**
- Analyzing architecture trade-offs
- Debugging complex issues
- Evaluating code design patterns
- Answering "why" questions
- Deep analysis of known topics

**Use `researcher` (Perplexity) when:**
- Checking latest library versions
- Finding current API documentation
- Looking up error messages
- Verifying recent changes

**Use `deep-researcher` (Perplexity Deep) when:**
- Comparing multiple technologies
- Planning migrations
- Security/compliance research
- Need 2+ perspectives with evidence

## Rate Limit Strategy

If Straico is rate-limited:
1. Use DeepSeek for reasoning tasks (no rate limits, pay-per-token)
2. Wait for Straico rate limit to reset
3. Batch your Perplexity queries

## Troubleshooting

### "DEEPSEEK_API_KEY not set"
```bash
echo $DEEPSEEK_API_KEY  # Should show your key
```

If empty:
```bash
export DEEPSEEK_API_KEY="sk-your-key"
```

### "Model not found"
Use the full model name with provider prefix:
- ✅ `deepseek/deepseek-reasoner`
- ❌ `deepseek-reasoner` (missing prefix)

### Still seeing rate limits?
DeepSeek has NO rate limits on pay-per-use. If you see errors:
- Check your DeepSeek account balance at https://platform.deepseek.com
- Verify API key is valid
- Check if you're hitting token limits (64K context)
