---
name: merge-to-develop
description: Merge current feature branch to develop with auto-commit and push to origin. Use when the user asks to merge changes, merge to develop, push to remote, or finalize a feature branch. Follows the project's --no-ff merge strategy.
disable-model-invocation: true
---

# Merge to Develop

Automates the complete workflow for merging a feature branch to develop and pushing to origin.

## Workflow

Execute these steps sequentially:

### 1. Check Current Branch
```bash
git rev-parse --abbrev-ref HEAD
```
- **If on `develop` or `main/master`**: Stop and warn the user that they're already on the target branch
- **If on a feature branch**: Continue to step 2

### 2. Check for Uncommitted Changes
```bash
git status --porcelain
```
- **If clean**: Continue to step 3
- **If dirty**: Auto-commit all changes (see step 2a)

### 2a. Auto-Commit Changes (if needed)
```bash
# Stage all changes
git add .

# Generate commit message by analyzing the diff
git diff --cached --stat

# Create commit with descriptive message
git commit -m "$(cat <<'EOF'
[Generated commit message based on changes]

[Brief description of what changed]
EOF
)"
```

**Commit message format:**
- First line: Brief summary (50 chars max)
- Blank line
- Detailed description if needed

### 3. Ensure Branch is Up to Date
```bash
git fetch origin
```

### 4. Switch to Develop
```bash
git checkout develop
git pull origin develop
```

### 5. Merge Feature Branch (with --no-ff)
```bash
git merge --no-ff <feature-branch-name> -m "Merge branch '<feature-branch-name>'"
```

**Why --no-ff?**
- Preserves feature branch history
- Creates a merge commit for easy rollback
- Maintains clear project timeline

### 6. Push to Origin
```bash
git push origin develop
```

### 7. Clean Up Feature Branch
```bash
# Stay on develop (don't return to feature branch)
# Delete local feature branch
git branch -d <feature-branch-name>

# Delete remote feature branch
git push origin --delete <feature-branch-name>
```

**Why clean up?**
- Keeps repository clean and organized
- Removes merged branches to reduce clutter
- Uses `-d` (not `-D`) for safety - only deletes if fully merged

## Error Handling

**Merge conflicts:**
- If conflicts occur, stop and report to user
- Provide guidance: "Merge conflicts detected. Please resolve manually."
- Do NOT attempt automatic conflict resolution

**Push failures:**
- If push fails, report the error
- Suggest: `git pull --rebase origin develop` then retry

**Network errors:**
- If fetch/push fails due to network, report and suggest retry

**Branch deletion failures:**
- If local branch deletion fails, it may have unmerged commits (safety feature)
- If remote branch deletion fails, it may not exist on remote (already deleted or never pushed)
- Report but continue - deletion failures are non-critical

## Usage Examples

User says: "Merge to develop and push"
→ Execute full workflow

User says: "Push my changes"
→ Execute full workflow

User says: "Finalize this feature"
→ Execute full workflow

## Output Format

Provide a clear summary after completion:

```markdown
✅ **Merge to Develop Complete**

**Branch**: feature/chat-navigation-performance → develop
**Commits**: 3 commits merged
**Status**: Pushed to origin
**Cleanup**: Feature branch deleted (local + remote)

**You're now on**: develop
```

## Important Notes

- Always use `--no-ff` for merges to preserve branch history
- Auto-commit uses descriptive messages based on actual changes
- Feature branch is deleted after successful merge (local + remote)
- Uses `git branch -d` (not `-D`) for safety - only deletes if fully merged
- User ends on `develop` branch after completion
