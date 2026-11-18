# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is team **173820_N32**'s fork of a hackathon starter (KTPMUD Hack Marathon 2026, Track B) for "Vườn Toán Lớp 3", a Vietnamese grade-3 math site. It is not the production app, and all data is synthetic. The team's task is the **"Ước lượng trước khi tính đúng"** question type (`estimate`). Code, UI text and docs are in Vietnamese. Work happens on branch `work`.

Team docs, which are graded deliverables:
- [docs/Requirements.md](docs/Requirements.md): R1–R10 ↔ B-01..B-12.
- [docs/Decisions.md](docs/Decisions.md): ADR-001..006. The exam calls this file `DECISIONS.md`.
- [docs/Test_plan.md](docs/Test_plan.md): test cases T-xx.
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md)
- [docs/SECURITY_PRIVACY_CHECKLIST.md](docs/SECURITY_PRIVACY_CHECKLIST.md)
- [docs/AI_USE.md](docs/AI_USE.md)
- [docs/CONTRIBUTIONS.md](docs/CONTRIBUTIONS.md)
- [docs/RUBRIC_CHECKLIST.md](docs/RUBRIC_CHECKLIST.md): rubric, score caps, deadlines, how to submit.
- [progress/PROGRESS.md](progress/PROGRESS.md)
- [docs/architecture-reference.md](docs/architecture-reference.md): the official description of the starter.

## Exam rules that constrain any change

- **B-07: never modify** [server/auth.js](server/auth.js), any `/api/auth|teacher|admin/*` route in [server/api.js](server/api.js), the sample accounts in `data/seed.json`, `Dockerfile` or `DEPLOY.md`. Verify against starter tag `bkt-2026-v1` = `057a48205f50f0f30d6260be1a44b343a167a3e7`: `git diff 057a482 -- server/auth.js Dockerfile DEPLOY.md` must be empty.
- Never change the behavior of the 4 legacy types (`multiple-choice`, `input`, `compare`, `paint`). Only add.
- Grading must be deterministic code. Never use an LLM to generate or grade answers. Never add real names, real data, secrets or `.env` files. Accounts are only `hocsinh01..99` and `giaovien01` (password `123456`).
- **Log every AI-assisted change in [docs/AI_USE.md](docs/AI_USE.md).** Each entry needs: tool/model, purpose, scope, verification, team decision, responsible alias. A missing AI_USE caps the score at 70.
- Score caps: no runnable MVP → ≤49; no automated tests or CI → ≤59. Keep `npm test` green.
- An agent must not merge, release or declare the work correct. Leave those calls to the team.
- Don't put names or MSSV in `progress/PROGRESS.md` or in folder names.

## Commands

```bash
npm ci               # Node 18–22. better-sqlite3@11 has no prebuilt binary for Node 26 on Windows (install fails)
npm test             # node --test: test/*.test.js, ~11s (seed bcrypt-hashes 100 users); uses a temp DB
node --test test/estimate.test.js            # one file
node --test --test-name-pattern="T-31"       # one test by name
npm start            # http://localhost:3000; demo user hocsinh01 (only user with bai-9 done → bai-10 unlocked)
npm run reset-db     # delete data/vuon-toan.db; next start re-seeds from data/seed.json
npm run build:css    # rebuild public/assets/css/tailwind.build.css after adding Tailwind classes
npm run build:submission  # copy docs/* → submission/hoang_mai_toan_173820_n32/artifacts/ (gitignored) + placeholder check
```

CI: [.github/workflows/test.yml](.github/workflows/test.yml) runs `npm ci && npm test` on PRs with Node 18, 20 and 22. There is no linter.

Environment variables: `PORT`, `DB_PATH`, `SESSION_SECRET`, `ADMIN_SECRET` (the `x-admin-secret` header), `GOOGLE_CLIENT_ID`, `NODE_ENV`.

## Architecture

Express + `better-sqlite3`, which is **synchronous** (`db.prepare(...).get/all/run`, `db.transaction`). The frontend is static HTML plus vanilla JS: no framework, no bundler, no ORM.

