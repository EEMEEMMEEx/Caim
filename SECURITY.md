# Security Policy

## 1. Supported Versions

Security updates and patches are actively applied to the default branch (`main`).

| Branch | Supported |
| :--- | :--- |
| `main` | ✅ Yes |
| Others | ❌ No |

---

## 2. Automated Pull Request Merging (Auto-Merge Bot)

To safeguard repository integrity while enabling continuous delivery, automated merging is governed by strict security boundaries implemented in `.github/workflows/auto-merge.yml`:

### 2.1 Author Allowlist Enforcement
- **Strict Identity Validation:** Auto-merge is exclusively restricted to pull requests created by the explicit GitHub username:
  - `EEMEEMMEEx`
- **Anti-Spoofing Architecture:** Git commit headers (`git config user.name`, commit author emails) are deliberately **never** used for authorization because commit metadata can be arbitrarily forged. The system validates identity solely through GitHub's authenticated API token payload (`pull_request.user.login`), which is cryptographically verified by GitHub.
- Any pull request opened by an unlisted author is silently ignored without triggering merge actions.

### 2.2 Untrusted Code Protection & Isolation
- **No Untrusted Execution:** The bot workflow triggers on `workflow_run` upon completion of the `CI` workflow.
- It executes strictly within the context of the upstream default branch (`main`).
- It **never** checks out (`actions/checkout`) or executes build/test scripts from external fork branches during the merge phase, eliminating arbitrary code execution (RCE) and script injection vectors.

### 2.3 Least-Privilege Token Governance
The workflow runs using GitHub Actions' built-in `GITHUB_TOKEN` scoped to minimal required capabilities:
- `contents: write` — Required to complete the branch merge.
- `pull-requests: write` — Required to inspect PR state and post feedback comments.
- `actions: read` — Required to inspect the CI run conclusion.
No external personal access tokens (PAT) or long-lived secrets with elevated privileges are exposed to workflow runs.

### 2.4 Pre-Merge Invariants
Auto-merge proceeds if and only if **all** of the following conditions are simultaneously met:
1. Author identity equals `EEMEEMMEEx`.
2. Pull request status is `OPEN`.
3. Upstream CI workflow (`quality` job: lint, typecheck, build) concluded with `success`.
4. GitHub reports `mergeable` as `true` with no merge conflicts (`mergeStateStatus != "DIRTY"`).

If any invariant fails, merge is immediately aborted and an explanatory notification is posted to the pull request.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability within CAIM or its automation workflows:

1. **Do NOT open a public issue, pull request, or discussion.**
2. Report the vulnerability privately via GitHub Security Advisories or contact the maintainers.
3. Provide details including:
   - Description of the vulnerability and attack vector
   - Affected files, workflows, or endpoints
   - Proof of concept or reproduction steps
   - Proposed mitigation if available

We will acknowledge reports promptly, investigate root causes, and deploy patches.
