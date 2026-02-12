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
    <div className="space-y-16">
      {/* Hero Section — centered */}
      <div className="text-center space-y-6 pt-4 md:pt-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Workflow Builder
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Build and run multi-step text processing pipelines with ease.
          Combine summarization, extraction, categorization, and more.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <Link href="/builder">
            <Button size="lg" className="gap-2 px-8 h-12 text-base">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline" size="lg" className="px-8 h-12 text-base">
              View History
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Cards — 3 equal columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="p-6 md:p-8 h-full hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                <div className="flex flex-col items-center text-center md:items-start md:text-left">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* System Status Section */}
      {!isLoadingHealth && health && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">System Status</h2>
            <Link href="/status" className="text-sm text-primary hover:underline font-medium">
              View detailed status →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <HealthIndicator health={health.backend} />
            <HealthIndicator health={health.database} />
            <HealthIndicator health={health.llm} />
          </div>
        </div>
      )}
    </div>
  )
}
