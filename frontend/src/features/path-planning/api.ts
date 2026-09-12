import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

export type StageStatus = 'done' | 'active' | 'locked'

export type PathStage = {
  id: string
  title: string
  summary: string
  duration: string
  difficulty: string
  focus: string
  objective: string
  status: StageStatus
  learningGoal: string
  recommendedContent: string[]
  prerequisites: string[]
  completion: number
  estimatedTime: string
  detail: string
}

export type PathInsightCard = {
  label: string
  value: string
}

export type PathAnalysis = {
  title: string
  subtitle: string
  badge: string
  momentum: string
  nextAction: string
}

export type PathPlanPayload = {
  stages: PathStage[]
  insight: { cards: PathInsightCard[] }
  analysis: PathAnalysis
}

/** 当前用户的学习路径方案（阶段完成度/状态由后端按学习进度实时计算） */
export function usePathPlan() {
  return useQuery({
    queryKey: ['path', 'plan'],
    queryFn: async () =>
      (await apiClient.get<PathPlanPayload>('/path/plan')).data,
    staleTime: 30_000,
  })
}

/** 重新生成学习路径（后端按最新进度重排阶段并轮换/生成分析文案） */
export function useRegeneratePath() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<PathPlanPayload>('/path/regenerate')).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['path', 'plan'], data)
    },
  })
}
