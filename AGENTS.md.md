# Agent Workflow & Operating Guidelines

## Mandatory Post-Task Protocol: Automated Git Push

You must strictly adhere to this rule at the conclusion of every single task, feature addition, refactoring, or bug fix without requiring explicit reminders.

---

### 1. Automated Git Push Protocol
Immediately upon finalizing code modifications:
1. **Check Status**: Run `git status` to inspect all staged, untracked, and modified files.
2. **Stage Changes**: Run `git add .` (strictly verify `.gitignore` is respected; never stage `.env`, private keys, local credentials, or build artifacts).
3. **Commit with Conventions**: Run `git commit -m "<type>: <concise description>"` following Conventional Commits format:
   - `feat:` New features (e.g., `feat: implement dynamic claim sequence generator`)
   - `fix:` Bug fixes (e.g., `fix: resolve mobile sidebar label visibility`)
   - `refactor:` Code improvements without feature changes
   - `style:` Formatting or UI tweaks
   - `chore:` Dependency or repo maintenance
4. **Push Upstream**: Run `git push origin <current-branch>` (e.g., `main` or the currently checked-out working branch).

---

### 2. Pre-Push Guardrails & Conflict Handling
- **Build & Syntax Verification**: Verify that the changes introduce no syntax errors, missing exports/imports, or build-breaking TypeScript failures before pushing.
- **Conflict Resolution**: If the push is rejected or encounters upstream conflicts, immediately halt, inspect `git status` / `git log`, and report the repository state with actionable resolution steps rather than force-pushing blindly.

---

### 3. Execution Summary Output
At the very end of every completed turn, append a clean summary block in this format:

```text
─── Git Execution Summary ───
Branch:        <branch-name>
Commit Hash:   <commit-hash>
Commit Msg:    <type>: <message>
Status:        Pushed to remote successfully
─────────────────────────────