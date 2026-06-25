# Guía de Despliegue en VPS con Virtualmin + Apache

> **App:** JMF Biblio — Next.js 15 + MySQL (PMB)
> **Entorno:** VPS Linux (Debian/Ubuntu), Virtualmin, Apache, Node.js 18+

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Preparar la base de datos MySQL](#2-preparar-la-base-de-datos-mysql)
3. [Clonar el repositorio e instalar dependencias](#3-clonar-el-repositorio-e-instalar-dependencias)
4. [Configurar variables de entorno](#4-configurar-variables-de-entorno)
5. [Compilar la aplicación para producción](#5-compilar-la-aplicación-para-producción)
6. [Configurar PM2 para gestión de procesos](#6-configurar-pm2-para-gestión-de-procesos)
7. [Configurar Apache como proxy inverso](#7-configurar-apache-como-proxy-inverso)
8. [Configurar SSL con Let's Encrypt (Virtualmin)](#8-configurar-ssl-con-lets-encrypt-virtualmin)
9. [Configurar backups automáticos](#9-configurar-backups-automáticos)
10. [Primer inicio y verificación](#10-primer-inicio-y-verificación)
11. [Mantenimiento](#11-mantenimiento)
12. [Solución de problemas](#12-solución-de-problemas)

---

## 1. Requisitos previos

### 1.1 Verificar Node.js

```bash
node --version
# Debe mostrar v18.x o superior
```

Si no está instalado o la versión es anterior a 18:

```bash
# Opcion A: usando nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20

# Opcion B: usando el repositorio oficial de NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### 1.2 Verificar pnpm

```bash
pnpm --version
# Debe mostrar 9.x
```

Si no está instalado:

```bash
npm install -g pnpm
```

### 1.3 Verificar MySQL

```bash
mysql --version
# Debe mostrar mysql 8.x
```

### 1.4 Verificar Apache y módulos necesarios

```bash
apache2 -v
a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers
systemctl restart apache2
```

### 1.5 Verificar herramientas de backup (mysqldump, mysql)

```bash
which mysqldump
which mysql
# Si faltan:
apt-get install default-mysql-client
```

### 1.6 Instalar PM2 (gestor de procesos)

```bash
npm install -g pm2
```

---

## 2. Preparar la base de datos MySQL

### 2.1 Crear la base de datos (si no existe)

Conéctate a MySQL y crea la base de datos:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE IF NOT EXISTS pmb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 Crear usuario MySQL para la app

```sql
CREATE USER 'jmf_biblio'@'localhost' IDENTIFIED BY 'contraseña_segura_aqui';
GRANT ALL PRIVILEGES ON pmb.* TO 'jmf_biblio'@'localhost';
FLUSH PRIVILEGES;
```

> **Permisos necesarios:** El usuario necesita `CREATE TABLE`, `DROP TABLE`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` en `pmb.*`. Las tablas `app_*` se crean automáticamente al primer uso.

### 2.3 Importar datos PMB existentes (opcional)

Si tienes una copia de la base de datos PMB (archivo `.sql` o `.sav`):

```bash
# Si es un mysqldump .sql:
mysql -u jmf_biblio -p pmb < respaldo_pmb.sql

# Si es un archivo .sav, puedes importarlo desde la interfaz web
# una vez la app esté funcionando (Configuracion > Mantenimiento BD > Importar)
```

### 2.4 Verificar las tablas PMB

```bash
mysql -u jmf_biblio -p pmb -e "SHOW TABLES;"
```

Las tablas esperadas son:
- `notices` (libros)
- `exemplaires` (copias)
- `empr` (usuarios/alumnos)
- `pret` (préstamos activos)
- `authors` (autores)
- `responsability` (relación autor-libro)
- `groupe` (grupos de alumnos) — opcional
- `empr_groupe` (alumnos por grupo) — opcional

---

## 3. Clonar el repositorio e instalar dependencias

### 3.1 Elegir ubicación

Virtualmin suele usar `/home/<dominio>/public_html`. La app Next.js NO debe estar en `public_html` porque Apache no la servirá directamente (se sirve a través del proxy inverso). Ubicación recomendada:

```bash
mkdir -p /home/<dominio>/apps
cd /home/<dominio>/apps
```

### 3.2 Clonar el repositorio

```bash
git clone https://github.com/ramperma/JMFBiblio.git jmf-biblio
cd jmf-biblio
```

### 3.3 Instalar dependencias

```bash
pnpm install
```

Esto instala Next.js, React, TypeScript, mysql2 y las dependencias de desarrollo.

---

## 4. Configurar variables de entorno

### 4.1 Crear archivo .env.local

```bash
cp .env.example .env.local
nano .env.local
```

### 4.2 Configuración completa

```env
# MySQL Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=jmf_biblio
DATABASE_PASSWORD=contraseña_segura_aqui
DATABASE_NAME=pmb

# Node Environment (SIEMPRE production en VPS)
NODE_ENV=production

# Auth and config users
SESSION_SECRET=genera_un_secreto_muy_largo_aqui_con_caracteres_aleatorios_12345
APP_ADMIN_USER=admin
APP_ADMIN_PASSWORD=cambia_esta_contraseña_urgente

# Backup storage (directorio donde se guardarán las copias de seguridad)
# Debe ser una ruta ABSOLUTA y escribible por el usuario de Node
PMB_BACKUP_DIR=/home/<dominio>/backups/jmf-biblio
```

### 4.3 Generar SESSION_SECRET seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copia el resultado y úsalo como SESSION_SECRET
```

### 4.4 Crear directorio de backups

```bash
mkdir -p /home/<dominio>/backups/jmf-biblio
chmod 750 /home/<dominio>/backups/jmf-biblio
```

### 4.5 Proteger el .env.local

```bash
chmod 600 .env.local
```

---

## 5. Compilar la aplicación para producción

```bash
cd /home/<dominio>/apps/jmf-biblio
pnpm build
```

Esto genera la carpeta `.next/` con los archivos estáticos optimizados. La compilación produce:
- Páginas estáticas generadas (SSG)
- Bundles de JavaScript minificados
- Archivos CSS optimizados

> **Errores comunes en build:** Si falla por tipos, ejecuta `pnpm type-check` para ver los errores exactos. Si falla por ESLint, ejecuta `pnpm lint` para ver las advertencias.

---

## 6. Configurar PM2 para gestión de procesos

### 6.1 Crear archivo de configuración de PM2

Crea `/home/<dominio>/apps/jmf-biblio/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'jmf-biblio',
    cwd: '/home/<dominio>/apps/jmf-biblio',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    },
    // Recomendado para VPS con 1-2 GB RAM:
    max_memory_restart: '500M',
    // Logs:
    error_file: '/home/<dominio>/logs/jmf-biblio/error.log',
    out_file: '/home/<dominio>/logs/jmf-biblio/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // Reinicio automático:
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000
  }]
}
```

### 6.2 Crear directorio de logs

```bash
mkdir -p /home/<dominio>/logs/jmf-biblio
```

### 6.3 Iniciar la aplicación con PM2

```bash
cd /home/<dominio>/apps/jmf-biblio
pm2 start ecosystem.config.cjs
```

### 6.4 Verificar que funciona

```bash
pm2 status
# Debe mostrar jmf-biblio como "online"
```

### 6.5 Probar localmente

```bash
curl http://localhost:3000/api/books
# Debe devolver JSON con la lista de libros (o array vacio si no hay datos)
```

### 6.6 Configurar PM2 para inicio automático al reiniciar el servidor

```bash
pm2 startup systemd
# Ejecuta el comando que PM2 te muestre (similar a:)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u <tu_usuario> --hp /home/<tu_usuario>

pm2 save
```

---

## 7. Configurar Apache como proxy inverso

### 7.1 Habilitar módulos necesarios

```bash
a2enmod proxy proxy_http proxy_wstunnel headers rewrite
systemctl restart apache2
```

### 7.2 Configurar Virtual Host en Virtualmin

Desde Virtualmin (interfaz web):
1. Ir a **Servicios → Apache Website → Editar Directivas**
2. Agregar configuración personalizada

O directamente editar el archivo de configuración:

```bash
nano /etc/apache2/sites-available/<dominio>.conf
```

### 7.3 Configuración del Virtual Host

Dentro del `<VirtualHost *:80>` (y también dentro del `*:443` si ya tienes SSL), añade:

```apache
# Configuración del VirtualHost existente de Virtualmin (no tocar lo demás)

# Proxy inverso a Next.js
<Location />
    # Pasar solicitudes a Next.js (puerto 3000)
    ProxyPass http://localhost:3000/
    ProxyPassReverse http://localhost:3000/

    # Cabeceras necesarias para Next.js
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https" env=HTTPS
    RequestHeader set X-Forwarded-Port "443" env=HTTPS

    # Tiempo de espera (importante para operaciones lentas como importar .sav)
    ProxyTimeout 300
</Location>

# WebSocket (para HMR en desarrollo, no necesario en producción pero no duele)
<Location /_next/webpack-hmr>
    ProxyPass ws://localhost:3000/_next/webpack-hmr
    ProxyPassReverse ws://localhost:3000/_next/webpack-hmr
</Location>

# Excluir archivos estáticos de Virtualmin si usas Virtualmin
# (no necesario realmente, el proxy lo maneja todo)
```

### 7.4 Configuración completa (ejemplo real)

```apache
<VirtualHost *:80>
    ServerName biblioteca.tudominio.com
    ServerAlias www.biblioteca.tudominio.com
    
    # Configuración estándar de Virtualmin (la mantienes)
    DocumentRoot /home/biblioteca/public_html
    SuexecUserGroup biblioteca biblioteca
    
    # ... resto de config de Virtualmin ...
    
    # --- AÑADIR AL FINAL ---
    
    # Proxy inverso a Next.js
    <Location />
        ProxyPass http://localhost:3000/
        ProxyPassReverse http://localhost:3000/
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-Proto "http"
        ProxyTimeout 300
    </Location>
</VirtualHost>
```

### 7.5 Verificar sintaxis y recargar

```bash
apache2ctl configtest
systemctl reload apache2
```

### 7.6 Probar desde el navegador

Abre `http://biblioteca.tudominio.com` — deberías ver la interfaz de JMF Biblio.

---

## 8. Configurar SSL con Let's Encrypt (Virtualmin)

### 8.1 Desde Virtualmin (recomendado)

1. Ir a **Servicios → Apache Website → Habilitar SSL**
2. Seleccionar **Let's Encrypt**
3. Introducir email
4. Marcar "Renovar automáticamente"
5. Guardar

### 8.2 Añadir proxy inverso al VirtualHost SSL

Virtualmin crea un archivo separado para HTTPS. Edítalo:

```bash
nano /etc/apache2/sites-available/<dominio>-ssl.conf
```

Dentro del `<VirtualHost *:443>`, AÑADE la configuración del proxy (la misma que en el paso 7.3):

```apache
<VirtualHost *:443>
    ServerName biblioteca.tudominio.com
    
    # ... config existente de Virtualmin ...
    SSLEngine on
    SSLCertificateFile /etc/ssl/...  # Virtualmin lo gestiona
    
    # --- AÑADIR ---
    
    <Location />
        ProxyPass http://localhost:3000/
        ProxyPassReverse http://localhost:3000/
        ProxyPreserveHost On
        RequestHeader set X-Forwarded-Proto "https"
        RequestHeader set X-Forwarded-Port "443"
        ProxyTimeout 300
    </Location>
    
    <Location /_next/webpack-hmr>
        ProxyPass ws://localhost:3000/_next/webpack-hmr
        ProxyPassReverse ws://localhost:3000/_next/webpack-hmr
    </Location>
</VirtualHost>
```

### 8.3 Recargar Apache

```bash
apache2ctl configtest
systemctl reload apache2
```

### 8.4 Redirección HTTP → HTTPS (opcional)

Si quieres que todo el tráfico HTTP vaya a HTTPS, añade en el VirtualHost del puerto 80:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
```

Virtualmin suele gestionar esto automáticamente en **Servicios → Apache Website → Redirecciones**.

---

## 9. Configurar backups automáticos

### 9.1 Script de backup de la base de datos

Crea `/home/<dominio>/apps/jmf-biblio/scripts/backup-db.sh`:

```bash
#!/bin/bash
# Backup automatico de la BD PMB via mysqldump

BACKUP_DIR="/home/<dominio>/backups/jmf-biblio"
DB_USER="jmf_biblio"
DB_PASS="contraseña_segura_aqui"
DB_NAME="pmb"
DATE=$(date +%Y%m%d%H%M%S)

mkdir -p "$BACKUP_DIR"

mysqldump --single-transaction --routines --triggers \
  -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/automated-backup-$DATE.sql.gz"

# Eliminar backups de más de 30 días
find "$BACKUP_DIR" -name "automated-backup-*.sql.gz" -mtime +30 -delete
```

Hacerlo ejecutable:

```bash
chmod +x /home/<dominio>/apps/jmf-biblio/scripts/backup-db.sh
```

### 9.2 Programar en cron

```bash
crontab -e
```

Añadir:

```cron
# Backup de BD todos los dias a las 3:00 AM
0 3 * * * /home/<dominio>/apps/jmf-biblio/scripts/backup-db.sh >> /home/<dominio>/logs/jmf-biblio/cron-backup.log 2>&1
```

### 9.3 También desde la interfaz web

La app incluye un sistema de backup en **Configuración → Mantenimiento BD** que:
- Crea backups completos (mysqldump comprimido)
- Lista, descarga y elimina backups
- Importa archivos .sav y .sql
- Reinicia la base de datos (RESTAURATIVO — requiere confirmación triple)

---

## 10. Primer inicio y verificación

### 10.1 Verificar que la app corre

```bash
pm2 status
curl -s http://localhost:3000/api/auth/me | head -c 200
# Debe devolver algo como: {"success":true,"data":{"id":1,"username":"admin","role":"admin"}}
```

O si no hay sesión:

```bash
curl -s http://localhost:3000/api/books | head -c 300
# Debe devolver JSON con libros paginados
```

### 10.2 Login desde el navegador

1. Abre `https://biblioteca.tudominio.com`
2. Login con:
   - Usuario: `admin` (o el que pusiste en `APP_ADMIN_USER`)
   - Contraseña: la que pusiste en `APP_ADMIN_PASSWORD`

### 10.3 Verificar funcionalidades clave

- [ ] Página de login funciona
- [ ] Lista de libros carga correctamente
- [ ] Lista de usuarios carga correctamente
- [ ] Préstamos se muestran
- [ ] Configuración accesible (solo admin)
- [ ] Estadísticas cargan
- [ ] Crear backup funciona

### 10.4 Cambiar contraseña del admin

1. Ve a **Configuración → Usuarios**
2. Encuentra al usuario `admin`
3. Cambia su contraseña

---

## 11. Mantenimiento

### 11.1 Actualizar la aplicación

```bash
cd /home/<dominio>/apps/jmf-biblio

# Guardar respaldo del .env.local
cp .env.local .env.local.backup

# Traer cambios del repositorio
git pull origin main

# Reinstalar dependencias (por si cambiaron)
pnpm install

# Recompilar
pnpm build

# Reiniciar servicio
pm2 restart jmf-biblio
```

### 11.2 Ver logs

```bash
# Logs de PM2
pm2 logs jmf-biblio

# Logs de Apache
tail -f /var/log/apache2/error.log

# Logs de la app
tail -f /home/<dominio>/logs/jmf-biblio/error.log
tail -f /home/<dominio>/logs/jmf-biblio/out.log
```

### 11.3 Monitorear recursos

```bash
# Uso de memoria de la app Node
pm2 monit

# Uso general del sistema
htop
```

### 11.4 Comandos útiles de PM2

```bash
pm2 status                    # Estado de todos los procesos
pm2 restart jmf-biblio        # Reiniciar la app
pm2 stop jmf-biblio           # Detener la app
pm2 delete jmf-biblio         # Eliminar del registro
pm2 logs jmf-biblio           # Ver logs en tiempo real
pm2 save                      # Guardar estado actual para startup
pm2 startup                   # Configurar inicio automatico
```

### 11.5 Renovación de SSL

Virtualmin con Let's Encrypt renueva automáticamente. Para verificar:

```bash
certbot renew --dry-run
```

Si se usa Virtualmin, no es necesario hacer nada manual.

---

## 12. Solución de problemas

### 12.1 Error 503 / 502 Bad Gateway (Apache no conecta con Next.js)

```bash
# Verificar que Next.js está corriendo
pm2 status

# Verificar puerto
curl http://localhost:3000/api/books

# Si no responde, reiniciar
pm2 restart jmf-biblio

# Verificar logs
pm2 logs jmf-biblio --lines 20
```

### 12.2 Error "ECONNREFUSED" (MySQL no accesible)

```bash
# Verificar MySQL
systemctl status mysql

# Verificar credenciales
mysql -u jmf_biblio -p pmb -e "SELECT 1"

# Comprobar .env.local
cat /home/<dominio>/apps/jmf-biblio/.env.local | grep DATABASE
```

### 12.3 Error 504 Gateway Timeout (operación muy lenta)

Las operaciones de importación de `.sav` grandes pueden superar el timeout por defecto de Apache.

Solución: aumentar `ProxyTimeout` en la configuración del VirtualHost:

```apache
ProxyTimeout 600   # 10 minutos
```

Luego recargar Apache: `systemctl reload apache2`

### 12.4 "Demasiados intentos" / rate limit (429)

Si te bloqueas por intentos fallidos de login:

```bash
mysql -u jmf_biblio -p pmb -e "TRUNCATE TABLE app_login_attempts;"
```

### 12.5 Error en build por TypeScript

```bash
cd /home/<dominio>/apps/jmf-biblio
pnpm type-check
# Corrige los errores y vuelve a compilar
pnpm build
```

### 12.6 Error en build por ESLint

```bash
pnpm lint
# Si hay errores que no puedes corregir, puedes desactivar lint en build:
# En next.config.ts anade: eslint: { ignoreDuringBuilds: true }
```

### 12.7 La app se queda sin memoria

Si el VPS tiene poca RAM (512 MB - 1 GB), ajusta la configuración de Next.js:

En `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reducir uso de memoria
  experimental: {
    workerThreads: false,
    cpus: 1
  }
}
```

---

## Resumen de puertos y servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Apache HTTP | 80 | Tráfico web (redirige a HTTPS) |
| Apache HTTPS | 443 | Tráfico web seguro (proxy a Next.js) |
| Next.js | 3000 | Servidor de la app (solo localhost) |
| MySQL | 3306 | Base de datos (solo localhost) |

---

## Diagrama de flujo

```
[Navegador] → HTTPS :443 → Apache (VirtualHost SSL)
                                        ↓
                              ProxyPass (proxy inverso)
                                        ↓
                              localhost:3000 (Next.js)
                                        ↓
                              localhost:3306 (MySQL / PMB)
```

---

## Checklist final de verificación

- [ ] Node.js 18+ instalado
- [ ] pnpm 9+ instalado
- [ ] MySQL 8+ con base de datos `pmb` creada
- [ ] Usuario MySQL `jmf_biblio` con permisos
- [ ] Repositorio clonado y dependencias instaladas
- [ ] `.env.local` configurado con valores reales
- [ ] `SESSION_SECRET` generado con `crypto.randomBytes`
- [ ] Directorio de backups creado y escribible
- [ ] `pnpm build` completado sin errores
- [ ] PM2 corriendo la app en puerto 3000
- [ ] PM2 startup configurado para reinicios
- [ ] Apache con proxy inverso configurado
- [ ] SSL activo (Let's Encrypt)
- [ ] La app responde desde el dominio
- [ ] Login funciona
- [ ] Backup automático programado en cron
- [ ] `.env.local` con permisos `600`
- [ ] Contraseña admin cambiada del valor por defecto

---

**Versión del documento:** 1.0 — Junio 2026
**App:** JMF Biblio v1.0.0
