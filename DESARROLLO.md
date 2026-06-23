# Guía de Desarrollo - Gestión de Biblioteca

## Setup Inicial

### 1. Requisitos

- Node.js 18+ ([descargar](https://nodejs.org))
- pnpm 9.0+ (`npm install -g pnpm`)
- MySQL 8.0+ ([descargar](https://www.mysql.com/downloads/))
- Git
- Visual Studio Code (recomendado)

### 2. Instalación del Proyecto

```bash
# Clonar repositorio (si aplica)
cd /home/ramon/CodigoGithub/Jmf_biblio

# Instalar dependencias con pnpm
pnpm install

# Crear archivo .env.local
cp .env.example .env.local

# Editar .env.local con tus credenciales
nano .env.local
```

### 3. Configuración de MySQL

```bash
# Verificar que MySQL está corriendo
mysql -u root -p

# Crear base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS pmb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Ver estructura de tablas
USE pmb;
DESCRIBE notices;
DESCRIBE exemplaires;
DESCRIBE empr;
DESCRIBE pret;
```

### 4. Iniciar Servidor

```bash
# Servidor de desarrollo
pnpm dev

# Se abrirá en http://localhost:3000
```

---

## Estructura y Patrones

### Estructura de Carpetas

```
/app
  /api                 # Route handlers (API endpoints)
    /books
      route.ts         # GET /api/books
      [id]/route.ts    # GET /api/books/:id
    /users
    /loans
  layout.tsx           # Layout global
  page.tsx             # Página principal
  page.module.css      # Estilos de página
  globals.css          # Estilos globales

/lib
  db.ts                # Conexión MySQL
  types.ts             # Tipos TypeScript
  /repositories        # Lógica de datos
    bookRepository.ts
    userRepository.ts
    loanRepository.ts
    index.ts

/public                # Archivos estáticos

/.vscode               # Configuración VSCode
.env.local             # Variables de entorno (no versionado)
.env.example           # Template variables entorno
```

---

## Crear un Nuevo Endpoint

### Paso 1: Crear el Repository (si necesita BD)

**Archivo: `lib/repositories/newRepository.ts`**

```typescript
import { getDbConnection } from '../db'
import { RowDataPacket } from 'mysql2/promise'

export interface NewItem {
  id: number
  name: string
  // ... otros campos
}

export const newRepository = {
  async getAll(): Promise<NewItem[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query('SELECT * FROM table_name')
    return rows as NewItem[]
  },

  async getById(id: number): Promise<NewItem | null> {
    const conn = await getDbConnection()
    const [rows] = await conn.query('SELECT * FROM table_name WHERE id = ?', [id])
    if ((rows as RowDataPacket[]).length === 0) return null
    return (rows as RowDataPacket[])[0]
  }
}
```

### Paso 2: Exportar en index.ts

**Archivo: `lib/repositories/index.ts`**

```typescript
export { newRepository } from './newRepository'
```

### Paso 3: Crear Route Handler

**Archivo: `app/api/newfeature/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { newRepository } from '@/lib/repositories'

export async function GET(request: NextRequest) {
  try {
    const items = await newRepository.getAll()
    return NextResponse.json({
      success: true,
      data: items,
      count: items.length
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching items' },
      { status: 500 }
    )
  }
}
```

### Paso 4: Usar en Cliente (si es necesario)

```typescript
// En app/page.tsx o en un Client Component
'use client'

const [items, setItems] = useState([])

useEffect(() => {
  fetch('/api/newfeature')
    .then(res => res.json())
    .then(data => setItems(data.data))
}, [])
```

---

## Mejores Prácticas

### 1. Manejo de Errores

```typescript
try {
  // operación
} catch (error) {
  console.error('Error en operación:', error)
  return NextResponse.json(
    { success: false, error: 'Mensaje descriptivo' },
    { status: 500 }
  )
}
```

### 2. Validación de Parámetros

```typescript
const id = parseInt(params.id)
if (isNaN(id)) {
  return NextResponse.json(
    { success: false, error: 'ID inválido' },
    { status: 400 }
  )
}
```

### 3. Tipos TypeScript

```typescript
// Siempre tipificar respuestas
interface ApiResponse<T> {
  success: boolean
  data?: T
  count?: number
  error?: string
}

// Uso
const response: ApiResponse<Book[]> = {
  success: true,
  data: books,
  count: books.length
}
```

### 4. Query Parameterization

```typescript
// ✅ BIEN - Previene SQL Injection
await conn.query('SELECT * FROM users WHERE id = ?', [userId])

// ❌ MAL - Vulnerable
await conn.query(`SELECT * FROM users WHERE id = ${userId}`)
```

### 5. Mutaciones requieren autenticacion

Toda ruta `POST`/`PUT`/`PATCH`/`DELETE` debe empezar con:

```typescript
import { getCurrentSession } from '@/lib/auth'

const session = await getCurrentSession()
if (!session) {
  return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
}
```

`getCurrentSession()` retorna `null` para token ausente/expirado/invalido. Es `async` y usa `await cookies()` — solo valido en route handlers / server components.

### 6. Rate limit en login

`/api/auth/login` aplica 5 fallos / 15 min / IP → 429. La IP se lee de `x-forwarded-for` (primer hop) o `x-real-ip`. Para añadir rate limit a otra ruta:

```typescript
import { authRepository, RATE_LIMIT_CONFIG, getClientIp } from '@/lib/repositories'

const ip = getClientIp(request)
const failures = await authRepository.getRecentFailures(ip, RATE_LIMIT_CONFIG.windowMinutes)
if (failures >= RATE_LIMIT_CONFIG.maxFailures) {
  return NextResponse.json({ success: false, error: '...' }, { status: 429 })
}
// ... validar ...
await authRepository.recordAttempt(ip, false)  // en fallo
await authRepository.clearAttempts(ip)         // en exito
```

Los intentos se persisten en `app_login_attempts` y se purgan >24h automaticamente.

### 7. Refrescar lista despues de mutacion en frontend

El `useEffect` que carga listas no se re-dispara con `setX(prev => ({ ...prev }))` (no cambia dependencias reales). Patron correcto: contador `refreshKey` incluido en `queryDeps`.

```typescript
const [refreshKey, setRefreshKey] = useState(0)

const queryDeps = useMemo(() => ({
  // ... otros deps
  refreshKey
}), [/* ... */, refreshKey])

useEffect(() => { /* load */ }, [session, queryDeps])

const doReturn = async (id: number) => {
  await fetch(`/api/loans/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'return' }) })
  setRefreshKey(k => k + 1)  // fuerza re-fetch
}
```

---

## Debugging

### Console Logging

```typescript
// En API routes
console.log('Búsqueda:', query)
console.error('Error de conexión:', error)

