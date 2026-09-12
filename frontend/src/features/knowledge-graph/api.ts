import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

import type { KnowledgeEdge, KnowledgeNode } from './graph-data'

export type KnowledgeGraphPayload = {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  domainOrder: string[]
}

/** 学科星图数据：节点状态与掌握度由后端按当前用户返回 */
export function useKnowledgeGraph() {
  return useQuery({
    queryKey: ['knowledge', 'graph'],
    queryFn: async () =>
      (await apiClient.get<KnowledgeGraphPayload>('/knowledge/graph')).data,
    staleTime: 60_000,
  })
}
