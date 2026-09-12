import { createFileRoute } from '@tanstack/react-router'
import { NodeLearning } from '@/features/node-learning'

export const Route = createFileRoute('/_authenticated/node-learning/')({
  component: NodeLearning,
})
