# Quick Start - Guía Rápida de Inicio

## ⚡ Inicio en 5 minutos

### 1. Instalar dependencias (1 min)
```bash
cd /home/ramon/CodigoGithub/Jmf_biblio
pnpm install
```

### 2. Configurar base de datos (2 min)
```bash
# Copiar y editar archivo de entorno
cp .env.example .env.local

# Editar .env.local y agregar:
# DATABASE_HOST=localhost
# DATABASE_PORT=3306
# DATABASE_USER=root
# DATABASE_PASSWORD=tu_contraseña
# DATABASE_NAME=pmb
```

### 3. Iniciar servidor (1 min)
```bash
pnpm dev
```

### 4. Abrir en navegador (1 min)
```
http://localhost:3000
```

Login con las credenciales por defecto:
- Usuario: `admin`
- Contraseña: `admin123`

¡Listo! 🚀

---

## 📋 Checklist de Primeros Pasos

- [ ] Node.js 18+ instalado
- [ ] pnpm instalado (`npm install -g pnpm`)
- [ ] MySQL corriendo y base de datos `pmb` creada
- [ ] Archivo `.env.local` configurado
- [ ] Ejecutado `pnpm install`
- [ ] `pnpm dev` ejecutándose
- [ ] Navegador en `http://localhost:3000`

---

## 🌐 Probar Endpoints

Abrir en el navegador o usar cURL:

```bash
# Endpoints publicos
curl http://localhost:3000/api/books
curl http://localhost:3000/api/users
curl http://localhost:3000/api/loans

# Endpoints protegidos (requieren login primero)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
curl -b cookies.txt http://localhost:3000/api/statistics
```

---

## 📱 Interfaz Web

La aplicación incluye una UI completa con 5 tabs:

- 📚 **Libros** - Listar, buscar, crear, editar
- 👥 **Usuarios** - Listar, buscar, crear, editar (usuarios PMB)
- 📖 **Préstamos** - Listar con filtros, crear, devolver, renovar
- ⚙️ **Configuración** - Settings de la app + usuarios administradores
- 📊 **Estadísticas** - Totales + top 5 libros + top 5 usuarios

---

## 🐛 Problemas Comunes

### "Error: ECONNREFUSED"
→ MySQL no está corriendo. Inicia el servidor: `sudo systemctl start mysql`

### "Error: ER_ACCESS_DENIED_FOR_USER"
→ Verifica credenciales en `.env.local`

### "Error: ER_NO_REFERENCED_TABLE"
→ La base de datos `pmb` no existe o no tiene las tablas

### "Puerto 3000 en uso"
→ `lsof -ti:3000 | xargs kill -9` o usa otro puerto: `PORT=3001 pnpm dev`

### "Demasiados intentos" / login bloqueado por rate limit
→ `mysql -u root -p pmb -e "TRUNCATE TABLE app_login_attempts;"`

---

## 📚 Documentación

- **README.md** - Descripción general del proyecto
- **API.md** - Documentación detallada de endpoints
- **DESARROLLO.md** - Guía para desarrolladores
- **CHANGELOG.md** - Historial de versiones

---

## 💾 Datos de Conexión Ejemplo

Si tienes una instancia local de PMB, usa estos datos:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=pmb
```

---

## ✅ Verificar Instalación

```bash
bash check-requirements.sh
```

---

**¿Necesitas ayuda?** Revisa los archivos de documentación o contacta al equipo de desarrollo.

**Última actualización:** 13 de abril de 2026
