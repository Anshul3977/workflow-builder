'use client'

import { create } from 'zustand'
import type { Workflow, WorkflowStep, StepType, StepConfig } from '@/types/workflow'
import { v4 as uuidv4 } from 'uuid'

interface WorkflowStore {
  workflow: Workflow
  unsavedChanges: boolean
  setWorkflow: (workflow: Workflow) => void
  addStep: (type: StepType) => void
  removeStep: (stepId: string) => void
  updateStep: (stepId: string, config: StepConfig) => void
  setInput: (input: string) => void
  updateStepPosition: (stepId: string, position: number) => void
  reset: () => void
  markSaved: () => void
}

const defaultWorkflow: Workflow = {
  id: uuidv4(),
  name: 'Untitled Workflow',
  steps: [],
  input: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflow: defaultWorkflow,
  unsavedChanges: false,

  setWorkflow: (workflow) =>
    set({
      workflow,
      unsavedChanges: false,
    }),

  addStep: (type) =>
    set((state) => {
      const newStep: WorkflowStep = {
        id: uuidv4(),
        type,
        position: state.workflow.steps.length,
        config: {
          type,
          parameters: {},
        },
      }
      return {
        workflow: {
          ...state.workflow,
          steps: [...state.workflow.steps, newStep],
          updatedAt: new Date().toISOString(),
        },
        unsavedChanges: true,
      }
    }),

  removeStep: (stepId) =>
    set((state) => {
      const filteredSteps = state.workflow.steps.filter((s) => s.id !== stepId)
      const reorderedSteps = filteredSteps.map((step, index) => ({
        ...step,
        position: index,
      }))
      return {
        workflow: {
          ...state.workflow,
          steps: reorderedSteps,
          updatedAt: new Date().toISOString(),
        },
        unsavedChanges: true,
      }
    }),

  updateStep: (stepId, config) =>
    set((state) => ({
      workflow: {
        ...state.workflow,
        steps: state.workflow.steps.map((step) =>
          step.id === stepId ? { ...step, config } : step,
        ),
        updatedAt: new Date().toISOString(),
      },
      unsavedChanges: true,
    })),

  setInput: (input) =>
    set((state) => ({
      workflow: {
        ...state.workflow,
        input,
        updatedAt: new Date().toISOString(),
      },
      unsavedChanges: true,
    })),

  updateStepPosition: (stepId, newPosition) =>
    set((state) => {
      const steps = [...state.workflow.steps]
      const currentIndex = steps.findIndex((s) => s.id === stepId)
      if (currentIndex === -1) return state

      const [moved] = steps.splice(currentIndex, 1)
      steps.splice(newPosition, 0, moved)

      const reordered = steps.map((step, index) => ({
        ...step,
        position: index,
      }))

      return {
        workflow: {
          ...state.workflow,
          steps: reordered,
          updatedAt: new Date().toISOString(),
        },
        unsavedChanges: true,
      }
    }),

  reset: () =>
    set({
      workflow: {
        ...defaultWorkflow,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      },
      unsavedChanges: false,
    }),

  markSaved: () =>
    set({
      unsavedChanges: false,
    }),
}))
