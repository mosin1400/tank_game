# Cinematic Operation Builder Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable and portable skill that hands off the complete M01-quality workflow for authoring later cinematic operations.

**Architecture:** Keep orchestration and hard constraints in `SKILL.md`; route detailed narrative, environment, encounter, cinematic, integration, and verification guidance into focused references. Add a deterministic Python validator for an operation specification and package the installed skill as a ZIP.

**Tech Stack:** Markdown skill instructions, YAML UI metadata, Python 3 standard library, Codex skill validator.

## Global Constraints

- Do not include human character generation, rigging, or animation-production instructions.
- Treat the existing shared character roster, rigs, and animation library as ready infrastructure.
- Never use a browser for rendering or visual verification.
- Never claim, stop, or reuse port 8080; choose a confirmed-free alternate port when an HTTP server is necessary.
- Use Blender background mode and Cycles for final Blender renders when Blender is needed.
- Preserve all existing gameplay features and user-owned changes.

---

### Task 1: Skill package and references

**Files:**
- Create: `C:/Users/Mohammad Amin Chezgi/.codex/skills/cinematic-operation-builder/SKILL.md`
- Create: `C:/Users/Mohammad Amin Chezgi/.codex/skills/cinematic-operation-builder/agents/openai.yaml`
- Create: `C:/Users/Mohammad Amin Chezgi/.codex/skills/cinematic-operation-builder/references/*.md`

**Interfaces:**
- Consumes: campaign story, mission data, scene/runtime conventions, existing character APIs.
- Produces: a staged operation-authoring workflow with explicit review gates and acceptance criteria.

- [x] Initialize the skill with `references` and `scripts` resources.
- [x] Write the concise router and non-negotiable constraints in `SKILL.md`.
- [x] Write focused references for story, environment art, encounters, cinematics, integration, and verification.
- [x] Add a complete reusable operation-spec template.

### Task 2: Deterministic operation validator

**Files:**
- Create: `C:/Users/Mohammad Amin Chezgi/.codex/skills/cinematic-operation-builder/scripts/validate_operation.py`
- Create: a temporary valid and invalid operation spec outside the skill folder during testing.

**Interfaces:**
- Consumes: one JSON operation specification path.
- Produces: exit code `0` plus `PASS`, or nonzero plus precise missing/invalid field diagnostics.

- [x] Implement JSON parsing and required-field/type/three-act validation using only Python's standard library.
- [x] Run a valid fixture and require exit code `0`.
- [x] Run an invalid fixture and require a nonzero exit code with actionable diagnostics.

### Task 3: Validate and package

**Files:**
- Create: `C:/Users/Mohammad Amin Chezgi/Downloads/t3475/cinematic-operation-builder.zip`

**Interfaces:**
- Consumes: the completed installed skill folder.
- Produces: one portable ZIP whose root folder is `cinematic-operation-builder/`.

- [x] Run `quick_validate.py` on the installed skill.
- [x] Scan for forbidden character-production guidance, placeholders, browser-rendering instructions, and accidental port-8080 ownership.
- [x] Create the ZIP and list its entries to verify the portable structure.
- [x] Re-run validator smoke tests and report the exact artifact paths.
