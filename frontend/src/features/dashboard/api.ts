import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

export type DashboardStat = {
  title: string
  value: string
  description: string
}

export type DashboardPathNode = {
  title: string
  status: 'completed' | 'current' | 'upcoming'
}

export type DashboardRadarItem = {
  subject: string
  value: number
}

export type DashboardRecentItem = {
  title: string
  description: string
  progress: number
  status: string
  iconClass: string
  fallback: string
}

export type DashboardSuggestion = {
  topic: string
  estimate: string
}

export type DashboardSummary = {
  stats: DashboardStat[]
  path: DashboardPathNode[]
  radar: DashboardRadarItem[]
  recent: DashboardRecentItem[]
  suggestion: DashboardSuggestion
  courseProgress: number
}

/** 学习驾驶舱聚合数据：统计卡 / 路径 / 雷达图 / 最近学习 / AI 建议 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () =>
      (await apiClient.get<DashboardSummary>('/dashboard/summary')).data,
    staleTime: 30_000,
  })
}
