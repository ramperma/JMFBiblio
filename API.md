# API Documentation - Gestión de Biblioteca

## Descripción General

API REST para gestión de biblioteca con endpoints para autenticación, libros, usuarios, préstamos, configuración y estadísticas. Las mutaciones (`POST`, `PUT`, `PATCH`, `DELETE`) requieren sesión activa excepto el login.

## Base URL

```
http://localhost:3000/api
```

## Autenticación

La API usa sesión por cookie HTTP-only (`jmf_biblio_session`, 8h TTL). Para mutaciones enviar la cookie. **Rate limit**: 5 intentos de login fallidos / 15 min / IP → `429`.

| Código | Significado |
|---------|------------|
| `200` | Éxito |
| `400` | Solicitud inválida (parámetros o body incorrectos) |
| `401` | No autenticado (mutación) o credenciales inválidas (login) |
| `404` | Recurso no encontrado |
| `429` | Rate limit excedido (login) |
| `500` | Error interno del servidor |

## Estructura de Respuesta

Todas las respuestas siguen esta envoltura:

```json
{
  "success": true,
  "data": ...,
  "count": 0,
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 }
}
```

Errores:
```json
{ "success": false, "error": "Mensaje en espanol" }
```

---

## 🔐 Autenticación (`/auth`)

### `POST /auth/login`
Inicia sesión. Setea cookie de sesión. **Sin auth requerida.**

Body: `{ "username": string, "password": string }`

Respuestas:
- `200` — `{ success: true, data: { id, username, role } }` + cookie
- `400` — Falta usuario o contraseña
- `401` — Credenciales inválidas
- `429` — Demasiados intentos (5/15min/IP)

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### `POST /auth/logout`
Cierra sesión. Limpia cookie.

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

### `GET /auth/me`
Devuelve la sesión actual o 401.

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

---

## 📚 Libros (`/books`)

### `GET /books`
Lista libros paginados. **Público.**

Query params:
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `q` | string | — | Búsqueda por título (LIKE %q%) |
| `page` | int (≥1) | 1 | Página |
| `pageSize` | int (1–200) | 20 | Tamaño de página |
| `sortBy` | enum | `tit1` | `notice_id` \| `tit1` \| `year` \| `code` |
| `sortDir` | enum | `asc` | `asc` \| `desc` |
| `includeInactive` | bool | `false` | Incluir libros con `is_active=0` (soft-delete) |

```bash
curl "http://localhost:3000/api/books?q=quijote&page=1&pageSize=20"
```

### `GET /books/{id}`
Detalle de libro + copias + autores. **Público.**

```bash
curl http://localhost:3000/api/books/1
```

### `POST /books` — **Requiere auth**
Crea libro. Body: `{ tit1, year?, code? }` (`tit1` mínimo 2 chars).

### `PATCH /books/{id}` — **Requiere auth**
Actualiza libro. Body parcial: `{ tit1?, year?, code?, is_active? }`.

### `GET /books/copies?q={search}`
Lista copias disponibles (no prestadas). **Público.** Usado en el form de nuevo préstamo.

```bash
curl "http://localhost:3000/api/books/copies?q=quijote"
```

---

## 👥 Usuarios (`/users`)

### `GET /users?q={search}&page={n}&pageSize={n}&sortBy={field}&sortDir={asc|desc}&includeInactive={bool}`
Lista usuarios paginados. **Público.**

`sortBy`: `id_empr` | `empr_cb` | `empr_nom` | `empr_prenom` | `empr_mail` | `empr_tel1`.

### `GET /users/{id}`
Detalle de usuario + préstamos activos. **Público.**

### `POST /users` — **Requiere auth**
Crea usuario PMB. Body: `{ empr_nom, empr_prenom?, empr_cb?, empr_mail?, empr_tel1? }`.

### `PATCH /users/{id}` — **Requiere auth**
Actualiza usuario PMB. Body parcial.

---

## 📖 Préstamos (`/loans`)

### `GET /loans`
Lista préstamos paginados con filtros. **Público.**

Query params:
| Param | Tipo | Descripción |
|-------|------|-------------|
| `activeOnly` | bool | Solo préstamos activos (no archivados, `pret_arc_id=0`) |
| `userId` | int | Filtrar por usuario (`id_empr`) |
| `borrower` | string | LIKE por nombre o apellido |
| `book` | string | LIKE por título |
| `dateFrom` | date (YYYY-MM-DD) | `pret_date >= ?` |
| `dateTo` | date (YYYY-MM-DD) | `pret_date <= ?` |
| `page`, `pageSize`, `sortBy`, `sortDir` | estándar | ver arriba |

