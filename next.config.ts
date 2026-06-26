import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
  // pdfkit es un módulo nativo de Node.js; no debe bundlearse con Webpack
  serverExternalPackages: ['pdfkit']
}

export default nextConfig
