import { useAuthStore } from '@/stores/auth-store'

export type CompanionMetadata = {
  mode: 'generated' | 'model_only' | 'fallback'
  reason?: string
  suggestedAction?: string
  references: { chunkId: string; text: string; sourceDocument: string; locator: string; evidenceKind: string }[]
  context?: { node?: string; node_id?: string; learner_level?: 'beginner' | 'advanced'; scene?: 'preview' | 'exam_review'; stage?: string; progress?: string }
}

export type ChatStreamContext = {
  nodeId?: string
  learnerLevel?: 'beginner' | 'advanced'
  scene?: 'preview' | 'exam_review'

  node?: string
  stage?: string
  progress?: string
}

export type ChatStreamBody = {
  conversationId?: string
  message: string
  context?: ChatStreamContext
}

export type ChatStreamHandlers = {
  onDelta: (delta: string) => void
  onDone?: (payload: {
    metadata?: CompanionMetadata
    messageId: number
    conversationId: string
    title: string
  }) => void
  onError?: (message: string) => void
}

type StreamEvent = {
  metadata?: CompanionMetadata
  delta?: string
  done?: boolean
  messageId?: number
  conversationId?: string
  title?: string
  error?: string
}

/**
 * 通过 fetch + ReadableStream 消费后端 SSE 流。
 * （axios 浏览器端无法读取流式响应体，因此聊天接口单独使用 fetch。）
 * 事件格式：data: {"delta":"..."} … data: {"done":true,"messageId":1,...}
 */
export async function streamChat(
  body: ChatStreamBody,
  handlers: ChatStreamHandlers
): Promise<void> {
  const baseURL = import.meta.env.VITE_API_URL ?? '/api'
  const token = useAuthStore.getState().auth.accessToken

  let response: Response
  try {
    response = await fetch(`${baseURL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    handlers.onError?.('网络异常，请确认后端服务已启动')
    return
  }

  if (!response.ok || !response.body) {
    let title = '发送失败，请稍后重试'
    try {
      const data = (await response.json()) as { title?: string }
      if (data.title) title = data.title
    } catch {
      // 忽略响应体解析失败，使用默认提示
    }
    handlers.onError?.(title)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

  const handleChunk = (chunk: string) => {
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw) continue
      let event: StreamEvent
      try {
        event = JSON.parse(raw) as StreamEvent
      } catch {
        continue
      }
      if (event.error) {
        finished = true
        handlers.onError?.(event.error)
      } else if (event.done) {
        finished = true
        handlers.onDone?.({
          metadata: event.metadata,
          messageId: event.messageId ?? Date.now(),
          conversationId: event.conversationId ?? '',
          title: event.title ?? '',
        })
      } else if (event.delta) {
        handlers.onDelta(event.delta)
      }
    }
  }

  try {
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      handleChunk(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) handleChunk(buffer)
  if (!finished) handlers.onError?.('回复连接已中断，请重试')
  } catch {
    if (!finished) handlers.onError?.('读取回复失败，请重试')
  } finally { reader.releaseLock() }
}
