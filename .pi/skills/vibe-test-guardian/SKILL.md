---
name: vibe-test-guardian
description: Test enforcement for ivi. Tests are the sole source of production assurance. Covers vibe-test.sh tiers (quick/full/watch), coverage thresholds (70% lines, 65% branches), TDD workflow, and no-verify prohibition. Load when implementing features, running tests, or committing code.
---

# Vibe Test Guardian

> Rules consolidated. See `.pi/skills/ivi-rules/SKILL.md` and `AGENTS.md`.

## Quick reference

```bash
./scripts/vibe-test.sh quick    # Every commit — < 30s
./scripts/vibe-test.sh full     # Before deploy
./scripts/vibe-test.sh watch    # TDD mode
```

- Tests pass = production safe. No exceptions.
- Never `git commit --no-verify`
- Write the test first, then the implementation
- Coverage: 70% lines, 65% branches minimum

Full rules: `AGENTS.md` → Vibe Test Guardian section.
