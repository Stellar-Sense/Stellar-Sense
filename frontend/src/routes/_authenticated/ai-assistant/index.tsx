import { createFileRoute } from '@tanstack/react-router'
import { AIAssistant } from '@/features/ai-assistant'

export const Route = createFileRoute('/_authenticated/ai-assistant/')({
  validateSearch: (search: Record<string, unknown>): {conversationId?: string} => ({conversationId: typeof search.conversationId === 'string' ? search.conversationId : undefined}),
  component: AIAssistant,
})
