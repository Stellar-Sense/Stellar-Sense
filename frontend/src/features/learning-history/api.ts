import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

export type RangeKey = '7d' | '30d' | '90d'

export type TrendPoint = { label: string; minutes: number; mastery: number }
export type HistoryStat = { label: string; value: string; detail: string }
export type HistoryRecord = {
  id: number
  title: string
  category: string
  duration: string
  score: number
  timestamp: string
  summary: string
}
export type TimelineItem = {
  id: number
  title: string
  tag: string
  when: string
  description: string
}
export type MasteryItem = { name: string; value: number }

export type LearningHistoryPayload = {
  stats: HistoryStat[]
  trend: TrendPoint[]
  mastery: MasteryItem[]
  records: HistoryRecord[]
  timeline: TimelineItem[]
}

/** 学习记录：按时间范围（7 天 / 30 天 / 90 天）拉取统计、趋势与明细 */
export function useLearningHistory(range: RangeKey) {
  return useQuery({
    queryKey: ['learning', 'history', range],
    queryFn: async () =>
      (
        await apiClient.get<LearningHistoryPayload>('/learning/history', {
          params: { range },
        })
      ).data,
    staleTime: 30_000,
  })
}