`sortBy`: `pret_id` | `pret_date` | `pret_retour` | `tit1` | `empr_nom`.

```bash
curl "http://localhost:3000/api/loans?activeOnly=true&userId=1"
```

### `POST /loans` — **Requiere auth**
Crea préstamo. Body: `{ expl_cb, id_empr }`. Usa `max_loan_days` de settings para calcular `pret_retour`. Valida que el ejemplar no esté prestado y el usuario exista.

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/loans \
  -H "Content-Type: application/json" \
  -d '{"expl_cb":"CODIGO-001","id_empr":42}'
```

### `PATCH /loans/{id}` — **Requiere auth**
Acciones sobre préstamo. Body: `{ action: "return" | "renew" }`.

- `return` — Marca el préstamo como devuelto (convención PMB: `DELETE FROM pret`).
- `renew` — Extiende `pret_retour` según `max_loan_days`, incrementa `cpt_prolongation` hasta `max_renewals`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/loans/4201 \
  -H "Content-Type: application/json" \
  -d '{"action":"return"}'
```

---

## ⚙️ Configuración (`/config`)

### `GET /config/settings`
Lee `app_settings` (max_loan_days, max_renewals, fine_per_day, allow_weekend_loans). **Público.**

### `PUT /config/settings` — **Requiere auth**
Actualiza settings. Body: `[{ key_name, key_value }, ...]`.

### `GET /config/users?page={n}&pageSize={n}`
Lista usuarios de la app (login accounts, no PMB). **Público.**

### `POST /config/users` — **Requiere auth**
Crea usuario de la app. Body: `{ username, password, role: "admin" | "staff" }`.

### `PUT /config/users/{id}` — **Requiere auth**
Actualiza usuario de la app. Body parcial: `{ username?, password?, role? }`.

### `DELETE /config/users/{id}` — **Requiere auth**
Borra usuario de la app.

---

## 📊 Estadísticas (`/statistics`)

### `GET /statistics` — **Requiere auth**

Devuelve en una sola llamada:
- `stats`: totales (`totalBooks`, `totalCopies`, `totalUsers`, `activeLoans`, `overdueLoans`).
- `topBooks`: top 5 libros más prestados en los últimos 12 meses.
- `topBorrowers`: top 5 usuarios con más préstamos activos.

```bash
curl -b cookies.txt http://localhost:3000/api/statistics
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "stats": { "totalBooks": 7140, "totalCopies": 8921, "totalUsers": 668, "activeLoans": 1, "overdueLoans": 0 },
    "topBooks": [{ "notice_id": 6521, "tit1": "Intriga en Venecia", "loan_count": 2 }],
    "topBorrowers": [{ "id_empr": 39, "empr_nom": "ORELLANA BUCETA", "empr_prenom": "ARIANA B.", "active_loan_count": 1 }]
  }
}
```

---

## Tipos de Datos

```typescript
interface Book {
  notice_id: number
  tit1: string
  year?: number | string
  code: string
  is_active?: boolean
}

interface BookDetail extends Book {
  authors?: string[]
  copies?: BookCopy[]
}

interface BookCopy {
  expl_id: number
  expl_statut: string
  expl_notice?: number
  expl_cb?: string  // presente en /books/copies, no en type lib
}

interface User {
  id_empr: number
  empr_nom: string
  empr_prenom?: string
  empr_cb?: string
  empr_mail?: string
  empr_tel1?: string
  is_active?: boolean
}

interface Loan {
  pret_id: number        // == pret_idexpl (PK de pret)
  pret_date: string      // ISO 8601
  pret_retour?: string   // fecha prevista devolucion (YYYY-MM-DD)
  pret_idexpl: number
  pret_idempr: number
  cpt_prolongation: number
  tit1: string           // titulo del libro
  empr_nom: string
  empr_prenom?: string
  expl_id: number
  expl_cb?: string
}

interface AppUser {  // login account (no PMB)
  id: number
  username: string
  role: 'admin' | 'staff'
  created_at: string
}

interface AppSetting {
  key_name: string
  key_value: string
  description: string
}
```

## Notas

- Todas las fechas en formato ISO 8601.
- Límites por defecto: `pageSize=20`, máximo 200.
- Conexión MySQL reusada (singleton en `lib/db.ts`).
- La convención PMB para "devolver" un préstamo es borrar la fila de `pret` (cada `pret_idexpl` solo tiene 1 fila activa a la vez, sin histórico en `pret`).
- Las búsquedas `LIKE` envuelven el input en `%...%` dentro del repositorio.
- `pret_arc_id=0` indica préstamo activo; cualquier valor > 0 indica archivado/devuelto.

---

**Última actualización:** 22 de junio de 2026
