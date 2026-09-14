import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquareText,
  Sparkles,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { streamChat, type CompanionMetadata } from '@/lib/chat-stream'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CompanionEvidence } from '@/components/companion-evidence'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useExplainNode, useLearningNode, useLearningNodes } from './api'
import { NodeAssessment } from './assessment'

type NodeStatus = 'done' | 'current' | 'todo'

type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  metadata?: CompanionMetadata
}

const quickQuestions = [
  '这个我没懂，能简单解释一下吗？',
  '这个知识点有哪些容易混淆的地方？',
  '请根据资料给我一个自测建议。',
]

const statusClassMap: Record<NodeStatus, string> = {
  done: 'border-emerald-400/30 bg-emerald-500/8 text-emerald-200',
  current: 'border-violet-400/40 bg-violet-500/10 text-violet-100',
  todo: 'border-slate-700 bg-slate-900/50 text-slate-400',
}

// 本地自增消息 id 生成器（服务端返回的消息 id 不与本地冲突）
let localIdSeed = 1000
const nextLocalId = () => {
  localIdSeed += 1
  return localIdSeed
}

export function NodeLearning() {
  const navigate = useNavigate()
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [level, setLevel] = useState<'beginner' | 'advanced'>('beginner')
  const [explanationMetadata, setExplanationMetadata] =
    useState<CompanionMetadata>()

  const { nodeId: requestedNodeId } = useSearch({
    from: '/_authenticated/node-learning/',
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    requestedNodeId ?? null
  )
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content:
        '你好，我是你的遥感学习助手。如果你对当前节点有疑问，可以直接问我。',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isAiReplying, setIsAiReplying] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [explanationText, setExplanationText] = useState<string | null>(null)
  const streamedRef = useRef('')
  const answerListRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = answerListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, streamingText, isAiReplying])
  const assessmentRef = useRef<HTMLDivElement | null>(null)

  const { data: overview } = useLearningNodes()
  const explainNode = useExplainNode()

  const nodeStatuses = useMemo(() => {
    const statuses: Record<string, NodeStatus> = {}
    for (const group of overview?.groups ?? []) {
      for (const item of group.items) {
        statuses[item.id] = item.status
      }
    }
    return statuses
  }, [overview])

  // 支持从星图等入口携带 nodeId 直达指定节点；未知节点回退到当前学习节点
  const effectiveNodeId = useMemo(() => {
    if (overview && selectedNodeId && nodeStatuses[selectedNodeId]) {
      return selectedNodeId
    }
    return overview?.currentNodeId ?? overview?.sequence[0] ?? null
  }, [nodeStatuses, overview, selectedNodeId])

  const { data: selectedNode } = useLearningNode(effectiveNodeId)

  const groups = useMemo(() => overview?.groups ?? [], [overview])

  const currentProgress = useMemo(() => {
    const items = overview?.groups.flatMap((group) => group.items) ?? []
    if (items.length === 0) return 0
    const doneCount = items.filter((item) => item.status === 'done').length
    return Math.round((doneCount / items.length) * 100)
  }, [overview])

  if (!selectedNode) {
    return (
      <>
        <Header>
          <Search className='me-auto' />
          <ThemeSwitch />
          <ProfileDropdown />
        </Header>

        <Main
          fixed
          className='relative overflow-hidden px-4 py-3 md:px-5 md:py-4'
        >
          <div className='flex h-full items-center justify-center text-sm text-slate-400'>
            正在加载节点内容…
          </div>
        </Main>
      </>
    )
  }

  const sequence = overview?.sequence ?? []

  const handleSelectNode = (nodeId: string) => {
    if (isAiReplying) return
    setConversationId(undefined)
    setMessages([])
    setSelectedNodeId(nodeId)
    setExplanationText(null)
  }

  const handlePreviousNode = () => {
    if (isAiReplying) return
    setConversationId(undefined)
    setMessages([])
    const index = sequence.indexOf(selectedNode.id)
    const nextIndex = Math.max(index - 1, 0)
    setSelectedNodeId(sequence[nextIndex])
    setExplanationText(null)
  }

  const handleNextNode = () => {
    if (isAiReplying) return
    setConversationId(undefined)
    setMessages([])
    const index = sequence.indexOf(selectedNode.id)
    const nextIndex = Math.min(index + 1, sequence.length - 1)
    setSelectedNodeId(sequence[nextIndex])
    setExplanationText(null)
  }

  const handleMarkCompleted = () => {
    assessmentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleAIDescribe = () => {
    setExplanationText(null)
    explainNode.mutate(
      { nodeId: selectedNode.id, learnerLevel: level },
      {
        onSuccess: (data) => {
          setExplanationText(data.explanation)
          setExplanationMetadata(data.metadata)
        },
      }
    )
  }

  const handleSendMessage = (customQuestion?: string) => {
    const nextQuestion = (customQuestion ?? chatInput).trim()
    if (!nextQuestion || isAiReplying) return

    setMessages((prev) => [
      ...prev,
      { id: nextLocalId(), role: 'user', content: nextQuestion },
    ])
    setChatInput('')
    setIsAiReplying(true)
    setStreamingText('')
    streamedRef.current = ''

    void streamChat(
      {
        conversationId,
        message: nextQuestion,
        context: {
          nodeId: selectedNode.id,
          learnerLevel: level,
          node: selectedNode.title,
          stage: selectedNode.breadcrumb.split(' / ')[0],
          progress: `${selectedNode.progress}%`,
        },
      },
      {
        onDelta: (delta) => {
          streamedRef.current += delta
          setStreamingText(streamedRef.current)
        },
        onDone: ({ messageId, conversationId: id, metadata }) => {
          setConversationId(id)
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              role: 'assistant',
              content: streamedRef.current,
              metadata,
            },
          ])
          setIsAiReplying(false)
          setStreamingText('')
        },
        onError: (message) => {
          toast.error(message)
          setIsAiReplying(false)
          setStreamingText('')
        },
      }
    )
  }

  const handleChatKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendMessage()
    }
  }

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main
        fixed
        className='relative overflow-hidden px-4 py-3 md:px-5 md:py-4'
      >
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
          <div className='absolute top-6 -left-8 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl' />
          <div className='absolute top-10 right-8 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl' />
          <div className='absolute bottom-6 left-1/3 h-52 w-52 rounded-full bg-cyan-400/8 blur-3xl' />
        </div>

        <div className='relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <div className='shrink-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex min-w-0 flex-wrap items-center gap-3'>
                <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] text-sky-200 uppercase'>
                  <BookOpen className='h-3 w-3' />
                  节点学习
                </span>
                <h1 className='text-lg font-bold tracking-tight text-white md:text-xl'>
                  {selectedNode.title}
                </h1>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <div className='inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-violet-200 uppercase'>
                  <Sparkles className='h-3 w-3' />
                  学习进度 {selectedNode.progress}%
                </div>
                <div className='inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300'>
                  <Clock3 className='h-3.5 w-3.5 text-sky-300' />
                  预计学习时间 {selectedNode.duration}
                </div>
              </div>
            </div>
          </div>

          <div className='grid min-h-0 gap-3 xl:flex-1 xl:grid-cols-[270px_minmax(0,1fr)_340px]'>
            <aside className='flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/65 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <div className='mb-2 flex items-center justify-between'>
                <h2 className='text-sm font-semibold tracking-[0.18em] text-slate-300 uppercase'>
                  节点学习
                </h2>
                <span className='rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300'>
                  {currentProgress}%
                </span>
              </div>

              <div className='mb-2.5 rounded-2xl border border-slate-800 bg-slate-900/50 p-2.5'>
                <div className='text-[10px] tracking-[0.18em] text-slate-400 uppercase'>
                  遥感影像处理
                </div>
                <div className='mt-1 text-xs text-slate-200'>
                  学习进度：{currentProgress}%
                </div>
                <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800'>
                  <div
                    className='h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400'
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>

              <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
                {groups.map((group) => (
                  <div key={group.group} className='space-y-2'>
                    <div className='px-2 text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase'>
                      {group.group}
                    </div>
                    <div className='space-y-1.5'>
                      {group.items.map((item) => {
                        const isSelected = selectedNodeId === item.id
                        const status = nodeStatuses[item.id] ?? item.status
                        const isCurrent = status === 'current'

                        return (
                          <button
                            key={item.id}
                            type='button'
                            onClick={() => handleSelectNode(item.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all duration-200',
                              isSelected
                                ? 'border-violet-400/40 bg-violet-500/10'
                                : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/45',
                              isCurrent &&
                                'border-violet-400/40 bg-violet-500/10'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                                statusClassMap[status]
                              )}
                            >
                              {status === 'done' ? (
                                <Check className='h-3 w-3' />
                              ) : status === 'current' ? (
                                '●'
                              ) : (
                                '○'
                              )}
                            </span>
                            <span
                              className={cn(
                                'flex-1 text-sm',
                                isSelected ? 'text-white' : 'text-slate-300'
                              )}
                            >
                              {item.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <main className='flex min-h-0 flex-col gap-3'>
              <Card className='flex min-h-0 flex-1 flex-col gap-0 border border-white/10 bg-slate-950/65 py-0 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
                <CardHeader className='shrink-0 px-4 pt-3.5 pb-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='min-w-0'>
                      <div className='truncate text-[10px] font-medium tracking-[0.2em] text-sky-200 uppercase'>
                        {selectedNode.breadcrumb}
                      </div>
                      <CardTitle className='mt-1 text-lg font-bold text-white'>
                        {selectedNode.title}
                      </CardTitle>
                    </div>
                    <div className='inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-violet-200 uppercase'>
                      本节学习进度 {selectedNode.progress}%
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3.5'>
                  <p className='text-sm text-slate-300'>
                    {selectedNode.summary}
                  </p>

                  <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                    <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                      <Target className='h-4 w-4 text-sky-300' />
                      学习目标
                    </div>
                    <ul className='mt-2 space-y-1.5 text-xs text-slate-300'>
                      {selectedNode.objectives.map((item) => (
                        <li key={item} className='flex items-start gap-2'>
                          <span className='mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-400' />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                    <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                      <BrainCircuit className='h-4 w-4 text-violet-300' />
                      核心知识
                    </div>
                    <p className='mt-2 text-xs leading-5 text-slate-300'>
                      {selectedNode.concept}
                    </p>
                  </div>

                  <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                        <Sparkles className='h-4 w-4 text-sky-300' />
                        常见方法
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 rounded-lg border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-800'
                        onClick={handleAIDescribe}
                      >
                        {explainNode.isPending ? (
                          <>
                            <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                            AI 正在分析这个知识点……
                          </>
                        ) : (
                          '让 AI 解释'
                        )}
                      </Button>
                    </div>

                    <div className='mt-3 flex flex-wrap gap-1.5'>
                      {selectedNode.methods.map((method) => (
                        <span
                          key={method}
                          className='rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-xs text-slate-200'
                        >
                          {method}
                        </span>
                      ))}
                    </div>

                    {explanationText && (
                      <div className='mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/8 p-3 text-xs leading-5 text-violet-100'>
                        {explanationText}
                        <CompanionEvidence metadata={explanationMetadata} />
                      </div>
                    )}
                  </div>

                  <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                    <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                      <MessageSquareText className='h-4 w-4 text-emerald-300' />
                      遥感案例
                    </div>
                    <div className='mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]'>
                      <div className='rounded-2xl border border-slate-700 bg-slate-950/70 p-3'>
                        <div className='text-sm font-semibold text-white'>
                          {selectedNode.caseTitle}
                        </div>
                        <p className='mt-2 text-xs leading-5 text-slate-300'>
                          {selectedNode.caseSummary}
                        </p>
                      </div>

                      <div className='overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 p-3'>
                        <div className='relative h-28 overflow-hidden rounded-xl border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.26),transparent_28%),radial-gradient(circle_at_70%_30%,rgba(168,85,247,0.30),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.88),rgba(15,118,110,0.35))]'>
                          <div className='absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:24px_24px]' />
                          <div className='absolute inset-0 opacity-90 [background:radial-gradient(circle_at_22%_22%,rgba(96,165,250,0.40),transparent_18%),radial-gradient(circle_at_72%_30%,rgba(45,212,191,0.28),transparent_20%),radial-gradient(circle_at_50%_70%,rgba(168,85,247,0.36),transparent_26%)]' />
                          <div className='absolute top-6 right-6 bottom-6 left-6 rounded-2xl border border-sky-400/25 bg-slate-950/30 backdrop-blur-sm' />
                        </div>
                        <div className='mt-2 text-center text-[11px] tracking-[0.18em] text-slate-400 uppercase'>
                          原始影像 → 增强后影像
                        </div>
                      </div>
                    </div>
                  </div>
                  <div ref={assessmentRef}>
                    <NodeAssessment
                      key={selectedNode.id}
                      nodeId={selectedNode.id}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3'>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-xl border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-900'
                  onClick={handlePreviousNode}
                >
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  上一个节点
                </Button>

                <div className='flex flex-wrap items-center gap-3'>
                  <Button
                    type='button'
                    variant='outline'
                    className='rounded-xl border-violet-500/30 bg-violet-500/8 text-violet-100 hover:bg-violet-500/15'
                    onClick={handleMarkCompleted}
                  >
                    进入学习评价
                  </Button>
                  <Button
                    type='button'
                    className='rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400'
                    onClick={handleNextNode}
                  >
                    下一个节点
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </div>
              </div>
            </main>

            <aside className='flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-950/65 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-200'>
                    <Sparkles className='h-4 w-4' />
                  </div>
                  <div>
                    <div className='text-sm font-semibold text-white'>
                      AI 学习助手
                    </div>
                    <div className='mt-0.5 flex items-center gap-1 text-[11px] text-emerald-300'>
                      <span className='h-2 w-2 rounded-full bg-emerald-400' />
                      在线
                    </div>
                  </div>
                </div>
              </div>

              <div className='mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs leading-5 text-slate-300'>
                <p>你好，我是小遇，你的遥感学习助手。</p>
                <label className='mt-2 block'>
                  讲解深度：
                  <select
                    aria-label='讲解深度'
                    value={level}
                    disabled={isAiReplying}
                    onChange={(e) =>
                      setLevel(e.target.value as 'beginner' | 'advanced')
                    }
                    className='rounded bg-slate-800 p-1'
                  >
                    <option value='beginner'>入门</option>
                    <option value='advanced'>进阶</option>
                  </select>
                </label>
                {conversationId && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='mt-2'
                    disabled={isAiReplying}
                    onClick={() =>
                      navigate({
                        to: '/ai-assistant',
                        search: { conversationId },
                      })
                    }
                  >
                    在完整助手中继续
                  </Button>
                )}
                <p className='mt-2'>如果你对当前知识点有疑问，可以直接问我。</p>
                <p className='mt-2'>当前主题：{selectedNode.title}</p>
              </div>

              <div className='mt-3 shrink-0 space-y-1.5'>
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type='button'
                    className='flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-900'
                    onClick={() => handleSendMessage(question)}
                  >
                    <span>{question}</span>
                    <ChevronRight className='h-4 w-4 text-slate-400' />
                  </button>
                ))}
              </div>

              <div className='mt-3 flex min-h-[320px] flex-1 shrink-0 flex-col rounded-2xl border border-slate-800 bg-slate-950/40 p-3'>
                <p className='mb-2 shrink-0 text-xs font-medium text-violet-200'>
                  小遇的回答
                </p>
                <div
                  ref={answerListRef}
                  role='log'
                  aria-label='小遇的回答'
                  className='h-60 min-h-[220px] flex-1 space-y-3 overflow-y-auto pr-1'
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6',
                        message.role === 'assistant'
                          ? 'border border-slate-700 bg-slate-900/80 text-slate-200'
                          : 'ml-auto border border-sky-500/25 bg-sky-500/10 text-sky-50'
                      )}
                    >
                      {message.content}
                      <CompanionEvidence metadata={message.metadata} />
                    </div>
                  ))}

                  {isAiReplying && streamingText && (
                    <div className='max-w-[90%] rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm leading-6 text-slate-200'>
                      {streamingText}
                    </div>
                  )}

                  {isAiReplying && !streamingText && (
                    <div className='flex max-w-[90%] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300'>
                      <Loader2 className='h-3.5 w-3.5 animate-spin text-sky-300' />
                      AI 正在思考……
                    </div>
                  )}
                </div>

                <div className='mt-3 flex shrink-0 items-center gap-2'>
                  <Input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder='输入你的问题...'
                    className='h-9 rounded-xl border-slate-700 bg-slate-950/70 text-sm text-white placeholder:text-slate-400'
                  />
                  <Button
                    type='button'
                    className='h-9 rounded-xl bg-violet-500 text-white hover:bg-violet-400'
                    onClick={() => handleSendMessage()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </Main>
    </>
  )
}
