import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type GraphNode = {
  id: string
  name: string
  domain: string
  kind: string
  difficulty: number
  minutes: number
  description: string
  x: number
  y: number
  sortOrder: number
}
export type LearnerState = {
  mastery: number
  confidence: number
  evidenceCount: number
  errorTags: string[]
}
export type Goal = { nodeIds: string[]; dailyMinutes: number; version: number }
export type PathEntry = {
  nodeId: string
  name: string
  domain: string
  kind: string
  status: 'ready' | 'blocked'
  mastery: number
  confidence: number
  prerequisites: string[]
  isGoal: boolean
  isReview: boolean
  difficulty: number
  taskId: string | null
  taskTitle: string | null
  minutes: number
  sessions: { day: number; minutes: number }[]
  reasons: string[]
  priority: number
}
export type PathResult = {
  entries: PathEntry[]
  completedNodeIds: string[]
  targetNodeIds: string[]
  goalReached: boolean
  totalMinutes: number
  estimatedDays: number
  nextNodeId: string | null
}
export type PathPlanPayload = PathResult & {
  profileSuggestion?: {
    nodeIds: string[]
    dailyMinutes: number
    reason: string
  } | null
  goal: Goal
  version: number
  changed: boolean
  ruleVersion: string
  graphRevision: number
  changes: string[]
  nodes: GraphNode[]
  states: Record<string, LearnerState>
  createdAt: string
}
export type PathVersion = {
  version: number
  createdAt: string
  trigger: string
  changes: string[]
  ruleVersion: string
}
export type PathReplay = PathVersion & {
  result: PathResult
  verified: boolean | null
  goal: Goal
  graphRevision: number
  eventIds: number[]
  evaluationIds: number[]
}

export function usePathPlan() {
  return useQuery({
    queryKey: ['path', 'plan'],
    queryFn: async () =>
      (await apiClient.get<PathPlanPayload>('/path/plan')).data,
    staleTime: 0,
  })
}
export function useRegeneratePath() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<PathPlanPayload>('/path/regenerate')).data,
    onMutate: () => client.cancelQueries({ queryKey: ['path', 'plan'] }),
    onSuccess: async (data) => {
      client.setQueryData(['path', 'plan'], data)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['path', 'history'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
        client.invalidateQueries({ queryKey: ['learning'] }),
      ])
    },
  })
}
export function useUpdateGoal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'version'>) =>
      (await apiClient.put<PathPlanPayload>('/path/goal', goal)).data,
    onMutate: () => client.cancelQueries({ queryKey: ['path', 'plan'] }),
    onSuccess: async (data) => {
      client.setQueryData(['path', 'plan'], data)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['path', 'history'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
        client.invalidateQueries({ queryKey: ['learning'] }),
      ])
    },
  })
}
export function usePathHistory() {
  return useQuery({
    queryKey: ['path', 'history'],
    queryFn: async () =>
      (await apiClient.get<PathVersion[]>('/path/history')).data,
  })
}
export function usePathReplay(version: number | null) {
  return useQuery({
    queryKey: ['path', 'replay', version],
    enabled: version !== null,
    queryFn: async () =>
      (await apiClient.get<PathReplay>(`/path/history/${version}`)).data,
  })
}