// En Client Components
console.log('Datos cargados:', data)
```

### VSCode Debugging

1. Crear breakpoint (F9)
2. Ejecutar `pnpm dev`
3. Abrir DevTools (F12)
4. Networking tab para ver requests

### Inspeccionar MySQL

```bash
# Conectar a MySQL
mysql -u root -p pmb

# Ver tablas
SHOW TABLES;

# Ver estructura
DESCRIBE notices;

# Ejecutar queries de prueba
SELECT notice_id, tit1, year FROM notices LIMIT 10;
```

---

## Testing

### Test Manual con cURL

```bash
# Endpoint de libros
curl http://localhost:3000/api/books | jq

# Con búsqueda
curl "http://localhost:3000/api/books?q=quijote" | jq

# Endpoint específico
curl http://localhost:3000/api/books/1 | jq
```

### Test en Cliente

```javascript
// Abrir console del navegador (F12) y ejecutar:

fetch('/api/books')
  .then(r => r.json())
  .then(d => console.log(d))

// O con async/await
(async () => {
  const res = await fetch('/api/books/1')
  const data = await res.json()
  console.log(data)
})()
```

---

## Modificar Queries Existentes

### Ejemplo: Agregar filtro a búsqueda de libros

**Archivo: `lib/repositories/bookRepository.ts`**

```typescript
async searchBooks(query: string, year?: number): Promise<Book[]> {
  const conn = await getDbConnection()
  let sql = 'SELECT notice_id, tit1, year, code FROM notices WHERE tit1 LIKE ?'
  const params = [`%${query}%`]

  if (year) {
    sql += ' AND year = ?'
    params.push(year)
  }

  const [rows] = await conn.query(sql, params)
  return rows as Book[]
}
```

---

## Performance

### Optimización de Queries

```typescript
// ❌ Lento - múltiples queries
for (const book of books) {
  const authors = await bookRepository.getAuthorsByBook(book.id)
}

// ✅ Rápido - JOIN
SELECT n.*, a.author_name
FROM notices n
LEFT JOIN responsability r ON r.resp_notice = n.notice_id
LEFT JOIN authors a ON a.author_id = r.resp_author
```

### Caché de Conexiones

La conexión MySQL se reutiliza automáticamente en `lib/db.ts`.

---

## Variables de Entorno

```env
# .env.local
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=pmb
NODE_ENV=development
```

**Nunca** comitear `.env.local` (está en `.gitignore`)

---

## Comandos Útiles

```bash
# Instalar nueva dependencia
pnpm add nombre-paquete

# Instalar como dev dependency
pnpm add -D nombre-paquete

# Actualizar dependencias
pnpm update

# Verificar tipos
pnpm type-check

# Build production
pnpm build

# Ejecutar build
pnpm start

# Linting
pnpm lint
```

---

## Troubleshooting

### "Error: ECONNREFUSED"
- Verificar MySQL está corriendo: `sudo systemctl status mysql`
- Verificar credenciales en `.env.local`

### "Error: ER_NO_REFERENCED_TABLE"
- Verificar que todas las tablas existen
- Revisar nombres de columnas en queries

### "Module not found: @/lib/..."
- Verificar ruta correcta en `tsconfig.json`
- Reinstalar node_modules: `pnpm install`

### Puerto 3000 en uso
```bash
# Matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9

# O usar puerto diferente
PORT=3001 pnpm dev
```

### "Demasiados intentos" / bloqueado por rate limit
```bash
mysql -u root -p pmb -e "TRUNCATE TABLE app_login_attempts;"
```
o para una IP especifica:
```bash
mysql -u root -p pmb -e "DELETE FROM app_login_attempts WHERE ip='TU_IP';"
```

---

## Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [mysql2 GitHub](https://github.com/sidorares/node-mysql2)

---

**Última actualización:** 13 de abril de 2026
