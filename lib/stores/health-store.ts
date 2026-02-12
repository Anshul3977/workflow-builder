'use client'

import { create } from 'zustand'
import type { HealthMetrics } from '@/types/health'

interface HealthStore {
  health: HealthMetrics | null
  loading: boolean
  error: string | null
  lastChecked: string | null
  setHealth: (health: HealthMetrics) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

const defaultHealth: HealthMetrics = {
  backend: {
    name: 'Backend API',
    status: 'healthy',
    message: 'All systems operational',
    lastChecked: new Date().toISOString(),
  },
  database: {
    name: 'Database',
    status: 'healthy',
    message: 'Connected',
    lastChecked: new Date().toISOString(),
  },
  llm: {
    name: 'LLM Service',
    status: 'healthy',
    message: 'Responding normally',
    lastChecked: new Date().toISOString(),
  },
  uptime: 99.9,
  requestsProcessed: 0,
  averageResponseTime: 0,
}

export const useHealthStore = create<HealthStore>((set) => ({
  health: defaultHealth,
  loading: false,
  error: null,
  lastChecked: null,

  setHealth: (health) =>
    set({
      health,
      error: null,
      lastChecked: new Date().toISOString(),
    }),

  setLoading: (loading) =>
    set({
      loading,
    }),

  setError: (error) =>
    set({
      error,
    }),

  clear: () =>
    set({
      health: defaultHealth,
      error: null,
      loading: false,
      lastChecked: null,
    }),
}))
