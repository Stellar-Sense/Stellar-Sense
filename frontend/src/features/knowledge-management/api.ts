import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { GraphNode } from '@/features/path-planning/adaptive-api'

export const relationLabels = {
  prerequisite: '前置依赖',
  contains: '包含',
  applies: '应用',
  related: '相关',
}
export const kindLabels: Record<string, string> = {
  direction: '学科方向',
  course: '课程',
  concept: '概念',
  method: '方法',
  tool: '工具',
}
export type Relation = keyof typeof relationLabels
export type GraphEdge = {
  id: number
  fromId: string
  toId: string
  relation: Relation
  reason: string
}
export type ManagedGraph = {
  revision: number
  nodes: GraphNode[]
  edges: GraphEdge[]
}
export type TaskDefinition = {
  id: string
  title: string
  kind: 'quiz' | 'explanation'
  difficulty: number
  minutes: number
  prompt: string
  options: string[]
  answerIndex: number | null
  reference: string
  source: string
  rubric: string
}
export function useManagedGraph(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'graph'],
    enabled,
    queryFn: async () =>
      (await apiClient.get<ManagedGraph>('/admin/knowledge/graph')).data,
  })
}
export function useGraphChanges(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'changes'],
    enabled,
    queryFn: async () =>
      (
        await apiClient.get<
          {
            version: number
            action: string
            administratorId: number
            createdAt: string
          }[]
        >('/admin/knowledge/changes')
      ).data,
  })
}
export function useManagedTasks(nodeId: string) {
  return useQuery({
    queryKey: ['admin', 'tasks', nodeId],
    queryFn: async () =>
      (
        await apiClient.get<TaskDefinition[]>(
          `/admin/knowledge/nodes/${encodeURIComponent(nodeId)}/tasks`
        )
      ).data,
  })
}
export function useGraphMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({
      method,
      path,
      data,
    }: {
      method: 'post' | 'put' | 'delete'
      path: string
      data: Record<string, unknown>
    }) =>
      (
        await apiClient.request<{ revision: number; id?: string }>({
          method,
          url: `/admin/knowledge${path}`,
          ...(method === 'delete' ? { params: data } : { data }),
        })
      ).data,
    onSuccess: () => {
      for (const key of ['admin', 'knowledge', 'path', 'learning', 'dashboard'])
        void client.invalidateQueries({ queryKey: [key] })
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'graph'] })
    },
  })
}
