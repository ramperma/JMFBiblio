#!/bin/bash

# Script de verificación de requisitos - Gestión de Biblioteca

echo "🔍 Verificando requisitos del proyecto..."
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Descargar desde: https://nodejs.org"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo "✅ Node.js: $NODE_VERSION"
fi

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no está instalado"
    echo "   Instalar con: npm install -g pnpm"
    exit 1
else
    PNPM_VERSION=$(pnpm -v)
    echo "✅ pnpm: $PNPM_VERSION"
fi

# Verificar MySQL
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL CLI no encontrado (opcional para desarrollo)"
else
    MYSQL_VERSION=$(mysql --version)
    echo "✅ MySQL: $MYSQL_VERSION"
fi

# Verificar .env.local
if [ -f ".env.local" ]; then
    echo "✅ Archivo .env.local encontrado"
else
    echo "⚠️  Archivo .env.local no encontrado"
    echo "   Copia .env.example a .env.local"
fi

# Verificar node_modules
if [ -d "node_modules" ]; then
    echo "✅ node_modules encontrado"
else
    echo "⚠️  node_modules no encontrado"
    echo "   Ejecuta: pnpm install"
fi

# Verificar archivos críticos
echo ""
echo "🔍 Verificando archivos del proyecto..."

FILES=(
    "package.json"
    "tsconfig.json"
    "next.config.ts"
    "lib/db.ts"
    "app/page.tsx"
    "app/layout.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file"
    fi
done

echo ""
echo "✅ Verificación completada"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Configura .env.local con tus credenciales MySQL"
echo "   2. Ejecuta: pnpm install"
echo "   3. Ejecuta: pnpm dev"
echo "   4. Abre: http://localhost:3000"
