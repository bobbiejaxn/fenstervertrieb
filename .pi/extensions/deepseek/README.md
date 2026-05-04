# DeepSeek Provider Extension

OpenAI-compatible API provider for DeepSeek models, specializing in deep reasoning tasks.

## Features

- **DeepSeek-R1 (deepseek-reasoner)**: Best for complex reasoning, architecture decisions, debugging strategies
- **DeepSeek Chat (deepseek-chat)**: General purpose chat, faster responses
- True SSE streaming support
- Prompt caching support
- OpenAI-compatible API

## Important Note

**Knowledge Cutoff:** DeepSeek models have a knowledge cutoff of **July 2024**. They cannot access real-time web data.

For current information (latest library versions, recent docs, etc.), use:
- `researcher` agent (Straico Perplexity Sonar) - has web search
- `deep-researcher` agent (Straico Perplexity Deep Research) - deep web research

DeepSeek excels at:
- Complex reasoning on known topics
- Architecture decisions and trade-off analysis
- Debugging strategies
- Code design patterns
- Algorithm analysis

## Setup

### 1. Get API Key

1. Sign up at https://platform.deepseek.com
2. Create an API key
3. **Rotate the key** if you accidentally exposed it (like sharing in a chat)

### 2. Set Environment Variable

**NEVER commit API keys to git!** Store them in environment variables only.

**macOS/Linux (bash/zsh):**

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export DEEPSEEK_API_KEY="sk-your-actual-key-here"
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc
```

**Temporary (current session only):**

```bash
export DEEPSEEK_API_KEY="sk-your-actual-key-here"
pi
```

**Project-specific (.env file):**

If using direnv or similar:

```bash
# .envrc (add to .gitignore!)
export DEEPSEEK_API_KEY="sk-your-actual-key-here"
```

### 3. Verify Installation

```bash
pi
/model deepseek/deepseek-reasoner
# Should show: DeepSeek-R1 (Reasoning Mode)
```

## Usage

### In Pi CLI

```bash
pi
/model deepseek/deepseek-reasoner
# Ask complex reasoning questions
```

### In Agents

Use the `reasoning-researcher` agent:

```bash
pi agent reasoning-researcher "Should I use microservices or monolith for X?"
```

Or specify model directly in agent config:

```yaml
---
name: my-agent
model: deepseek/deepseek-reasoner
---
```

## Available Models

| Model ID | Name | Best For | Context | Max Output |
|----------|------|----------|---------|------------|
| `deepseek-reasoner` | DeepSeek-R1 | Complex reasoning, analysis | 64K | 8K |
| `deepseek-chat` | DeepSeek Chat | General chat, quick responses | 64K | 8K |

## Pricing

| Model | Input | Output | Cache Read | Cache Write |
|-------|-------|--------|------------|-------------|
| deepseek-reasoner | $0.14/1M | $2.19/1M | $0.014/1M | $0.28/1M |
| deepseek-chat | $0.14/1M | $0.28/1M | $0.014/1M | $0.28/1M |

Much cheaper than GPT-4 or Claude Opus!

## Troubleshooting

### "DEEPSEEK_API_KEY environment variable not set"

```bash
# Verify it's set
echo $DEEPSEEK_API_KEY

# If empty, set it:
export DEEPSEEK_API_KEY="sk-your-key"
```

### "DeepSeek API error 401"

Your API key is invalid or expired. Get a new one from https://platform.deepseek.com

### "Model not found"

Make sure you're using the correct model ID:
- ✅ `deepseek/deepseek-reasoner`
- ✅ `deepseek/deepseek-chat`
- ❌ `deepseek-reasoner` (missing provider prefix)

## Security Best Practices

1. ✅ Store API keys in environment variables
2. ✅ Add `.env` files to `.gitignore`
3. ✅ Rotate keys immediately if exposed
4. ✅ Use separate keys for dev/prod
5. ❌ NEVER commit keys to git
6. ❌ NEVER hardcode keys in code files
7. ❌ NEVER share keys in chat/email

## Comparison: DeepSeek vs Straico Perplexity

| Feature | DeepSeek-R1 | Straico Perplexity Sonar |
|---------|-------------|--------------------------|
| Web search | ❌ No | ✅ Yes |
| Real-time data | ❌ No (July 2024 cutoff) | ✅ Yes |
| Deep reasoning | ✅ Excellent | ⚠️ Limited |
| Complex analysis | ✅ Best | ⚠️ Good |
| Latest docs/versions | ❌ No | ✅ Yes |
| Cost (per query) | ~$0.01-0.05 | ~1-192 coins |
| Speed | Fast | Very fast |

**Use DeepSeek for:** Architecture, debugging strategies, design patterns, trade-off analysis
**Use Perplexity for:** Latest versions, current docs, recent changes, real-time info
