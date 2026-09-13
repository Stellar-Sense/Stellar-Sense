import type { CompanionMetadata } from '@/lib/chat-stream'
import { useMutation, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

export type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  metadata?: CompanionMetadata
}

export type Conversation = {
  id: string
  title: string
  category: string
  messages: ChatMessage[]
  context?: NonNullable<CompanionMetadata["context"]>
}

export function useConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: async () =>
      (await apiClient.get<Conversation[]>('/ai/conversations')).data,
    staleTime: 0,
  })
}

export function useCreateConversation() {
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<Conversation>('/ai/conversations', {})).data,
  })
}