### Server
- [server/index.js](server/index.js) wires `express.json` → `attachUser` (cookie or `Bearer`) → `/api` → static `public/`. [test/api.test.js](test/api.test.js) builds the same app on port 0.
- [server/db.js](server/db.js) runs at `require` time and reads `DB_PATH` at that moment. It creates tables and applies migrations as `ALTER TABLE` statements in try/catch.
  - **Seed only runs when `users` is empty.** Edits to `data/seed.json` need `npm run reset-db`.
  - `star_reward` is derived from the set's kind: 100 for exams, otherwise 40.
  - `questions.type` is free-form TEXT, so a new type needs no schema change.
- `GET /api/question-sets/:id/questions` never returns `correct_answer`.
- `POST /api/submissions` calls `gradeQuestion(q, answers)` from [server/grading.js](server/grading.js) for each question. Then, in one transaction, it:
  - writes `attempts`, with the raw `answers` stored in `answers_json`;
  - upserts `progress` per **lesson** (`best_score` keeps the max; `completed` at ≥50%);
  - adds stars only for improvement over the previous best.
- [server/grading.js](server/grading.js): legacy types use exact string equality after trim and lowercase. `estimate` goes to [server/estimate.js](server/estimate.js).
- [server/estimate.js](server/estimate.js) is pure logic:
  - Tolerance is `ESTIMATE_TOLERANCE_PERCENT = 20`, the only place it is set. The integer range is `lo = ⌈0.8n⌉`, `hi = ⌊1.2n⌋`.
  - Input must match `^\d{1,6}$` after trimming.
  - A question is correct only if the estimate is in range **and** the exact value equals `n`.
  - There are 4 `outcome` codes, each with a Vietnamese feedback message.
  - Invalid input is graded as wrong, never answered with a 400.

### Frontend
- Every page loads its scripts in this order: `core/api.js` (`window.MathAPI`) → `components/sidebar.js` (`MathApp.routes`) → `navbar.js` → `footer.js` → `core/app.js` → `pages/<page>.js`. Everything is globals, with no modules.
- `core/app.js` handles auth redirects using `<body data-page>` and `data-require-role`, then fires `mathapp:user-ready`.
- Question rendering is duplicated per page:
  - [pages/lesson.js](public/assets/js/pages/lesson.js): the generic `lesson.html?lesson=&set=` player. **The `estimate` UI lives here**, through [components/estimate-question.js](public/assets/js/components/estimate-question.js).
  - [pages/exercise.js](public/assets/js/pages/exercise.js): a static worksheet hard-wired to `phieu-bai-9-10`. It only adds entry links to the lesson's other sets.
  - `exam.js`: hard-wired to `bai-15-kiem-tra`.
  - The teacher editor in `schedule.js` is off-limits (`/api/teacher/*`).
- How `estimate` reaches the student:
  - Answer keys: `answers[id]` is the exact value and `answers[id + '__est']` is the estimate.
  - Step order is enforced only in the UI, and the locked estimate is kept in `sessionStorage` under `vuontoan:estimate:<userId>:<setId>`.
  - Entry path (B-01): home → Bài 10 card (opens `exercise.html`, since `questionSets[0]` is `phieu-bai-9-10`) → link to `phieu-uoc-luong`.
- Tailwind: the CDN script layers on top of the prebuilt `tailwind.build.css`, and the theme lives only in `public/assets/js/tailwind.config.js`. Rerun `build:css` after adding classes.
- `curriculum.json` exists in both `data/` and `public/data/`. Keep the two identical.

## Gotchas

- Working tree files are CRLF (`core.autocrlf=true`). When rewriting `data/seed.json` programmatically, use `JSON.stringify(s, null, 2) + '\n'` with CRLF line endings, which keeps the diff to only the lines you actually changed.
- Don't run `tools/build-from-original.py`. It overwrites pages from an `original-backup/` folder that isn't in the repo.
- Submission goes to a **separate** fork of `fossbk-spec/ktpmud-project`, never a PR into the starter. See [docs/RUBRIC_CHECKLIST.md](docs/RUBRIC_CHECKLIST.md) §6.
