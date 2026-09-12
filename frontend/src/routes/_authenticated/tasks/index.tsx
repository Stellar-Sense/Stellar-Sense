import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeGraph } from '@/features/knowledge-graph'

const taskSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z.array(z.string()).optional().catch([]),
  priority: z.array(z.string()).optional().catch([]),
  filter: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/tasks/')({
  validateSearch: taskSearchSchema,
  component: KnowledgeGraph,
})
