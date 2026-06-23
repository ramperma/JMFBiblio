# Changelog

## [1.2.0] - 2026-06-22

### ⚠️ Sistema de backup/restore (DESTRUCTIVO) — E2E con `bibli_2026_04_13.sav`

**Parser PMB `.sav`** (`lib/parsers/pmbSavParser.ts`):
- Streaming con `readline`, encoding `latin1` en lectura → `utf8mb4` en output (preserva acentos).
- Reescritura: `MyISAM`→`InnoDB`, `CHARSET=latin1`→`utf8mb4`, `COLLATE`→`utf8mb4_unicode_ci`.
- Orden FK-aware: `authors → notices → exemplaires → responsability → empr → pret`.
- Sanitización: `INF`/`NaN`/`-INF`→`0` en valores numéricos.
- Whitelist de 6 tablas que la app lee (`notices`, `exemplaires`, `empr`, `pret`, `authors`, `responsability`); 95 ignoradas.
- `SET SESSION sql_mode=''` en output para tolerar `0000-00-00` (52k ocurrencias en SAV).

**Núcleo de backup** (`lib/backup.ts`):
- `createBackup` — `mysqldump --single-transaction` + gzip.
- `importFromFile` — detecta formato (.sav vs mysqldump), parsea, **dropea tablas via SQL antes del import** (mysql --force saltaba DROPs en archivos grandes), ejecuta `mysql --force`.
- `listBackups`, `deleteBackup`, `resetDatabase`, `dropPmbTables`, `downloadBackup`.
- Usa `execFile`/spawn con args separados (no shell, no injection).

**Seguridad**:
- `lib/backupTokens.ts` — HMAC-SHA256 single-use tokens, 5min TTL, action-tagged (`reset`|`import`).
- `lib/auth/role-check.ts` — `requireAdmin()` helper.
- **Triple check en reset/import**: `requireAdmin()` + token + frase ("BORRAR"/"IMPORTAR") + password del admin re-tipeado.

**6 endpoints** en `app/api/config/backup/`:
- `GET/POST/DELETE /api/config/backup` — listar/crear/borrar.
- `GET /api/config/backup/confirm?action=reset|import` — emite token.
- `POST /api/config/backup/reset` — DROP todas las PMB (triple check).
- `POST /api/config/backup/import` — multipart upload (triple check).
- `GET /api/config/backup/download/[file]` — sirve archivo gzip.

**UI**: sección "Mantenimiento de BD" en tab Config. Crea backups, lista, descarga, reinicia, importa. Triple confirmación visible con password.

**Variable nueva**: `PMB_BACKUP_DIR` en `.env.example` (default `./backups`).

**Resultado E2E con `bibli_2026_04_13.sav` (44MB)**:
- ✅ `notices` 7140, `exemplaires` 8921, `pret` 237, `authors` 3365, `responsability` 7784 — importados correctamente.
- ⚠️ `empr` 558/668 — 110 filas saltadas por fechas corruptas en SAV (`''` en `last_loan_date` que MySQL rechaza).
- ✅ `app_*` preservadas (admin, settings, login_attempts).
- ✅ App funcional tras import: login, stats, libros con acentos, préstamos.
- ✅ 2 warnings (PK duplicados `expl_cb` en SAV original).

### Incidentes en sesión
- **Reset accidental**: durante E2E se ejecutó `reset` sobre producción. Backup automático permitió restaurar 100%. **Lección**: triple check (token+frase+password) implementado en mismo PR.
- **DROP no ejecutado por mysql --force**: en archivos grandes, `mysql --force` saltaba DROPs dentro del archivo. **Fix**: `dropTablesViaSql()` via conexión SQL antes del import.
- **Encoding corrupto**: parser inicial leía como `utf8`, corrompía acentos latin1. **Fix**: leer como `latin1`.
- **`0000-00-00` rechazado**: MySQL con `STRICT_TRANS_TABLES` rechaza fechas cero. **Fix**: `SET SESSION sql_mode=''` en output del parser.

### Limitaciones conocidas
- PMB archivos del filesystem (imágenes, `parametros.xml`) NO se importan.
- `pret_archive` (35k filas) se omite del import (la app no la lee).
- `empr` pierde ~110 filas con fechas corruptas en SAV.
- `mysqldump` y `mysql` deben estar en PATH del server.

---


## [1.1.0] - 2026-06-22

### ✨ Nuevas características
- Autenticación con cookie de sesión (HMAC-SHA256) y login/logout/me
- Rate limit en `/api/auth/login`: 5 fallos / 15 min / IP → 429
- CRUD de usuarios de la app (admin/staff) en `/api/config/users`
- Configuración dinámica (`/api/config/settings`): max_loan_days, max_renewals, fine_per_day, allow_weekend_loans
- Endpoint de estadísticas: totales + top 5 libros prestados (12 meses) + top 5 usuarios activos
- Tab "Estadísticas" en UI con cards + tablas

### 🔧 Mejoras
- Fix: la lista de préstamos/libros/usuarios ahora se refresca tras devolver/renovar/editar (patrón `refreshKey`)
- Fix: botón "Entrar" deshabilitado durante fetch de login (evita doble submit)
- Fix: `logout` ahora tolera errores de red (limpia estado local siempre)
- Fix: convención PMB aclarada — devolución es `DELETE FROM pret` (no UPDATE fecha), porque cada `pret_idexpl` tiene 1 fila activa

### 📚 Documentación
- `AGENTS.md` nuevo: guía para agentes AI con gotchas y arquitectura
- `API.md` reescrito: 14 endpoints, paginación, sort, filtros, rate limit
- `PROJECT_STRUCTURE.md` actualizado con archivos nuevos
- `README.md` actualizado: auth, 5 tabs, rate limit, credenciales default
- `DESARROLLO.md` ampliado: patrón auth, rate limit, refreshKey, troubleshooting
- `QUICKSTART.md` actualizado: credenciales admin/admin123

---

## [1.0.0] - 2026-04-13

### ✨ Características Iniciales
- Listar libros con búsqueda por título
- Ver detalles de libro con copias y autores
- Listar usuarios con búsqueda
- Ver detalles de usuario con préstamos activos
- Listar préstamos con filtros
- Ver préstamos activos
- Interfaz web responsive
- API REST completa

### 🔧 Stack Técnico
- Next.js 15 (App Router)
- TypeScript 5.0
- MySQL 8.0 + mysql2/promise
- pnpm 9.0
- Estilos CSS Modules

