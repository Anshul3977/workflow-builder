'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ServiceHealth } from '@/types/health'

interface HealthIndicatorProps {
  health: ServiceHealth
}

export function HealthIndicator({ health }: HealthIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
      case 'unhealthy':
        return 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✓'
      case 'degraded':
        return '⚠'
      case 'unhealthy':
        return '✕'
      default:
        return '?'
    }
  }

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-medium">{health.name}</p>
          <p className="text-sm text-muted-foreground">{health.message}</p>
        </div>
        <Badge className={`${getStatusColor(health.status)} font-semibold`}>
          {getStatusIcon(health.status)} {health.status}
        </Badge>
      </div>
    </Card>
  )
}
