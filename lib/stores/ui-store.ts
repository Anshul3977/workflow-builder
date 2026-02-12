'use client'

import { create } from 'zustand'

interface UIStore {
  darkMode: boolean
  loading: boolean
  stepConfigModalOpen: boolean
  selectedStepId: string | null
  toggleDarkMode: () => void
  setLoading: (loading: boolean) => void
  openStepConfigModal: (stepId: string) => void
  closeStepConfigModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  loading: false,
  stepConfigModalOpen: false,
  selectedStepId: null,

  toggleDarkMode: () =>
    set((state) => ({
      darkMode: !state.darkMode,
    })),

  setLoading: (loading) =>
    set({
      loading,
    }),

  openStepConfigModal: (stepId) =>
    set({
      stepConfigModalOpen: true,
      selectedStepId: stepId,
    }),

  closeStepConfigModal: () =>
    set({
      stepConfigModalOpen: false,
      selectedStepId: null,
    }),
}))
