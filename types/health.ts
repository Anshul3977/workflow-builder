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
}
