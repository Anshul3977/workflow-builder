'use client'

import { create } from 'zustand'
import type { WorkflowRun } from '@/types/results'

interface HistoryStore {
  runs: WorkflowRun[]
  loading: boolean
  error: string | null
  setRuns: (runs: WorkflowRun[]) => void
  addRun: (run: WorkflowRun) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clear: () => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  runs: [],
  loading: false,
  error: null,

  setRuns: (runs) =>
    set({
      runs,
      error: null,
    }),

  addRun: (run) =>
    set((state) => ({
      runs: [run, ...state.runs],
    })),

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
      runs: [],
      error: null,
      loading: false,
    }),
}))
