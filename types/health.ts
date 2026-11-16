export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ServiceHealth {
  name: string
  status: HealthStatus
  message: string
  lastChecked: string
}

export interface HealthMetrics {
  backend: ServiceHealth
  database: ServiceHealth
  llm: ServiceHealth
  uptime: number
  requestsProcessed: number
  averageResponseTime: number
  runs24h?: number
  traces?: { steps24h: number; p50StepMs: number; p50TtftMs: number; tokens24h: number }
}
