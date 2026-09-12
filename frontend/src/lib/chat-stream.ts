import { useAuthStore } from '@/stores/auth-store'

export type ChatStreamContext = {
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
    messageId: number
    conversationId: string
    title: string
  }) => void
  onError?: (message: string) => void
}

type StreamEvent = {
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
        handlers.onError?.(event.error)
      } else if (event.done) {
        handlers.onDone?.({
          messageId: event.messageId ?? Date.now(),
          conversationId: event.conversationId ?? '',
          title: event.title ?? '',
        })
      } else if (event.delta) {
        handlers.onDelta(event.delta)
      }
    }
  }

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
}
