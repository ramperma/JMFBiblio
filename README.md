# 📚 Gestión de Biblioteca

Sistema de gestión de biblioteca web para centros educativos, construido con Next.js 15 (App Router), TypeScript y MySQL (PMB).

## Características

- ✅ Autenticación con cookie de sesión + rate limit (5/15min/IP)
- ✅ CRUD de libros con soft-delete y paginación
- ✅ CRUD de usuarios PMB
- ✅ Crear, devolver y renovar préstamos
- ✅ Filtros avanzados en préstamos (activo, usuario, fechas, libro, deudor)
- ✅ Estadísticas: totales + top 5 libros más prestados + top 5 usuarios
- ✅ Configuración dinámica (max_loan_days, max_renewals, multas)
- ✅ Gestión de usuarios administradores
- ✅ API REST completa con route handlers
- ✅ MySQL con mysql2/promise (singleton)
- ✅ TypeScript estricto
- ✅ Interfaz responsive con 5 tabs

## Requisitos Previos

- Node.js 18+
- pnpm 9.0+
- MySQL 8.0+ con base de datos PMB existente

## Instalación

### 1. Clonar e instalar dependencias

```bash
cd /home/ramon/CodigoGithub/Jmf_biblio
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=pmb
NODE_ENV=development
SESSION_SECRET=un_secreto_largo_y_aleatorio
APP_ADMIN_USER=admin
APP_ADMIN_PASSWORD=admin123
```

> En el primer arranque se crea un usuario admin con `APP_ADMIN_USER` / `APP_ADMIN_PASSWORD` (por defecto `admin` / `admin123`) si `app_users` está vacía.

### 3. Iniciar servidor

```bash
pnpm dev
```

Abre `http://localhost:3000` y entra con `admin` / `admin123`.

## Estructura del Proyecto

```
├── app/
│   ├── api/                 # Route handlers REST (auth, books, users, loans, config, statistics)
│   ├── page.tsx             # Pagina principal (Client Component con 5 tabs)
│   ├── layout.tsx           # Layout global
│   └── *.css                # Estilos
├── lib/
│   ├── db.ts                # Conexion MySQL singleton
│   ├── auth.ts              # Sesiones cookie + hash SHA-256
│   ├── types.ts             # Tipos compartidos
│   └── repositories/        # Capa de datos (un objeto por entidad)
│       ├── bookRepository.ts
│       ├── userRepository.ts
│       ├── loanRepository.ts
│       ├── configRepository.ts
│       ├── authRepository.ts        # Rate limit
│       ├── statisticsRepository.ts
│       └── index.ts
├── .env.example
├── package.json
├── tsconfig.json
└── next.config.ts
```

Ver `PROJECT_STRUCTURE.md` para el detalle completo y `AGENTS.md` para notas de arquitectura relevantes para agentes AI.

## Endpoints API (resumen)

| Recurso | Endpoints |
|---------|-----------|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Books | `GET/POST /books`, `GET/PATCH /books/:id`, `GET /books/copies` |
| Users | `GET/POST /users`, `GET/PATCH /users/:id` |
| Loans | `GET/POST /loans`, `PATCH /loans/:id` (action: return/renew) |
| Config | `GET/PUT /config/settings`, `GET/POST /config/users`, `PUT/DELETE /config/users/:id` |
| Statistics | `GET /statistics` |

Las mutaciones (`POST`, `PUT`, `PATCH`, `DELETE`) requieren sesión activa (cookie `jmf_biblio_session`, 8h TTL).

Documentación completa de cada endpoint en `API.md`.

## Autenticación

- Cookie HTTP-only `jmf_biblio_session` (8h TTL), firmada con HMAC-SHA256.
- Passwords hasheados con SHA-256 (sin salt).
- Rate limit: 5 intentos de login fallidos por IP cada 15 minutos → 429.
- Usuario admin por defecto: `admin` / `admin123` (cambiar en producción).

## Esquema de Base de Datos

La app espera una BD MySQL con esquema PMB existente:

```sql
notices (notice_id, tit1, year, code)         -- libros
exemplaires (expl_id, expl_notice, expl_statut, expl_cb)  -- copias
empr (id_empr, empr_nom, empr_prenom, empr_cb, empr_mail, empr_tel1)  -- usuarios
pret (pret_idexpl PK, pret_idempr, pret_date, pret_retour, pret_arc_id, cpt_prolongation)  -- prestamos activos
authors (author_id, author_name)
responsability (resp_id, resp_notice, resp_author, resp_type)
```

Las tablas `app_*` (users, settings, book_state, user_state, login_attempts) se crean automáticamente en el primer uso del repositorio correspondiente. El usuario MySQL necesita permiso `CREATE TABLE`.

**Convención PMB para devolución:** la fila de `pret` se borra (no se marca fecha). Cada `pret_idexpl` tiene 1 fila activa a la vez. La tabla `pret` no preserva histórico de devoluciones.

## Comandos

```bash
pnpm install        # Instalar dependencias
pnpm dev            # Servidor de desarrollo en :3000
pnpm build          # Build de produccion
pnpm start          # Servidor de produccion
pnpm lint           # ESLint
pnpm type-check     # tsc --noEmit
bash check-requirements.sh  # Sanity check de requisitos
```

## Documentación adicional

- `API.md` — Contrato completo de endpoints con query params y respuestas
- `DESARROLLO.md` — Patrones de desarrollo y troubleshooting
- `PROJECT_STRUCTURE.md` — Arbol completo del proyecto
- `AGENTS.md` — Notas para agentes AI (setup, gotchas, arquitectura)
- `CHANGELOG.md` — Historial de versiones

## Licencia

MIT

---

**Stack:** Next.js 15 · React 19 · TypeScript 5 · MySQL 8 · pnpm 9
**Fecha de creacion:** 13 de abril de 2026
**Ultima actualizacion:** 22 de junio de 2026
