import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { NodeLearning } from '@/features/node-learning'
import { LEARNING_STAGES } from '@/features/node-learning/types'

const nodeLearningSearchSchema = z.object({
  /** 从星图等入口携带的知识节点 id，用于直达对应学习节点 */
  nodeId: z.string().optional().catch(undefined),
  /** 节点内部学习阶段；刷新后仍停留在当前工作区 */
  stage: z.enum(LEARNING_STAGES).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/node-learning/')({
  validateSearch: nodeLearningSearchSchema,
  component: NodeLearning,
})
