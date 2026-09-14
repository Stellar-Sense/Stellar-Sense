import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Loader2,
  MessageCircle,
  Minus,
  Move,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { CompanionEvidence } from '@/components/companion-evidence'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { streamChat, type ChatStreamContext } from '@/lib/chat-stream'
import { t, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useCompanionStore } from '@/stores/companion-store'
import {
  useConversations,
  useCreateConversation,
  type ChatMessage,
  type Conversation,
} from '@/features/ai-assistant/api'

type Position = { x: number; y: number }

const POSITION_KEY = 'stellar-companion-position'
const COLLAPSED_SIZE = 118
const PANEL_WIDTH = 380
const PANEL_HEIGHT = 520

let localMessageId = 10_000

const nextMessageId = () => {
  localMessageId += 1
  return localMessageId
}

function defaultPosition(): Position {
  if (typeof window === 'undefined') return { x: 24, y: 180 }
  return {
    x: Math.max(14, window.innerWidth - COLLAPSED_SIZE - 24),
    y: Math.max(14, window.innerHeight - COLLAPSED_SIZE - 24),
  }
}

function readPosition(): Position {
  try {
    const saved = JSON.parse(
      localStorage.getItem(POSITION_KEY) ?? 'null'
    ) as Partial<Position> | null
    if (typeof saved?.x === 'number' && typeof saved.y === 'number') {
      return { x: saved.x, y: saved.y }
    }
  } catch {
    // 浏览器禁用本地存储时使用默认位置。
  }
  return defaultPosition()
}

function clampPosition(position: Position, expanded: boolean): Position {
  if (typeof window === 'undefined') return position
  const width = expanded ? PANEL_WIDTH : COLLAPSED_SIZE
  const height = expanded ? PANEL_HEIGHT : COLLAPSED_SIZE
  return {
    x: Math.min(Math.max(14, position.x), Math.max(14, window.innerWidth - width - 14)),
    y: Math.min(Math.max(14, position.y), Math.max(14, window.innerHeight - height - 14)),
  }
}

