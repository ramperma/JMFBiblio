# 📋 Estructura del Proyecto - Gestión de Biblioteca

Generado el: **22 de junio de 2026**

---

## 🗂️ Árbol de Archivos

```
Jmf_biblio/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts            # POST /api/auth/login
│   │   │   ├── logout/route.ts           # POST /api/auth/logout
│   │   │   └── me/route.ts               # GET  /api/auth/me
│   │   ├── books/
│   │   │   ├── route.ts                  # GET/POST /api/books
│   │   │   ├── [id]/route.ts             # GET/PATCH /api/books/:id
│   │   │   └── copies/route.ts           # GET  /api/books/copies
│   │   ├── users/
│   │   │   ├── route.ts                  # GET/POST /api/users
│   │   │   └── [id]/route.ts             # GET/PATCH /api/users/:id
│   │   ├── loans/
│   │   │   ├── route.ts                  # GET/POST /api/loans
│   │   │   └── [id]/route.ts             # PATCH /api/loans/:id (return/renew)
│   │   ├── config/
│   │   │   ├── settings/route.ts         # GET/PUT /api/config/settings
│   │   │   └── users/
│   │   │       ├── route.ts              # GET/POST /api/config/users
│   │   │       └── [id]/route.ts         # PUT/DELETE /api/config/users/:id
│   │   └── statistics/
│   │       └── route.ts                  # GET /api/statistics
│   ├── layout.tsx                        # Layout global
│   ├── page.tsx                          # Pagina principal (Client Component, 5 tabs)
│   ├── globals.css                       # Estilos globales
│   └── page.module.css                   # Estilos de la pagina
│
├── lib/
│   ├── db.ts                             # Conexion MySQL (singleton)
│   ├── auth.ts                           # Sesiones cookie + hash password
│   ├── types.ts                          # Tipos compartidos (Book, BookCopy, etc.)
│   ├── utils.ts                          # Utilidades (mayormente sin uso en rutas)
│   └── repositories/
│       ├── bookRepository.ts             # Queries de libros
│       ├── userRepository.ts             # Queries de usuarios
│       ├── loanRepository.ts             # Queries de prestamos
│       ├── configRepository.ts           # Settings + users app
│       ├── authRepository.ts             # Rate limit (app_login_attempts)
│       ├── statisticsRepository.ts       # Stats + top-N
│       └── index.ts                      # Re-exporta todos
│
├── .vscode/                              # Configuracion VSCode
├── .env.example                          # Template variables entorno
├── .env.local.example                    # Ejemplo .env.local
├── .eslintrc.json                        # ESLint config (next/core-web-vitals)
├── .gitignore                            # node_modules, .next, .env.local, etc.
├── next.config.ts                        # Next config (reactStrictMode)
├── tsconfig.json                         # TS strict + path alias @/*
├── package.json                          # Deps y scripts (pnpm 9)
│
├── README.md                             # Descripcion general
├── AGENTS.md                             # Guia para agentes OpenCode
├── QUICKSTART.md                         # Guia rapida
├── API.md                                # Documentacion de endpoints
├── DESARROLLO.md                         # Guia para desarrolladores
├── CHANGELOG.md                          # Historial de versiones
├── PROJECT_STRUCTURE.md                  # Este archivo
└── check-requirements.sh                 # Verificacion de requisitos
```

---

## 📊 Estadisticas del Proyecto

| Metrica | Valor |
|---------|-------|
| Rutas API | 14 (route.ts) |
| Repositorios | 6 |
| Tipos TypeScript | 25+ |
| Tablas app_* auto-creadas | 5 (`app_users`, `app_settings`, `app_book_state`, `app_user_state`, `app_login_attempts`) |

---

## 🔌 API Endpoints

### Auth (publico o mutacion)
```
POST   /api/auth/login           → Iniciar sesion (publico, rate-limited)
POST   /api/auth/logout          → Cerrar sesion
GET    /api/auth/me              → Sesion actual
```

### Books (GET publico, mutacion auth)
```
GET    /api/books                → Listar paginado
POST   /api/books                → Crear (auth)
GET    /api/books/:id            → Detalle + copias + autores
PATCH  /api/books/:id            → Actualizar (auth)
GET    /api/books/copies         → Copias disponibles
```

