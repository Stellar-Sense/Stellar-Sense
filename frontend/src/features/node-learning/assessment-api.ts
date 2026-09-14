import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { LearnerState } from '@/features/path-planning/adaptive-api'

export type LearningTask = {
  id: string
  nodeId: string
  title: string
  kind: 'quiz' | 'explanation'
  difficulty: number
  minutes: number
  prompt: string
  options: string[]
  source: string
}
export type LearningEvent = {
  id: number
  nodeId: string
  kind: string
  createdAt: string
  status: 'evaluated' | 'pending' | 'recorded'
  score: number | null
  feedback: string
  source: string | null
  state: LearnerState
  answer: string
  taskTitle: string
}
export type EventInput = {
  requestId: string
  nodeId: string
  kind: 'read' | 'hint' | 'accept' | 'skip' | 'answer'
  taskId?: string
  answer?: string
  durationSeconds?: number
  hintLevel?: number
}
export function useNodeTasks(nodeId: string) {
  return useQuery({
    queryKey: ['learning', 'tasks', nodeId],
    queryFn: async () =>
      (
        await apiClient.get<{
          tasks: LearningTask[]
          state: LearnerState
          blockers: string[]
          blockerNames: string[]
        }>(`/learning/nodes/${encodeURIComponent(nodeId)}/tasks`)
      ).data,
  })
}
export function useLearningEvents(nodeId?: string) {
  return useQuery({
    queryKey: ['learning', 'events', nodeId],
    queryFn: async () =>
      (
        await apiClient.get<LearningEvent[]>('/learning/events', {
          params: { nodeId },
        })
      ).data,
  })
}
export function useLearningEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EventInput) =>
      (
        await apiClient.post<LearningEvent>('/learning/events', payload, {
          timeout: 90_000,
        })
      ).data,
    onSuccess: () => {
      for (const key of ['learning', 'path', 'knowledge', 'dashboard'])
        void client.invalidateQueries({ queryKey: [key] })
    },
  })
}
export function useRetryEvaluation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (
        await apiClient.post<LearningEvent>(
          `/learning/events/${id}/retry`,
          {},
          { timeout: 90_000 }
        )
      ).data,
    onSuccess: () => {
      for (const key of ['learning', 'path', 'knowledge', 'dashboard'])
        void client.invalidateQueries({ queryKey: [key] })
    },
  })
}
