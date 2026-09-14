import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeManagement } from '@/features/knowledge-management'

export const Route = createFileRoute('/_authenticated/knowledge-management/')({
  component: KnowledgeManagement,
})
