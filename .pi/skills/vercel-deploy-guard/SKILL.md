---
description: Pre-deploy guard for ivi. Catches known Vercel build failures before they hit production — cookies in server components, stale Convex generated files, Next.js 15+ async params, RBAC gaps, and TypeScript/ESLint errors. Load before any git push, deploy, or "ship" command.
---

# Vercel Deploy Guard

**Trigger:** Before any `git push`, deploy, or when asked to "ship", "deploy", "push to production".

## Known Deploy Failure Patterns (IVI-specific)

These are all the patterns that have broken Vercel builds. Check every one before pushing.

### 1. Cookies in Server Components (CRITICAL)
**Error:** `Cookies can only be modified in a Server Action or Route Handler`
**Cause:** Calling `cookies().set()` or `cookies().delete()` in a server component (page.tsx, layout.tsx).
**Fix:** Only mutate cookies in Route Handlers (`route.ts`) or Server Actions (`'use server'`). For passing data through OAuth flows, use URL query params or encode in the state parameter.
```typescript
// ❌ WRONG: app/login/page.tsx (server component)
const cookieStore = await cookies();
cookieStore.set('plan', 'pro'); // CRASHES in Next.js 15+

// ✅ RIGHT: Pass through URL state
const destination = `/dashboard?plan=pro`;
const state = btoa(JSON.stringify({ returnPathname: destination }));
```

### 2. Stale convex/_generated Copies (CRITICAL)
**Error:** Type mismatches, missing functions, phantom tables
**Cause:** Duplicate `convex/_generated` directory in frontend (from old copy script).
**Fix:** Frontend uses tsconfig alias `@/convex/*` → `../../convex/*`. Never copy `_generated`.
```bash
# Detect stale copies
find . -path "*/convex/_generated" -not -path "./convex/_generated" -not -path "*/node_modules/*"
```

### 3. Sync params/searchParams (Next.js 15+)
**Error:** `params.id is not a function` or similar runtime errors
**Cause:** `params` and `searchParams` are now `Promise` in Next.js 15+.
**Fix:**
```typescript
// ✅ Correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
// Or use PageProps helper (Next.js 16)
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
}
```

### 4. ReturnsValidationError from Convex
**Error:** `ReturnsValidationError: Value does not match validator`
**Cause:** Adding a field to a table schema but not updating the `returns` validator in the query/mutation.
**Fix:** Use shared return validators from `convex/lib/returnValidators.ts`. When adding a schema field, update the shared validator — it propagates everywhere.

### 5. Worktree + Turbopack Incompatibility
**Error:** Module resolution failures, blank pages, infinite loops
**Cause:** Git worktrees use symlinked `node_modules` — Turbopack can't resolve through symlinks.
**Fix:** Never use worktrees for runtime gates (dev server, E2E). Static gates (tsc, lint, unit tests) are safe.

### 6. Missing RBAC Guards
**Error:** Unauthorized data access, empty query results
**Cause:** New Convex functions missing `requireRead`/`requireWrite`/`requireAdmin`.
**Fix:** Use `secureQuery`/`secureMutation` wrappers from `convex/lib/secureFunctions.ts`. CI audit runs in `vibe-test.sh quick`.

### 7. WorkOS signOut Not Reaching Logout URL
**Error:** User appears stuck logged in after logout
**Cause:** `signOut()` deletes local cookie but Google SSO persists. This is expected OAuth behavior.
**Fix:** Show a toast ("You've been signed out") so user knows it worked.

### 8. ESLint/TypeScript Errors in Test Files Block Deploy
**Error:** Build fails on test file type errors
**Cause:** Test files included in `convex/tsconfig.json` compile scope.
**Fix:** `convex/tsconfig.json` excludes `**/*.test.ts` and `**/*.test.tsx`.

### 9. Sentry Config Without Auth Token
**Error:** Sentry source map upload fails, blocking build
**Cause:** `SENTRY_AUTH_TOKEN` not set in Vercel env.
**Fix:** Set in Vercel dashboard. If not available, `withSentryConfig` degrades gracefully (`silent: !process.env.CI`).

### 10. `any` Types Creeping In
**Error:** ESLint errors blocking build
**Cause:** Using `any` instead of proper types.
**Fix:** Use `Record<string, unknown>`, generics, or `unknown` with type guards.

## Pre-Deploy Checklist (run before every push)

```bash
# Quick local verification (< 2 min)
./scripts/pre-deploy-check.sh

# Or manual steps:
npx convex codegen                    # 1. Fresh types
cd frontend/ai-artifact-table
npx tsc --noEmit                      # 2. Type check
npx next build                        # 3. Production build
cd ../..
./scripts/vibe-test.sh quick          # 4. Tests + RBAC audit
```

## Vercel Build Command
The Vercel build is configured as:
```bash
npx convex deploy --cmd 'npm run build'
```
This deploys Convex functions AND builds the frontend in one step. The `CONVEX_DEPLOY_KEY` env var must be set in Vercel.
