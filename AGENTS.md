# AGENTS.md

Repo: `Jmf_biblio` — Next.js 15 web app for managing a school library (PMB-backed MySQL).

> Tutorial/feature docs live in `README.md`, `QUICKSTART.md`, `DESARROLLO.md`, `API.md`, `PROJECT_STRUCTURE.md`. This file only carries agent-specific signal that is hard to infer from those or from the source tree.

---

## Stack (verified)

- Next.js 15 App Router + React 19 + TypeScript 5 (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- MySQL via `mysql2/promise`. Backend schema is **PMB** (French library software) — see [DB schema](#db-schema-pmb).
- pnpm 9 pinned via `packageManager` in `package.json`. Node 18+.
- ESLint via `eslint-config-next` (no Prettier config; formatting relies on the VSCode settings only).
- TS path alias `@/* -> ./*` is the only import style used (`@/lib/...`, `@/lib/repositories`).

---

## Commands

- `pnpm dev` — dev server on `:3000`.
- `pnpm build` / `pnpm start` — production build and serve.
- `pnpm lint` — `next lint`.
- `pnpm type-check` — `tsc --noEmit`. **Run this before finishing any change**; no CI catches it.
- `bash check-requirements.sh` — verifies node, pnpm, mysql CLI, `.env.local`, key files.
- No test runner is installed. Verify endpoints manually via `curl` (see `API.md`).

---

## Setup gotchas (non-obvious)

1. `cp .env.example .env.local` and edit. Required keys: `DATABASE_HOST/PORT/USER/PASSWORD/NAME`, `NODE_ENV`, `SESSION_SECRET`, `APP_ADMIN_USER`, `APP_ADMIN_PASSWORD`.
2. The MySQL user needs **CREATE TABLE** permission. First call to `bookRepository` / `userRepository` / `configRepository` auto-creates the `app_*` tables.
3. A default admin user is seeded from `APP_ADMIN_USER` / `APP_ADMIN_PASSWORD` (defaults `admin` / `admin123`) **only** if `app_users` is empty on first start.
4. The DB connection is a process-global singleton in `lib/db.ts` — it caches across hot reloads. Restart `pnpm dev` after editing `.env.local`.
5. `SESSION_SECRET` defaults to a hardcoded fallback in `lib/auth.ts` if unset. Override it in production.
6. `.next/`, `node_modules/`, `.env.local`, `.vscode/` are gitignored.

For the happy-path install walkthrough, see `QUICKSTART.md`.

---

## Architecture (where things live)

- `app/page.tsx` — single Client Component with tabs: `books | users | loans | config | stats`. There is no other page. Tab Config incluye sección "Mantenimiento BD" (admin only).
- `app/api/` — REST route handlers, one folder per resource:
  - `auth/{login,logout,me}` — session cookie issued/here.
  - `books/{route, [id], copies}` — paginated list, detail, available copies.
  - `users/{route, [id]}` — paginated list + detail with active loans.
  - `loans/{route, [id]}` — paginated list with filters + create + return.
  - `config/{settings, users/[id]}` — app settings + admin user CRUD.
  - `config/backup/{route, reset, import, confirm, download/[file]}` — backup system (create/list/delete/reset/import + signed download). **Auth admin only.** Destructive ops (reset/import) require: confirm-token (5min TTL, single-use) + typed phrase ("BORRAR"/"IMPORTAR") + admin password.
  - `statistics/route.ts` — totals + top 5 borrowed books (12 months) + top 5 active borrowers. Auth required.
- `lib/db.ts` — MySQL connection singleton.
- `lib/auth.ts` — HMAC-SHA256 signed cookie sessions (`jmf_biblio_session`, 8h TTL), SHA-256 password hashing (no salt).
- `lib/repositories/` — one file per entity (`bookRepository`, `userRepository`, `loanRepository`, `configRepository`, `authRepository`, `statisticsRepository`, `backupRepository`), re-exported via `index.ts`. **All DB access goes through here.**
- `lib/parsers/` — `pmbSavParser.ts` streams the proprietary PMB `.sav` format (MyISAM→InnoDB, latin1→utf8mb4, INF→0), with optional table whitelist. `index.ts` dispatches by detected format.
- `lib/backup.ts` — core: mysqldump for backups, parser + mysql import for restore, `dropPmbTables` for reset. Uses `execFile`/spawn with `child_process` (NOT `exec` with shell). User MySQL must have CREATE/DROP TABLE perms (no DROP DATABASE needed — reset drops table by table).
- `lib/backupTokens.ts` — HMAC-SHA256 single-use tokens for destructive ops, 5min TTL, action-tagged (`reset` | `import`).
- `lib/auth/role-check.ts` — `requireAdmin()` returns `{ ok, session } | { ok: false, status, error }`. Use as first line of admin-only routes.
- `lib/types.ts` — shared domain types. Some repos declare their own row interfaces inline (`Loan`/`LoanDetail` live in `loanRepository.ts`; `AppUser`/`AppSetting` in `configRepository.ts`).

Full tree in `PROJECT_STRUCTURE.md`. New-entity recipe in `DESARROLLO.md` ("Crear un Nuevo Endpoint") — also summarized in [Adding a new entity](#adding-a-new-entity).

---

## Auth pattern

- Sessions: HTTP-only cookie `jmf_biblio_session`, 8h TTL. Payload is `base64url(JSON).hmacSha256(SESSION_SECRET)` — hand-rolled, **not JWT**.
- Passwords: plain SHA-256, no salt. Read `lib/auth.ts` before changing.
- Mutating routes (`POST`, `PUT`, `DELETE`) start with:
  ```ts
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }
  ```
  GET endpoints are public. Some `POST` routes (e.g. `books`, `loans`) already do this; mirror the pattern when adding mutations.
- `getCurrentSession()` uses `next/headers cookies()` — only valid inside route handlers / server components. It returns `null` for missing, expired, or signature-invalid tokens; never throws.
- `secure` cookie flag is on only when `NODE_ENV === 'production'`.

---

## API conventions

- Response envelope: `{ success: boolean, data?, count?, error?, pagination? }`.
- HTTP codes: `400` validation, `401` auth, `404` not found, `500` server error. Error messages are **Spanish** to match existing strings.
- Pagination: `page` (≥1), `pageSize` (1–200, default 20). List endpoints return `{ data, pagination: { page, pageSize, total, totalPages } }`.
- Sorting: `sortBy`/`sortDir` query params. Always use a `sortMap` whitelist in the repo — **never** interpolate user input into `ORDER BY`.
- Always parameterized SQL. `LIKE` searches wrap user input in `%${q}%` inside the repo.
- Detailed endpoint contracts in `API.md`.

---

## DB schema (PMB)

Existing PMB tables (do not modify structure; treat as legacy):
- `notices` — books (`notice_id`, `tit1`, `year`, `code`).
- `exemplaires` — copies (`expl_id`, `expl_notice`, `expl_statut`, `expl_cb`).
- `empr` — borrowers (`id_empr`, `empr_nom`, `empr_prenom`, `empr_cb`, `empr_mail`).
- `pret` — loans (`pret_id`, `pret_date`, `pret_retour`, `pret_idexpl`, `pret_idempr`, `cpt_prolongation`).
- `authors` and `responsability` — author relations.

App-owned tables (auto-created on first repo call):
- `app_users` — login accounts (`username`, `password_hash` SHA-256, `role` enum).
- `app_settings` — key/value config (`max_loan_days`, `max_renewals`, `fine_per_day`, `allow_weekend_loans`).
- `app_book_state` — soft-delete flag for books (`is_active`).
- `app_user_state` — soft-delete flag for users (`is_active`).
- `app_login_attempts` — rate-limit log for `/api/auth/login` (IP + success flag + timestamp). Old rows (>24h) pruned on each ensure. Rule: 5 failures / 15 min / IP → `429`. Successful login clears attempts for that IP.

Schema column names stay in French to match PMB; new app-side tables use English snake_case.

---

## Adding a new entity

Short version; full template in `DESARROLLO.md`:

1. Create `lib/repositories/<entity>Repository.ts` exporting an object with async methods. Use `getDbConnection()` from `lib/db.ts`.
2. Add the export to `lib/repositories/index.ts`.
3. Add route handlers under `app/api/<entity>/route.ts` (and `app/api/<entity>/[id]/route.ts` if needed). Follow the [auth pattern](#auth-pattern) for mutations and the [API conventions](#api-conventions) envelope.
4. If the frontend needs it, extend the tabs in `app/page.tsx` (it's the only page).

---

## Conventions to preserve

- **No SQL outside `lib/repositories/`.** Route handlers only call repos.
- Sort/filter whitelists live in the repo, not the route.
- Connection pooling is intentionally absent — keep using the `getDbConnection()` singleton. Don't introduce `createPool` mid-refactor.
- Keep error strings Spanish (`"No autenticado"`, `"ID invalido"`, etc.) to match existing responses.
- Don't add tests, CI, husky, or Prettier config unless asked — repo has none.

---

## Backup / Restore (DESTRUCTIVE — read before testing)

- **Backup storage**: `PMB_BACKUP_DIR` env (default `./backups/`). Filenames `backup-YYYYMMDDHHMMSS[-label].sql.gz`.
- **Reset semantics**: `resetDatabase()` first creates `pre-reset-<ts>.sql.gz` safety backup in `PMB_BACKUP_DIR`, then `dropPmbTables()` drops every table not prefixed `app_`. Auto-recreates `app_*` after.
- **Import semantics**: streams uploaded file → `parsePmbSav()` (if `.sav`) → `mysql --force < file.sql`. Uses `SET FOREIGN_KEY_CHECKS=0` to allow FK-violating inserts. Whitelist of tables the app reads: `notices`, `exemplaires`, `empr`, `pret`, `authors`, `responsability` — others are skipped.
- **Restore is non-atomic**: the parser sanitizes `INF` → `0` but cannot fix every data quirk (e.g. `''` in PMB DATE columns). `--force` lets MySQL skip bad rows and continue.
- **Destructive ops require 3 checks**: `requireAdmin()` + signed `confirmToken` (5min TTL, single-use, action-tagged) + admin password re-typed. **Even with all three, test in a scratch DB first** — see the test incident in session log.
- **The MySQL user does NOT need DROP DATABASE** — `dropPmbTables` iterates `information_schema.tables` and drops one by one. Works with `biblio` user (has ALL on `jmf_biblio`).
- **Parser quirks observed in real PMB `.sav` files** (see `bibli_2026_04_13.sav`): `INF` literals in numeric columns (sanitized to 0), `''` in DATE columns (NOT sanitized, will fail silently with `--force`), `MEDIUMBLOB` in `admin_session`, charset declared latin1 but data is ASCII so no recode needed.
- **MySQL client binaries required** in server PATH: `mysqldump`, `mysql`. On Ubuntu: `apt install default-mysql-client` (already present in this deployment).

---

## Gotchas an agent is likely to miss

- `loanRepository.ts` declares its own `Loan` / `LoanDetail` interfaces; there is no `Loan` in `lib/types.ts`. Check the right file when changing loan shapes.
- `lib/utils.ts` exports `successResponse` / `errorResponse` / `logWithTime` / `delay` that **no route handler currently uses** — routes hand-build envelopes inline. Don't assume a util import will work; grep first.
- `BookCopy.expl_cb` exists in the DB but not in `lib/types.ts` (`BookCopy` only has `expl_id`, `expl_statut`, `expl_notice`). Some endpoints return it anyway (see `app/api/books/copies/route.ts`).
- `bookRepository.createBook` writes a full PMB-shaped row with empty defaults for the legacy columns (`typdoc='a'`, empty `n_gen`, etc.). When changing `notices` inserts, preserve this shape or downstream PMB tooling may break.
- `getCurrentSession()` is `async` and uses `await cookies()`. Forgetting `await` on `cookies()` is a Next 15 footgun.
- Cookie auth means **no `Authorization` header support**. Don't add bearer-token middleware.
- The dev connection is reused across requests — leaking a transaction or uncommitted state will bleed into the next call. Repos don't currently use transactions; if you add one, scope it locally.
- `next.config.ts` is minimal (only `reactStrictMode` + tsconfig path). Don't expect env-time rewriting or image domains.
- **PMB historical loans are in `pret_archive`, not `pret`**. The dev DB has 237 active in `pret` and 35,221 in `pret_archive`. Current `PATCH /loans/[id] return` does `DELETE FROM pret` (per PMB convention) — historical preservation would need to `INSERT INTO pret_archive` first. **Known gap, not yet fixed.**
- **Reset endpoint is irreversible without a valid backup.** The safety backup is created in `PMB_BACKUP_DIR` BEFORE dropping tables. If `PMB_BACKUP_DIR` is on a full disk or unwritable, the reset will fail. Verify writability before testing.