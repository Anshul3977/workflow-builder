'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { HealthIndicator } from '@/components/health/health-indicator'
import { useHealthStore } from '@/lib/stores/health-store'
import { healthApi } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RotateCw } from 'lucide-react'

export default function StatusPage() {
  const [isLoading, setIsLoading] = useState(true)
  const health = useHealthStore((state) => state.health)
  const setHealth = useHealthStore((state) => state.setHealth)

  const fetchHealth = async () => {
    try {
      setIsLoading(true)
      const response = await healthApi.getStatus()
      setHealth(response.health)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch health status'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [setHealth])

  const getOverallStatus = () => {
    if (!health) return 'unknown'
    if (health.backend.status === 'unhealthy' || health.database.status === 'unhealthy' || health.llm.status === 'unhealthy') {
      return 'unhealthy'
    }
    if (health.backend.status === 'degraded' || health.database.status === 'degraded' || health.llm.status === 'degraded') {
      return 'degraded'
    }
    return 'healthy'
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground mt-2">
            Monitor the health of all backend services
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          disabled={isLoading}
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : health ? (
        <div className="space-y-8">
          <Card className="p-6 md:p-8 border-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Overall Status</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold capitalize">{getOverallStatus()}</span>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded ${getOverallStatus() === 'healthy'
                    ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
                    : getOverallStatus() === 'degraded'
                      ? 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
                      : 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
                    }`}
                >
                  {getOverallStatus() === 'healthy' ? '✓' : getOverallStatus() === 'degraded' ? '⚠' : '✕'}
                </span>
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <h3 className="text-lg font-semibold">Services</h3>
            <div className="space-y-3">
              <HealthIndicator health={health.backend} />
              <HealthIndicator health={health.database} />
              <HealthIndicator health={health.llm} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            <Card className="p-5 md:p-6">
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-2xl font-bold mt-1">{health.uptime.toFixed(2)}%</p>
            </Card>
            <Card className="p-5 md:p-6">
              <p className="text-sm text-muted-foreground">Requests Processed</p>
              <p className="text-2xl font-bold mt-1">{health.requestsProcessed.toLocaleString()}</p>
            </Card>
            <Card className="p-5 md:p-6">
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-2xl font-bold mt-1">{health.averageResponseTime.toFixed(0)}ms</p>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
