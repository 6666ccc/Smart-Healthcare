# WenRun Naming Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the active backend, frontend, and AI components to WenRun/React/AI and remove stale WenRun naming from code, configuration, and documentation.

**Architecture:** Preserve the existing three-service architecture. Rename directories and Java package paths, then apply deterministic identifier/configuration replacements across tracked files. Remove only the confirmed unused local legacy directories.

**Tech Stack:** Spring Boot/Maven, React/Vite, Python/FastAPI, MySQL, Qdrant.

---

### Task 1: Replace legacy directories

**Files:**
- Rename: `WenRun/` → `WenRun/`
- Rename: `wenrun-react/` → `React/`
- Rename: `AI/` → `AI/`
- Remove: unused local `WenRun/` and `wenrun-react/` before destination moves

- [ ] Verify destination paths are inside the workspace and remove only the confirmed stale directories.
- [ ] Move the three active directories to their final names.

### Task 2: Rename Java packages and project identifiers

**Files:**
- Modify: `WenRun/pom.xml`, all `WenRun/src/**/*.java`, mapper XML namespaces, application configuration

- [ ] Replace `com.example.wenrun` with `com.example.wenrun` in Java source and mapper XML.
- [ ] Rename `WenRunApplication` to `WenRunApplication` and its file.
- [ ] Replace Maven artifact/name/description and application labels with `WenRun`.

### Task 3: Rename React and AI identifiers

**Files:**
- Modify: `React/package.json`, `React/package-lock.json`, `React/src/**`, `AI/**`

- [ ] Replace frontend package and storage keys with `wenrun` names.
- [ ] Replace Python service naming, client/settings symbols, API labels, and environment variables with `WENRUN_*`.
- [ ] Update imports and module filenames where the old component name is embedded.

### Task 4: Update database/config/docs

**Files:**
- Modify: SQL, YAML/properties, Postman collections, Markdown docs, `.gitignore`

- [ ] Change database references to MySQL schema `wenrun`.
- [ ] Rename storage collections and internal API identifiers to `wenrun_*`.
- [ ] Update paths and service names in documentation and ignore rules.

### Task 5: Verify

- [ ] Search tracked files for `WenRun`, `wenrun`, `AI`, and `wenrun-react`.
- [ ] Run Maven tests/package, Python import/compile checks, and React build if dependencies are available.
- [ ] Review `git status` and confirm only intended rename/refactor changes remain.
