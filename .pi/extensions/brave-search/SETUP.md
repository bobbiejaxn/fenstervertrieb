# Brave Search Integration Setup

Privacy-focused web search integrated with DeepSeek for deep reasoning research.

## ⚠️ Security First

**Your API key was exposed:** `BSA-WRcYHm3hUgeFEGEWiZiaMYBqqNc`

**You MUST:**
1. Go to https://brave.com/search/api/
2. Revoke/delete that key
3. Create a NEW API key
4. Set it as environment variable (see below)

## 1. Set Environment Variable

**Option A: Shell profile (recommended)**

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export BRAVE_API_KEY="YOUR-NEW-KEY-HERE"' >> ~/.zshrc

# Reload
source ~/.zshrc
```

**Option B: Project .env file**

```bash
# Copy example and edit
cp .env.example .env
nano .env

# Add:
BRAVE_API_KEY=YOUR-NEW-KEY-HERE
```

**Verify:**

```bash
echo $BRAVE_API_KEY  # Should show your key
```

## 2. Test the Integration

**Option A: Via pi tool (extension)**

The `web_search` tool is registered by the `.pi/extensions/brave-search/` extension
and is available in any pi session.

**Option B: Via agent**

```bash
pi agent web-researcher "What's the latest version of React?"
```

## 3. Usage Examples

### Quick Version Check

```bash
pi agent web-researcher "Latest TypeScript version"
```

### Technology Comparison

```bash
pi agent web-researcher "Compare Next.js 15 vs Remix in 2026"
```

### Recent Documentation

```bash
pi agent web-researcher "Tailwind CSS 4.0 new features"
```

### Error Message Lookup

```bash
pi agent web-researcher "What does npm error ERESOLVE mean"
```

## Brave Search Features

The `web_search` tool supports these parameters:

- `query` (required) — Search query string
- `count` — Number of results (1-20, default 10)
- `freshness` — Filter by age: `pd` (past day), `pw` (past week), `pm` (past month), `py` (past year)
- `country` — Country code, e.g. `us`, `gb`, `ca`

## Brave Search Pricing

Check current pricing at: https://brave.com/search/api/

**Typical rates:**
- Free tier: 2,000 queries/month
- Paid tier: ~$0.50-5.00 per 1,000 queries (varies by plan)
- No rate limits on paid plans

**Much cheaper than:**
- SerpApi: $50/mo for 5,000 queries
- Google Custom Search: $5/1,000 queries after free tier

## Agent Comparison (Updated)

| Agent | Model | Web Search | Rate Limits | Best For |
|-------|-------|------------|-------------|----------|
| **web-researcher** ⭐ | DeepSeek-R1 | ✅ Brave | ❌ None | Current info + deep reasoning |
| researcher | Straico Perplexity | ✅ Perplexity | ✅ Yes | Quick lookups (rate limited) |
| deep-researcher | Straico Perplexity Deep | ✅ Perplexity | ✅ Yes | Multi-source (expensive, rate limited) |
| reasoning-researcher | DeepSeek-R1 | ❌ No | ❌ None | Analysis without current data |

## When to Use web-researcher

**Perfect for:**
- ✅ Latest library versions and docs
- ✅ Current technology trends
- ✅ Recent framework changes
- ✅ Error message lookups with analysis
- ✅ Technology comparisons with reasoning
- ✅ Best practices as of 2026

**Advantages:**
- No rate limits (pay per query)
- Deep reasoning analysis (DeepSeek-R1)
- Privacy-focused (Brave Search)
- Cost-effective (~$0.01-0.10 per query)

## Troubleshooting

### "BRAVE_API_KEY not set"

```bash
# Check if set
echo $BRAVE_API_KEY

# If empty, set it
export BRAVE_API_KEY="your-key"
```

### "Error 401 Unauthorized"

Your API key is invalid or revoked. Create a new one at https://brave.com/search/api/

### "Error 429 Too Many Requests"

You've hit your plan's limit. Check usage at: https://brave.com/search/api/

### Agent not searching web

The agent should automatically search when given queries about current information. If it doesn't:

1. Verify `BRAVE_API_KEY` is set
2. Check the agent has `bash` in its tools list
3. Try asking explicitly: "Search the web for X"

## Privacy Benefits

Brave Search:
- ✅ No user tracking
- ✅ No profiling
- ✅ Independent index (not Google/Bing)
- ✅ Anonymous by default
- ✅ No cross-site tracking

Better than:
- ❌ Google (tracks everything)
- ❌ Bing (tracks searches)
- ⚠️ SerpApi (uses Google/Bing results)

## Testing the Extension

```bash
# Via agent (recommended)
pi agent web-researcher "What's new in Tailwind CSS?"
```

The `web_search` tool is auto-discovered from `.pi/extensions/brave-search/index.ts`
and registered on pi startup.

## Cost Comparison

Per 100 queries:

| Service | Cost | Notes |
|---------|------|-------|
| Brave Search | $0.05-0.50 | Privacy-focused, independent |
| Google Custom Search | $0.50 | After free tier |
| SerpApi | $1.00 | Uses Google/Bing |
| Straico Perplexity | ~100 coins | Rate limits apply |

**web-researcher total cost:**
- Brave Search: $0.05-0.50 per 100 queries
- DeepSeek-R1: $0.01-0.05 per query
- **Total: ~$0.10-0.55 per query**

Still cheaper than Perplexity Deep Research (192 coins) and no rate limits!
