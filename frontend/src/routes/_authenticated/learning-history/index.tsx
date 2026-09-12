import { createFileRoute } from '@tanstack/react-router'
import { LearningHistory } from '@/features/learning-history'

export const Route = createFileRoute('/_authenticated/learning-history/')({
  component: LearningHistory,
})
