# Local Recovery and Dokploy MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore this MacBook to the exact public `origin/main` state, validate MACCELL locally, and make both Dokploy MCP instances start reliably without exposing secrets or mutating production.

**Architecture:** Preserve every recoverable local state before alignment, then reset only the local `main` reference and worktree to the already-verified remote commit. Keep both MCP profiles as separate stdio processes sharing a pinned official package installation while retaining independent environment credentials.

**Tech Stack:** Git, Node.js 20+, npm with `--legacy-peer-deps`, Next.js 15, Prisma 6, official `@dokploy/mcp` 0.29.14, Codex MCP TOML configuration.

## Global Constraints

- Never print `.env`, API keys, tokens, certificates, passwords, or raw Dokploy responses.
- Never invoke a Dokploy POST tool or production deploy/restart/stop operation.
- Never run `prisma db push`, `prisma migrate deploy`, or any production database mutation.
- Do not push Git commits or branches.
- Preserve `.env`, the deletion state, and the divergent local commits through separate recovery mechanisms.

---

### Task 1: Preserve local state and align `main`

**Files:**
- Preserve: `.env`
- Recover: all files tracked by `origin/main`

**Interfaces:**
- Consumes: verified remote commit `9d0a3adf5746a57fa7b3835b789623427425e470`.
- Produces: clean local `main` at the verified `origin/main` commit.

- [ ] **Step 1:** Copy `.env` to a private timestamped backup outside the repository and verify permissions without reading content.
- [ ] **Step 2:** Create a safety branch pointing to the current local documentation commits.
- [ ] **Step 3:** Stash the 821 tracked deletions with a descriptive name and verify the stash exists.
- [ ] **Step 4:** Fetch `origin`, re-check `refs/heads/main`, and stop if it no longer equals the verified commit.
- [ ] **Step 5:** Align local `main` exactly to `origin/main` and verify `HEAD`, worktree cleanliness, and essential files.

### Task 2: Restore dependencies and generated Prisma client

**Files:**
- Read: `package.json`, `package-lock.json`, `prisma/schema.prisma`
- Generate: ignored dependency and Prisma artifacts only

**Interfaces:**
- Consumes: clean repository from Task 1.
- Produces: dependency tree matching the lockfile and generated Prisma client.

- [ ] **Step 1:** Confirm local Node and npm versions satisfy project requirements.
- [ ] **Step 2:** Run `npm ci --legacy-peer-deps`.
- [ ] **Step 3:** Run `npx prisma generate` and verify success.

### Task 3: Repair `dokploy_sin_rival`

**Files:**
- Modify: `/Users/David/.codex/config.toml`
- Preserve: timestamped private TOML backup
- Reuse: `/Users/David/.codex/mcp-servers/dokploy/node_modules/@dokploy/mcp/build/index.js`

**Interfaces:**
- Consumes: existing Sin Rival URL and API key without exposing their values.
- Produces: independent pinned stdio MCP configuration with response redaction enabled.

- [ ] **Step 1:** Back up `config.toml` and inspect only command structure plus presence of secret variables.
- [ ] **Step 2:** Replace only `dokploy_sin_rival` command/args with the pinned Node entry point and add `DOKPLOY_REDACT_ENV=true`.
- [ ] **Step 3:** Validate TOML structure and confirm Maccell and Sin Rival retain distinct configured credential values without printing them.
- [ ] **Step 4:** Run MCP `initialize`, `tools/list`, and one GET `project.all` per profile; emit only status/count summaries.

### Task 4: Run MACCELL production-safety gates

**Files:**
- Read-only verification across the restored repository

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: explicit evidence for tests, TypeScript, lint applicability, diff integrity, and build.

- [ ] **Step 1:** Run `npm test` and record total pass/fail counts.
- [ ] **Step 2:** Run `npx tsc --noEmit` and record the exit status.
- [ ] **Step 3:** Confirm no changed TypeScript files; otherwise run ESLint on exactly those files.
- [ ] **Step 4:** Run `git diff --check`.
- [ ] **Step 5:** Run `npm run build` and record the exit status.
- [ ] **Step 6:** Re-check `git status`, `HEAD`, stash, recovery branch, MCP configs, and absence of remote mutations.
