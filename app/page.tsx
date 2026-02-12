'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HealthIndicator } from '@/components/health/health-indicator'
import { useHealthStore } from '@/lib/stores/health-store'
import { healthApi } from '@/lib/api'
import { ArrowRight, Zap, Settings, History } from 'lucide-react'

export default function HomePage() {
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)
  const health = useHealthStore((state) => state.health)
  const setHealth = useHealthStore((state) => state.setHealth)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await healthApi.getStatus()
        setHealth(response.health)
      } catch (error) {
        console.error('Failed to fetch health:', error)
      } finally {
        setIsLoadingHealth(false)
      }
    }

    fetchHealth()
  }, [setHealth])

  const features = [
    {
      title: 'Build Workflows',
      description: 'Create multi-step text processing pipelines by combining different operations',
      icon: Settings,
      href: '/builder',
    },
    {
      title: 'View History',
      description: 'Track and manage all your workflow executions with detailed results',
      icon: History,
      href: '/history',
    },
    {
      title: 'Check Status',
      description: 'Monitor the health and performance of your backend services',
      icon: Zap,
      href: '/status',
    },
  ]

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">
            Workflow Builder
          </h1>
          <p className="text-xl text-muted-foreground mt-4">
            Build and run multi-step text processing pipelines with ease.
            Combine summarization, extraction, categorization, and more.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/builder">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline" size="lg">
              View History
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="p-6 md:p-8 h-full hover:shadow-lg transition-shadow cursor-pointer">
                <Icon className="h-8 w-8 text-primary mb-5" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>

      {!isLoadingHealth && health && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HealthIndicator health={health.backend} />
            <HealthIndicator health={health.database} />
            <HealthIndicator health={health.llm} />
          </div>
          <Link href="/status" className="text-sm text-primary hover:underline">
            View detailed status →
          </Link>
        </div>
      )}
    </div>
  )
}
