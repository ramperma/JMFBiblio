#!/bin/bash

echo "🚀 Iniciando JMF Biblio..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js no instalado. Descarga desde https://nodejs.org"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no instalado. Ejecuta: npm install -g pnpm"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  .env no encontrado. Copiando desde .env.example..."
    cp .env.example .env
    echo "⚠️  Edita .env con tus credenciales MySQL"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    pnpm install
fi

echo "✅ Iniciando servidor de desarrollo..."
echo "🌐 http://localhost:3000"
echo ""
pnpm dev
