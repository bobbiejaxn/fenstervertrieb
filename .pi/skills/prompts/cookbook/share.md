# Share Prompts Across Projects

How to distribute prompts via the library system.

## When to Share

Share a prompt when:
- You've used it successfully 3+ times
- Other projects could benefit
- It's project-agnostic (no hardcoded paths)
- It's well-tested and documented
- It solves a common problem

## Prerequisites

- [ ] Prompt exists in `.pi/prompts/`
- [ ] Prompt is tested and working
- [ ] YAML frontmatter is complete
- [ ] No project-specific hardcoded values
- [ ] Documentation is clear

## Push to Central Library

### Step 1: Prepare Prompt

Ensure prompt is ready for sharing:

```bash
# Check prompt file
cat .pi/prompts/my-workflow.md
```

Verify:
- [ ] Has YAML frontmatter with description
- [ ] Uses `$@` for variable input (no hardcoded values)
- [ ] References agents exist (or document required agents)
- [ ] No absolute paths to your specific project
- [ ] Clear instructions and output format

### Step 2: Test in Clean Environment

Create test scenario:
```bash
# Test with minimal input
/my-workflow test input

# Test with complex input
/my-workflow "complex scenario with edge cases"

# Test with invalid input
/my-workflow ""
```

All should behave correctly or fail gracefully.

### Step 3: Push to Library

```bash
/library push prompt:my-workflow
```

This copies the prompt to `~/.pi/library-central/prompts/`.

### Step 4: Verify Catalog Entry

```bash
cat ~/.pi/library-central/catalog.yaml
```

Look for your prompt:
```yaml
prompts:
  - name: my-workflow
    source: prompts/my-workflow.md
    version: 1.0.0
    description: "Your description from frontmatter"
    dependencies: []
```

## Install in Another Project

### Step 1: Check Available Prompts

```bash
/library search prompt
```

Or browse directly:
```bash
ls -1 ~/.pi/library-central/prompts/
```

### Step 2: Install Specific Prompt

```bash
/library install prompt:my-workflow
```

This copies from central library to `.pi/prompts/`.

### Step 3: Verify Installation

```bash
ls -l .pi/prompts/my-workflow.md
```

### Step 4: Test It

```bash
/my-workflow test input
```

Should work identically to original project.

## Sync All Prompts

Pull all prompts from central library:

```bash
/library sync --only prompts
```

This updates all prompts in `.pi/prompts/` from central.

## Version Management

### Update a Prompt

After improving a prompt:

```bash
# Edit the prompt
vim .pi/prompts/my-workflow.md

# Test changes
/my-workflow test

# Push update
/library push prompt:my-workflow
```

Version automatically increments in catalog.

### Check for Updates

In any project:

```bash
/library outdated
```

Shows prompts with newer versions available.

### Update Local Prompts

```bash
# Update specific prompt
/library install prompt:my-workflow

# Update all prompts
/library sync --only prompts
```

## Customize Shared Prompts

### Fork for Local Changes

```bash
/library customize prompt:my-workflow
```

This:
1. Marks prompt as "customized" in local catalog
2. Won't be overwritten by `/library sync`
3. Can still see diff from central version

### View Customizations

```bash
/library diff prompt:my-workflow
```

Shows differences between local and central versions.

### Revert to Central Version

```bash
/library revert prompt:my-workflow
```

Discards local changes, pulls central version.

## Dependencies

### Document Required Agents

If prompt needs specific agents, add to frontmatter:

```markdown
---
description: Full delivery workflow
dependencies:
  - agent:product-manager
  - agent:architect
  - agent:implementer
  - agent:reviewer
---
```

### Check Dependencies

```bash
/library deps prompt:my-workflow
```

Shows all required agents and whether they exist locally.

### Install Dependencies

```bash
# Install prompt and its dependencies
/library install prompt:my-workflow --with-deps
```

Automatically installs required agents.

## Best Practices

### Make Prompts Portable

❌ **Hardcoded paths:**
```markdown
Read file: /Users/me/myproject/src/utils.ts
```

✅ **Relative or generic:**
```markdown
Read file: src/utils.ts
```

❌ **Project-specific values:**
```markdown
Database: mongodb://localhost:27017/myapp
```

✅ **Generic placeholders:**
```markdown
Database: [from environment variables]
```

### Document Agent Requirements

If prompt needs agents not in core set:

```markdown
---
description: Deploy workflow
dependencies:
  - agent:deploy-specialist  # Custom agent, not included
---

## Prerequisites

This prompt requires the `deploy-specialist` agent.
Install from library: `/library install agent:deploy-specialist`
```

### Version Compatibility

Add version info if needed:

```markdown
---
description: Modern workflow
compatibility:
  pi_version: ">=1.5.0"
  requires:
    - learnings-system
    - library-system
---
```

### Test Before Sharing

Checklist before pushing:

- [ ] Tested in original project
- [ ] Tested with edge cases
- [ ] Tested with invalid input
- [ ] Documentation is complete
- [ ] No project-specific hardcoded values
- [ ] Dependencies documented
- [ ] Works in fresh project directory

## Sharing Workflow Example

Complete workflow from creation to distribution:

```bash
# 1. Create prompt in Project A
cd ~/projects/project-a
vim .pi/prompts/api-workflow.md

# 2. Test thoroughly
/api-workflow "Create user endpoint"
/api-workflow "Invalid input!@#"

# 3. Add dependencies to frontmatter
vim .pi/prompts/api-workflow.md
```

```markdown
---
description: Generate API endpoint with tests
dependencies:
  - agent:implementer
  - agent:test-writer
  - agent:reviewer
---
```

```bash
# 4. Push to central
/library push prompt:api-workflow

# 5. In Project B, install
cd ~/projects/project-b
/library install prompt:api-workflow --with-deps

# 6. Test in Project B
/api-workflow "Create product endpoint"

# 7. Verify it works identically
# If yes: share with team
# If no: fix in Project A and re-push
```

## Troubleshooting

### Prompt Won't Install

**Check if prompt exists in central:**
```bash
ls ~/.pi/library-central/prompts/my-workflow.md
```

**Verify catalog entry:**
```bash
grep -A5 "name: my-workflow" ~/.pi/library-central/catalog.yaml
```

### Prompt Behavior Differs Across Projects

**Likely causes:**
1. Different agents in each project
2. Different agent models configured
3. Project-specific dependencies missing

**Debug:**
```bash
# Compare agent definitions
diff project-a/.pi/agents/implementer.md \
     project-b/.pi/agents/implementer.md

# Check agent models
grep "model:" project-a/.pi/agents/*.md
grep "model:" project-b/.pi/agents/*.md

# Verify dependencies
/library deps prompt:my-workflow
```

### Prompt Outdated After Push

Cache issue. Force refresh:

```bash
# In consuming project
rm .pi/prompts/my-workflow.md
/library install prompt:my-workflow
```

## Advanced: Prompt Collections

Group related prompts:

```yaml
# In catalog.yaml
collections:
  - name: api-workflows
    prompts:
      - prompt:api-get
      - prompt:api-post
      - prompt:api-delete
    description: "Complete API development workflow"
```

Install entire collection:
```bash
/library install collection:api-workflows
```

## See Also

- [Library Skill](../../library/SKILL.md) - Complete library system documentation
- [Create Custom Prompt](./create.md) - How to build prompts
- [Compose Prompts](./compose.md) - Multi-agent orchestration
