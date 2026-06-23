/**
 * Utilidades comunes para la aplicación
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  count?: number
  error?: string
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface DatabaseError extends Error {
  code?: string
  errno?: number
  sql?: string
}

/**
 * Formatea fecha a formato readable
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formatea fecha con hora
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Valida si un string es un número válido
 */
export function isValidId(id: string): boolean {
  const parsed = parseInt(id)
  return !isNaN(parsed) && parsed > 0
}

/**
 * Sanitiza string de búsqueda
 */
export function sanitizeSearchQuery(query: string): string {
  return query.trim().slice(0, 100)
}

/**
 * Genera respuesta exitosa
 */
export function successResponse<T>(
  data: T,
  count?: number
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(count !== undefined && { count })
  }
}

/**
 * Genera respuesta de error
 */
export function errorResponse(error: string): ApiResponse {
  return {
    success: false,
    error
  }
}

/**
 * Log con timestamp
 */
export function logWithTime(...args: any[]): void {
  const time = new Date().toISOString()
  console.log(`[${time}]`, ...args)
}

/**
 * Delay asincrónico (para testing)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
