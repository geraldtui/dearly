---
name: merge-to-main
description: Merge develop branch to main with comprehensive testing and push to origin. Use when the user asks to merge to main, deploy to production, release to main, or promote develop to main. Follows the project's --no-ff merge strategy.
disable-model-invocation: true
---

# Merge to Main

Automates the complete workflow for merging develop to main and pushing to origin. This is typically used for production releases.

## Workflow

Execute these steps sequentially:

### 1. Check Current Branch
```bash
git rev-parse --abbrev-ref HEAD
```
- **If on `develop`**: Continue to step 2
- **If on other branch**: Switch to develop first (see step 1a)

### 1a. Switch to Develop (if needed)
```bash
git checkout develop
```

### 2. Ensure Develop is Clean
```bash
git status --porcelain
```
- **If clean**: Continue to step 3
- **If dirty**: Stop and warn the user
  - Message: "develop branch has uncommitted changes. Please commit or stash them first."
  - Do NOT proceed - develop should always be in a clean, committed state

### 3. Ensure Develop is Up to Date
```bash
git fetch origin
git pull origin develop
```

**Why pull first?**
- Ensures we're merging the latest develop
- Prevents pushing stale code to main
- Validates that local develop matches remote

### 4. Run All Tests on Develop
```bash
# TypeScript type check
npx tsc --noEmit

# Linter
npm run lint

# Unit tests
npm test

# E2E tests (if applicable)
npm run test:e2e
```

**If any test fails:**
- Stop the workflow immediately
- Report which test failed and the error
- Do NOT proceed with merge to main
- User must fix the issues on develop before merging to main

**Test output:**
- Show test results summary
- Report pass/fail status for each test suite

### 5. Switch to Main
```bash
git checkout main
git pull origin main
```

### 6. Merge Develop (with --no-ff)
```bash
git merge --no-ff develop -m "Merge branch 'develop' into main"
```

**Why --no-ff?**
- Preserves develop branch history
- Creates a merge commit for easy rollback
- Maintains clear project timeline
- Makes it obvious in history when releases happened

### 7. Run All Tests on Main
```bash
# TypeScript type check
npx tsc --noEmit

# Linter
npm run lint

# Unit tests
npm test

# E2E tests (if applicable)
npm run test:e2e
```

**If any test fails after merge:**
- Stop before pushing
- Report the failure
- The merge is complete locally but NOT pushed
- User must fix issues on main before pushing
- Consider: `git reset --hard origin/main` to undo local merge if needed

**Why run tests again?**
- Final validation before production
- Ensures merge didn't introduce unexpected issues
- Validates that main remains stable
- Prevents pushing broken code to production

### 8. Push to Origin
```bash
git push origin main
```

### 9. Return to Develop
```bash
git checkout develop
```

**Why return to develop?**
- Developers typically continue working on develop
- Keeps workflow consistent
- User is ready to start next feature immediately

## Error Handling

**Merge conflicts:**
- If conflicts occur, stop and report to user
- Provide guidance: "Merge conflicts detected. Please resolve manually."
- Suggest: Review conflicting files and resolve
- Do NOT attempt automatic conflict resolution

**Push failures:**
- If push fails, report the error
- Suggest: `git pull --rebase origin main` then retry
- May need to coordinate with team if main was updated

**Network errors:**
- If fetch/push fails due to network, report and suggest retry

**Test failures:**
- If tests fail on develop (step 4), stop immediately - do NOT merge to main
- If tests fail on main after merge (step 7), stop before push - do NOT push to origin
- Report which tests failed and suggest fixes
- User must resolve test failures before proceeding

**Dirty develop branch:**
- If develop has uncommitted changes, stop immediately
- Do NOT auto-commit - develop should always be intentionally committed
- User must manually commit or stash changes first

## Usage Examples

User says: "Merge to main"
→ Execute full workflow

User says: "Deploy to production"
→ Execute full workflow

User says: "Release to main"
→ Execute full workflow

User says: "Promote develop to main"
→ Execute full workflow

## Output Format

Provide a clear summary after completion:

```markdown
✅ **Merge to Main Complete**

**Branch**: develop → main
**Commits**: 5 commits merged
**Tests**: ✅ All tests passed (develop + main)
**Status**: Pushed to origin
**Current branch**: develop

**Production is now updated** with the latest develop changes.
```

## Important Notes

- **All tests must pass** before merging and before pushing (non-negotiable)
- Tests are run twice: once on develop, once on main after merge
- Always use `--no-ff` for merges to preserve branch history
- Develop branch must be clean - no auto-commit (unlike feature branch workflow)
- No branches are deleted (develop and main are permanent branches)
- User returns to `develop` branch after completion
- This workflow represents a production release - use with care

## Test Suite

This workflow runs the following tests:
- **TypeScript**: `npx tsc --noEmit` - Type checking
- **Linter**: `npm run lint` - Code style and quality
- **Unit Tests**: `npm test` - Vitest unit and component tests
- **E2E Tests**: `npm run test:e2e` - Playwright end-to-end tests (if applicable)

## When to Use This Skill

Use this skill when you're ready to:
- Release stable features from develop to production
- Deploy a new version to main branch
- Promote tested develop changes to main
- Create a production release

**Prerequisites:**
- All features on develop are tested and approved
- develop branch is stable and ready for production
- Team has agreed this is a good time for a release
