import type { CompanionMetadata } from '@/lib/chat-stream'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

export type NodeStatus = 'done' | 'current' | 'todo'

export type LearningNodeItem = {
  id: string
  label: string
  status: NodeStatus
}

export type LearningGroup = {
  group: string
  items: LearningNodeItem[]
}

export type LearningNodesOverview = {
  groups: LearningGroup[]
  sequence: string[]
  currentNodeId: string | null
}

export type LearningNodeDetail = {
  id: string
  title: string
  breadcrumb: string
  summary: string
  progress: number
  duration: string
  objectives: string[]
  methods: string[]
  concept: string
  caseTitle: string
  caseSummary: string
  explanation: string
  status: NodeStatus
}

export type CompleteNodeResult = LearningNodesOverview & {
  nodeId: string
  status: NodeStatus
  nextNodeId: string | null
}

export function useLearningNodes() {
  return useQuery({
    queryKey: ['learning', 'nodes'],
    queryFn: async () =>
      (await apiClient.get<LearningNodesOverview>('/learning/nodes')).data,
    staleTime: 30_000,
  })
}

export function useLearningNode(nodeId: string | null) {
  return useQuery({
    queryKey: ['learning', 'node', nodeId],
    queryFn: async () =>
      (
        await apiClient.get<LearningNodeDetail>(
          `/learning/nodes/${encodeURIComponent(nodeId ?? '')}`
        )
      ).data,
    enabled: Boolean(nodeId),
  })
}

/** 标记节点完成：完成后刷新节点列表，并联动图谱 / 仪表盘 / 路径数据 */
export function useCompleteNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nodeId: string) =>
      (
        await apiClient.post<CompleteNodeResult>(
          `/learning/nodes/${encodeURIComponent(nodeId)}/complete`
        )
      ).data,
    onSuccess: (_data, nodeId) => {
      void queryClient.invalidateQueries({ queryKey: ['learning', 'nodes'] })
      void queryClient.invalidateQueries({ queryKey: ['learning', 'node', nodeId] })
      void queryClient.invalidateQueries({ queryKey: ['knowledge', 'graph'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['path', 'plan'] })
    },
  })
}

/** 让 AI 解释当前知识点（无 LLM key 时返回内置解释文案） */
export function useExplainNode() {
  return useMutation({
    mutationFn: async (request: {nodeId: string; learnerLevel: string}) =>
      (
        await apiClient.post<{ explanation: string; metadata?: CompanionMetadata }>('/ai/explain', request)
      ).data,
  })
}