### Users (GET publico, mutacion auth)
```
GET    /api/users                → Listar paginado
POST   /api/users                → Crear PMB (auth)
GET    /api/users/:id            → Detalle + prestamos activos
PATCH  /api/users/:id            → Actualizar (auth)
```

### Loans (GET publico, mutacion auth)
```
GET    /api/loans                → Listar paginado con filtros
POST   /api/loans                → Crear prestamo (auth)
PATCH  /api/loans/:id            → return | renew (auth)
```

### Config (GET publico, mutacion auth)
```
GET    /api/config/settings      → Leer settings
PUT    /api/config/settings      → Actualizar (auth)
GET    /api/config/users         → Listar usuarios app
POST   /api/config/users         → Crear usuario app (auth)
PUT    /api/config/users/:id     → Actualizar (auth)
DELETE /api/config/users/:id     → Borrar (auth)
```

### Statistics (auth)
```
GET    /api/statistics           → Totales + top 5 libros + top 5 usuarios
```

---

## 🗄️ Base de Datos

### Tablas PMB (legacy, no modificar estructura)
```
notices           (libros)
├─ notice_id (PK)
├─ tit1 (titulo)
├─ year (ano)
└─ code (codigo)

exemplaires       (copias)
├─ expl_id (PK)
├─ expl_notice (FK -> notices)
├─ expl_statut (estado)
└─ expl_cb (codigo barras)

empr              (usuarios)
├─ id_empr (PK)
├─ empr_nom (apellido)
├─ empr_prenom (nombre)
├─ empr_cb (codigo barras)
├─ empr_mail
└─ empr_tel1

pret              (prestamos activos)
├─ pret_idexpl (PK)        ← pret_id == pret_idexpl
├─ pret_idempr (FK -> empr)
├─ pret_date (datetime)
├─ pret_retour (date, devolucion prevista)
├─ pret_arc_id (0=activo, >0=archivado)
└─ cpt_prolongation (renovaciones)

authors           (autores)
└─ author_id, author_name

responsability    (autor-libro)
└─ resp_id, resp_notice, resp_author, resp_type
```

### Tablas app_* (auto-creadas en primer uso del repo)
```
app_users                  → login accounts
app_settings               → key/value config
app_book_state             → soft-delete libros (is_active)
app_user_state             → soft-delete usuarios (is_active)
app_login_attempts         → rate-limit log (IP + success + timestamp)
```

---

## 🔧 Dependencias

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "mysql2": "^3.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## 🚀 Scripts

```bash
pnpm install       # Instalar dependencias
pnpm dev           # Iniciar desarrollo
pnpm build         # Compilar para produccion
pnpm start         # Iniciar en produccion
pnpm lint          # Ejecutar linter
pnpm type-check    # Verificar tipos TypeScript
bash check-requirements.sh  # Sanity check
```

---

## ✨ Funcionalidades Implementadas

- [x] Login con cookie + rate limit (5/15min/IP)
- [x] Listar/buscar libros con paginacion y sort
- [x] Crear/editar libros (soft-delete via is_active)
- [x] Listar/buscar usuarios PMB
- [x] Crear/editar usuarios PMB
- [x] Listar prestamos con filtros (activo, usuario, fechas, titulo, deudor)
- [x] Crear prestamos con validacion de ejemplar y usuario
- [x] Devolver prestamo (DELETE FROM pret segun convencion PMB)
- [x] Renovar prestamo (hasta max_renewals)
- [x] CRUD de usuarios de la app (login accounts)
- [x] Settings (max_loan_days, max_renewals, fine_per_day, allow_weekend_loans)
- [x] Estadisticas con top-5 libros y usuarios
- [x] UI con 5 tabs: Libros, Usuarios, Prestamos, Configuracion, Estadisticas
- [x] TypeScript strict, sin UnusedLocals/Parameters
- [x] ESLint via eslint-config-next
- [x] Documentacion completa

---

## 📞 Soporte

Si encontraste un problema:

1. Revisa [DESARROLLO.md](DESARROLLO.md) - Troubleshooting
2. Revisa [README.md](README.md) - Configuracion
3. Ejecuta: `bash check-requirements.sh`

---

**Estado:** ✅ Listo para usar
**Version:** 1.1.0
**Fecha:** 22 de junio de 2026
**Mantenedor:** Equipo de Desarrollo
