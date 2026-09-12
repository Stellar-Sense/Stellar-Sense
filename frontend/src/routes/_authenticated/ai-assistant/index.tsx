import { createFileRoute } from '@tanstack/react-router'
import { AIAssistant } from '@/features/ai-assistant'

export const Route = createFileRoute('/_authenticated/ai-assistant/')({
  component: AIAssistant,
})