export function CompanionPet() {
  useLocale((state) => state.locale)

  const queryClient = useQueryClient()
  const { isOpen, node } = useCompanionStore()
  const toggle = useCompanionStore((state) => state.toggle)
  const close = useCompanionStore((state) => state.close)
  const { data: conversations, isPending: conversationsPending } = useConversations()
  const createConversation = useCreateConversation()
  const [position, setPosition] = useState<Position>(() =>
    clampPosition(readPosition(), false)
  )
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const streamedRef = useRef('')
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)
  const isOpenRef = useRef(isOpen)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position))
    } catch {
      // 浏览器禁用本地存储时不影响拖拽。
    }
  }, [position])

  useEffect(() => {
    const handleResize = () => setPosition((current) => clampPosition(current, isOpenRef.current))
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return

      const deltaX = event.clientX - drag.startX
      const deltaY = event.clientY - drag.startY
      if (Math.abs(deltaX) + Math.abs(deltaY) > 5) drag.moved = true
      setPosition(
        clampPosition(
          { x: drag.originX + deltaX, y: drag.originY + deltaY },
          isOpenRef.current
        )
      )
    }

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || event.pointerId !== drag.pointerId) return
      dragRef.current = null
      if (!drag.moved && !isOpenRef.current) {
        useCompanionStore.getState().toggle()
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const list = useMemo(() => conversations ?? [], [conversations])
  const selectedConversation =
    list.find((conversation) => conversation.id === selectedConversationId) ?? list[0]
  const messages = useMemo(
    () => selectedConversation?.messages ?? [],
    [selectedConversation]
  )
  const renderedPosition = clampPosition(position, isOpen)

  const context = useMemo<ChatStreamContext>(
    () => ({
      nodeId: node?.id,
      node: node?.name,
      stage: node?.domain ?? '遥感学习',
      progress: node ? `${node.progress}%` : undefined,
    }),
    [node]
  )

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const updateConversations = (
    updater: (previous: Conversation[]) => Conversation[]
  ) => {
    queryClient.setQueryData<Conversation[]>(
      ['ai', 'conversations'],
      (previous) => updater(previous ?? [])
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    }
  }

  const handleSend = async (customPrompt?: string) => {
    const normalizedPrompt = (customPrompt ?? prompt).trim()
    if (!normalizedPrompt || isThinking || createConversation.isPending) return

    let conversation = selectedConversation
    if (!conversation) {
      try {
        conversation = await createConversation.mutateAsync()
        updateConversations((previous) => [conversation!, ...previous])
        setSelectedConversationId(conversation.id)
      } catch {
        toast.error(t('创建会话失败，请稍后重试'))
        return
      }
    }

    const conversationId = conversation.id
    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: 'user',
      content: normalizedPrompt,
    }

    updateConversations((previous) =>
      previous.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages: [...item.messages, userMessage],
              context: {
                ...item.context,
                node_id: context.nodeId,
                node: context.node,
                stage: context.stage,
                progress: context.progress,
              },
            }
          : item
      )
    )
    setPrompt('')
    setIsThinking(true)
    streamedRef.current = ''
    setStreamingText('')

    void streamChat(
      { conversationId, message: normalizedPrompt, context },
      {
        onDelta: (delta) => {
          streamedRef.current += delta
          setStreamingText(streamedRef.current)
        },
        onDone: ({ messageId, conversationId: doneId, title, metadata }) => {
          updateConversations((previous) =>
            previous.map((item) =>
              item.id === doneId
                ? {
                    ...item,
                    title: title || item.title,
                    context: metadata?.context ?? item.context,
                    messages: [
                      ...item.messages,
                      {
                        id: messageId,
                        role: 'assistant',
                        content: streamedRef.current,
                        metadata,
                      },
                    ],
                  }
                : item
            )
          )
          setIsThinking(false)
          setStreamingText('')
        },
        onError: (message) => {
          toast.error(message)
          setIsThinking(false)
          setStreamingText('')
        },
      }
    )
  }

  const handleNewConversation = async () => {
    if (isThinking || createConversation.isPending) return
    try {
      const conversation = await createConversation.mutateAsync()
      updateConversations((previous) => [conversation, ...previous])
      setSelectedConversationId(conversation.id)
    } catch {
      toast.error(t('创建会话失败，请稍后重试'))
    }
  }

  const starter = node
    ? `请用通俗的方式解释「${node.name}」，并告诉我它在${node.domain}中的学习重点。`
    : '我想了解遥感学习的重点，应该从哪里开始？'

  return (
    <div
      className='fixed z-[80] select-none'
      style={{ left: renderedPosition.x, top: renderedPosition.y }}
    >
      {isOpen && (
        <div className='mb-2 w-[min(380px,calc(100vw-28px))] overflow-hidden rounded-[24px] border border-cyan-300/20 bg-[#071326]/95 text-slate-100 shadow-[0_22px_80px_rgba(2,8,23,0.7),0_0_0_1px_rgba(56,189,248,0.08)] backdrop-blur-xl'>
          <div
            className='flex cursor-grab items-center justify-between border-b border-white/10 bg-gradient-to-r from-sky-500/15 via-violet-500/10 to-transparent px-4 py-3 active:cursor-grabbing'
            onPointerDown={handlePointerDown}
          >
            <div className='flex items-center gap-2.5'>
              <div className='relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-sky-400/20 to-violet-500/20 shadow-[0_0_24px_rgba(34,211,238,0.18)]'>
                <img
                  src='/images/xiaoyu-companion.png'
                  alt='小遇'
                  draggable={false}
                  className='pointer-events-none h-full w-full object-contain'
                />
                <span className='absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#071326] bg-emerald-400' />
              </div>
              <div>
                <div className='flex items-center gap-1.5 text-sm font-semibold text-white'>
                  小遇
                  <span className='rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium tracking-[0.12em] text-emerald-300 uppercase'>
                    在线
                  </span>
                </div>
                <div className='text-[10px] tracking-[0.16em] text-slate-400 uppercase'>
                  遥感知识伴学
                </div>
              </div>
            </div>
            <div className='flex items-center gap-1'>
              <Move className='mr-1 h-3.5 w-3.5 text-slate-500' />
              <button
                type='button'
                aria-label={t('收起小遇')}
                className='flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white'
                onPointerDown={(event) => event.stopPropagation()}
                onClick={close}
              >
                <Minus className='h-4 w-4' />
              </button>
              <button
                type='button'
                aria-label={t('关闭小遇')}
                className='flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white'
                onPointerDown={(event) => event.stopPropagation()}
                onClick={close}
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          </div>

          <div className='p-3'>
            <div className='mb-2.5 flex items-start gap-2 rounded-2xl border border-violet-300/15 bg-violet-400/8 px-3 py-2.5 text-xs leading-5 text-slate-300'>
              <Sparkles className='mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300' />
              <div>
                <div className='font-medium text-violet-100'>
                  {node ? '已识别当前知识点' : '随时问我遥感问题'}
                </div>
                <div className='mt-0.5 text-[11px] text-slate-400'>
                  {node
                    ? `${node.name} · ${node.domain} · 掌握度 ${node.progress}%`
                    : '点击星图节点后，我会自动带入相关上下文。'}
                </div>
              </div>
            </div>

            <div className='h-[260px] rounded-2xl border border-white/8 bg-slate-950/35 p-2'>
              <ScrollArea className='h-full pr-1'>
                <div className='space-y-2.5 px-1 py-1'>
                  {conversationsPending && messages.length === 0 ? (
                    <div className='flex items-center gap-2 rounded-2xl border border-white/8 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-400'>
                      <Loader2 className='h-3.5 w-3.5 animate-spin text-cyan-300' />
                      正在加载对话…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className='rounded-2xl border border-cyan-300/15 bg-cyan-400/8 px-3 py-2.5 text-sm leading-6 text-slate-200'>
                      你好，我是小遇。点击一个知识点，或者直接问我遥感问题吧。
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-6',
                            message.role === 'assistant'
                              ? 'border border-white/10 bg-slate-900/80 text-slate-200'
                              : 'border border-cyan-300/20 bg-cyan-400/10 text-cyan-50'
                          )}
                        >
                          {message.content.split('\n').map((line, index) => (
                            <div key={`${message.id}-${index}`}>{line || ' '}</div>
                          ))}
                          <CompanionEvidence metadata={message.metadata} />
                        </div>
                      </div>
                    ))
                  )}

                  {isThinking && (
                    <div className='flex justify-start'>
                      <div className='flex max-w-[88%] items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300'>
                        {streamingText ? (
                          <span>{streamingText}</span>
                        ) : (
                          <>
                            <Loader2 className='h-3.5 w-3.5 animate-spin text-cyan-300' />
                            小遇正在检索知识库并思考…
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <div ref={endOfMessagesRef} />
                </div>
              </ScrollArea>
            </div>

            <div className='mt-2 flex gap-1.5 overflow-x-auto pb-0.5'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0 rounded-full border-cyan-300/20 bg-cyan-400/8 text-[11px] text-cyan-100 hover:bg-cyan-400/15'
                disabled={isThinking}
                onClick={() => void handleSend(starter)}
              >
                <Sparkles className='h-3 w-3' />
                {node ? '先解释这个知识点' : '给我学习建议'}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='shrink-0 rounded-full border-white/10 bg-slate-900/60 text-[11px] text-slate-300 hover:bg-slate-800'
                disabled={isThinking}
                onClick={() => setPrompt('这个知识点和实际遥感项目有什么联系？')}
              >
                <MessageCircle className='h-3 w-3' />
                联系实际
              </Button>
            </div>

            <div className='mt-2.5 rounded-2xl border border-white/10 bg-slate-900/70 p-2'>
              <div className='flex items-end gap-2'>
                <Textarea
                  value={prompt}
                  rows={1}
                  placeholder={node ? `围绕「${node.name}」继续提问…` : '问问小遇…'}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  className='min-h-10 resize-none border-0 bg-transparent px-2 py-2 text-xs text-slate-100 shadow-none focus-visible:ring-0'
                  disabled={isThinking}
                />
                <Button
                  type='button'
                  size='icon'
                  aria-label={t('发送消息')}
                  className='h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-cyan-500/15 hover:brightness-110'
                  disabled={!prompt.trim() || isThinking}
                  onClick={() => void handleSend()}
                >
                  <Send className='h-4 w-4' />
                </Button>
              </div>
              <div className='mt-1 flex items-center justify-between px-2 text-[10px] text-slate-500'>
                <span>回答会结合当前节点与知识库资料</span>
                <button
                  type='button'
                  className='inline-flex items-center gap-1 hover:text-slate-300'
                  onClick={() => void handleNewConversation()}
                >
                  <Plus className='h-3 w-3' />
                  新对话
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isOpen && (
        <div
          className='group relative flex h-[108px] w-[108px] cursor-grab items-center justify-center rounded-[34px] border border-cyan-200/25 bg-gradient-to-br from-sky-400/20 via-violet-500/20 to-fuchsia-500/15 shadow-[0_16px_44px_rgba(14,165,233,0.32),inset_0_0_24px_rgba(255,255,255,0.08)] backdrop-blur-xl active:cursor-grabbing'
          onPointerDown={handlePointerDown}
          role='button'
          tabIndex={0}
          aria-label={t('打开小遇桌宠')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') toggle()
          }}
        >
          <div className='absolute inset-1 rounded-[30px] border border-white/10' />
          <div className='relative flex h-[102px] w-[102px] items-center justify-center overflow-hidden rounded-[30px] bg-slate-950/20 shadow-[0_0_28px_rgba(34,211,238,0.22)] transition-transform duration-300 group-hover:scale-105'>
            <img
              src='/images/xiaoyu-companion.png'
              alt='小遇桌宠'
              draggable={false}
              className='pointer-events-none h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(2,8,23,0.42)]'
            />
            <span className='absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950 bg-emerald-400'>
              <span className='h-1.5 w-1.5 rounded-full bg-white' />
            </span>
          </div>
          <div className='pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/90 px-2 py-1 text-[10px] whitespace-nowrap text-slate-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100'>
            {node ? `已选中：${node.name}` : '和小遇聊聊'}
          </div>
          <ChevronDown className='absolute -right-1 -bottom-1 h-4 w-4 rotate-180 rounded-full border border-slate-950 bg-cyan-300 p-0.5 text-slate-950' />
        </div>
      )}
    </div>
  )
}
