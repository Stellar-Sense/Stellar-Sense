import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  Compass,
  Loader2,
  MessageSquareText,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { streamChat } from '@/lib/chat-stream'
import { t, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { CompanionEvidence } from '@/components/companion-evidence'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { useDashboardSummary } from '@/features/dashboard/api'
import {
  useConversations,
  useCreateConversation,
  type ChatMessage,
  type Conversation,
} from './api'

const featureBadges = ['知识问答', '学习规划', '错题解析', '知识总结'] as const

const quickQuestions = [
  '什么是遥感影像增强？',
  'Transformer 为什么适合遥感？',
  'CNN 和 Transformer 有什么区别？',
  '遥感大模型应该怎么学？',
] as const

const recommendations = [
  {
    title: '继续学习：Transformer 基础',
    estimate: '45 分钟',
    route: '/node-learning',
    accent: 'blue',
  },
  {
    title: '复习：GDAL 数据处理',
    estimate: '30 分钟',
    route: '/node-learning',
    accent: 'purple',
  },
  {
    title: '实践：完成一次遥感影像增强实验',
    estimate: '60 分钟',
    route: '/path-planning',
    accent: 'cyan',
  },
] as const

const capabilityList = [
  '知识问答',
  '学习规划',
  '错题分析',
  '学习总结',
  '代码辅导',
] as const

// 本地自增消息 id 生成器：避免在组件内调用 Date.now() 这类不纯函数（react-hooks/purity）
let localIdSeed = 1000
const nextLocalId = () => {
  localIdSeed += 1
  return localIdSeed
}

export function AIAssistant() {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const { conversationId: requestedConversationId } = useSearch({
    from: '/_authenticated/ai-assistant/',
  })
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)
  const queryClient = useQueryClient()
  const { data: serverConversations } = useConversations()
  const { data: dashboard } = useDashboardSummary()
  const createConversation = useCreateConversation()
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(requestedConversationId ?? null)
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const streamedRef = useRef('')

  const list = useMemo(() => serverConversations ?? [], [serverConversations])
  const selectedConversation =
    list.find((conversation) => conversation.id === selectedConversationId) ??
    list[0]

  const updateConversations = (
    updater: (previous: Conversation[]) => Conversation[]
  ) => {
    queryClient.setQueryData<Conversation[]>(
      ['ai', 'conversations'],
      (previous) => updater(previous ?? [])
    )
  }

  const learningContext = useMemo(
    () => ({
      nodeId: selectedConversation?.context?.node_id,
      learnerLevel: selectedConversation?.context?.learner_level ?? 'beginner',
      scene: selectedConversation?.context?.scene ?? 'preview',
      stage:
        selectedConversation?.context?.stage ??
        dashboard?.stats[3]?.value ??
        '遥感影像处理',
      node:
        selectedConversation?.context?.node ??
        dashboard?.suggestion.topic ??
        '图像增强',
      progress:
        selectedConversation?.context?.progress ??
        dashboard?.stats[2]?.value ??
        '68%',
    }),
    [dashboard, selectedConversation?.context]
  )

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [list, selectedConversationId, streamingText])

  if (!selectedConversation) {
    return (
      <>
        <Header>
          <Search className='me-auto' />

          <ProfileDropdown />
        </Header>

        <Main
          fixed
          className='relative overflow-hidden px-4 py-3 md:px-5 md:py-4'
        >
          <div className='flex h-full items-center justify-center text-sm text-slate-400'>
            {t('正在加载对话…')}
          </div>
        </Main>
      </>
    )
  }

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  const handleCreateConversation = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conversation) => {
        updateConversations((prev) => [conversation, ...prev])
        setSelectedConversationId(conversation.id)
      },
    })
  }

  const handleSendMessage = (customQuestion?: string) => {
    const normalizedQuestion = (customQuestion ?? prompt).trim()
    if (!normalizedQuestion || isThinking) return

    const conversationId = selectedConversation.id
    const userMessage: ChatMessage = {
      id: nextLocalId(),
      role: 'user',
      content: normalizedQuestion,
    }

    updateConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title:
                conversation.title === '新对话'
                  ? normalizedQuestion.slice(0, 18) || '新对话'
                  : conversation.title,
              messages: [...conversation.messages, userMessage],
            }
          : conversation
      )
    )

    setPrompt('')
    setIsThinking(true)
    setStreamingText('')
    streamedRef.current = ''

    void streamChat(
      {
        conversationId,
        message: normalizedQuestion,
        context: learningContext,
      },
      {
        onDelta: (delta) => {
          streamedRef.current += delta
          setStreamingText(streamedRef.current)
        },
        onDone: ({
          messageId,
          conversationId: doneConversationId,
          title,
          metadata,
        }) => {
          const content = streamedRef.current
          updateConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === doneConversationId
                ? {
                    ...conversation,
                    title: title || conversation.title,
                    context: metadata?.context ?? conversation.context,
                    messages: [
                      ...conversation.messages,
                      { id: messageId, role: 'assistant', content, metadata },
                    ],
                  }
                : conversation
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

  return (
    <>
      <Header>
        <Search className='me-auto' />

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
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(168,85,247,0.08),transparent_24%)]' />
        </div>

        <div className='relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <div className='shrink-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex min-w-0 flex-wrap items-center gap-3'>
                <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] text-sky-200 uppercase'>
                  <Sparkles className='h-3 w-3' />
                  {t('AI 学习助手')}
                </span>
                <h1 className='text-lg font-bold tracking-tight text-white md:text-xl'>
                  {t('你的专属遥感学习伙伴')}
                </h1>
              </div>
              <div className='flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200'>
                <span className='h-2 w-2 rounded-full bg-emerald-400' />
                {t('小遇伴学')}
              </div>
            </div>
          </div>

          <div className='grid min-h-0 gap-3 xl:flex-1 xl:grid-cols-[280px_minmax(0,1fr)_340px]'>
            <aside className='flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-950/65 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-200'>
                    <Bot className='h-4 w-4' />
                  </div>
                  <div>
                    <div className='text-sm font-semibold text-white'>
                      {t('AI 学习助手')}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type='button'
                className='mt-3 h-9 w-full justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400'
                onClick={handleCreateConversation}
              >
                <Plus className='mr-2 h-4 w-4' />
                {t('新建对话')}
              </Button>

              <div className='mt-3 flex min-h-0 flex-1 flex-col'>
                <div className='mb-2 text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase'>
                  {t('最近对话')}
                </div>
                <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
                  {list.map((conversation) => (
                    <button
                      key={conversation.id}
                      type='button'
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        'flex w-full flex-col rounded-xl border px-3 py-2 text-left transition-all',
                        selectedConversationId === conversation.id
                          ? 'border-violet-400/30 bg-violet-500/10'
                          : 'border-slate-800 bg-slate-900/35 hover:border-slate-700 hover:bg-slate-900/55'
                      )}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate text-sm font-medium text-white'>
                          {conversation.title}
                        </span>
                        <Badge
                          variant='secondary'
                          className='rounded-full border border-slate-700 bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-200'
                        >
                          {conversation.category}
                        </Badge>
                      </div>
                      <div className='mt-1 line-clamp-2 text-xs text-slate-400'>
                        {conversation.messages[conversation.messages.length - 1]
                          ?.content ?? t('暂无内容')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className='mt-3 shrink-0'>
                <div className='mb-2 text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase'>
                  {t('功能分类')}
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {featureBadges.map((tag) => (
                    <Badge
                      key={tag}
                      variant='outline'
                      className='rounded-full border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[10px] tracking-[0.14em] text-slate-200 uppercase'
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </aside>

            <main className='flex min-h-0 flex-col gap-3'>
              <Card className='flex min-h-0 flex-1 flex-col gap-0 border border-white/10 bg-slate-950/65 py-0 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
                <CardHeader className='shrink-0 px-4 pt-3.5 pb-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex items-center gap-2.5'>
                      <div className='flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-200'>
                        <MessageSquareText className='h-4 w-4' />
                      </div>
                      <div>
                        <div className='text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase'>
                          {t('AI 学习助手')}
                        </div>
                        <CardTitle className='mt-0.5 text-base font-semibold text-white'>
                          {selectedConversation.title}
                        </CardTitle>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 text-xs text-slate-300'>
                      <div className='rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1'>
                        {t('当前节点：')}
                        {learningContext.node}
                      </div>
                      <div className='rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1'>
                        {t('当前学习阶段：')}
                        {learningContext.stage}
                      </div>
                      <div className='rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-violet-200'>
                        {t('学习进度：')}
                        {learningContext.progress}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='flex min-h-0 flex-1 flex-col px-4 pb-3.5'>
                  <div className='mb-2.5 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-xs leading-5 text-slate-300'>
                    <div className='flex items-center gap-2 text-slate-200'>
                      <BookOpen className='h-3.5 w-3.5 text-sky-300' />
                      {t('当前上下文')}
                    </div>
                    <div className='mt-1.5 flex flex-wrap gap-1.5 text-[11px]'>
                      <span className='rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1'>
                        {t('当前节点：')}
                        {learningContext.node}
                      </span>
                      <span className='rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1'>
                        {t('当前学习阶段：')}
                        {learningContext.stage}
                      </span>
                      <span className='rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-violet-200'>
                        {t('学习进度：')}
                        {learningContext.progress}
                      </span>
                    </div>
                  </div>

                  <div className='min-h-0 flex-1 rounded-2xl border border-slate-800 bg-slate-950/40 p-3'>
                    <ScrollArea className='h-full pr-2'>
                      <div className='space-y-3'>
                        {selectedConversation.messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              message.role === 'user'
                                ? 'justify-end'
                                : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-7',
                                message.role === 'assistant'
                                  ? 'border border-slate-700 bg-slate-900/80 text-slate-200'
                                  : 'border border-sky-500/25 bg-sky-500/10 text-sky-50'
                              )}
                            >
                              {message.content
                                .split('\n')
                                .map((line, index) => (
                                  <div key={`${message.id}-${index}`}>
                                    {line || ' '}
                                  </div>
                                ))}
                              <CompanionEvidence metadata={message.metadata} />
                            </div>
                          </div>
                        ))}

                        {isThinking && streamingText && (
                          <div className='flex justify-start'>
                            <div className='max-w-[88%] rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm leading-7 text-slate-200'>
                              {streamingText.split('\n').map((line, index) => (
                                <div key={`streaming-${index}`}>
                                  {line || ' '}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isThinking && !streamingText && (
                          <div className='flex justify-start'>
                            <div className='flex max-w-[88%] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-300'>
                              <Loader2 className='h-3.5 w-3.5 animate-spin text-sky-300' />
                              {t('AI 正在思考……')}
                            </div>
                          </div>
                        )}

                        <div ref={endOfMessagesRef} />
                      </div>
                    </ScrollArea>
                  </div>

                  <div className='mt-2.5 flex shrink-0 flex-wrap gap-1.5'>
                    {quickQuestions.map((question) => (
                      <Button
                        key={question}
                        type='button'
                        variant='outline'
                        size='sm'
                        className='rounded-full border-slate-700 bg-slate-900/50 text-xs text-slate-200 hover:bg-slate-800'
                        onClick={() => handleSendMessage(question)}
                      >
                        {t(question)}
                      </Button>
                    ))}
                  </div>

                  <div className='mt-2.5 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5'>
                    <div className='flex items-end gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='h-9 w-9 rounded-xl border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-800'
                        aria-label={t('添加资料')}
                      >
                        <Paperclip className='h-4 w-4' />
                      </Button>

                      <Textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder={t(
                          '输入你的问题，例如：帮我解释一下 Transformer 的 Self-Attention'
                        )}
                        className='min-h-[44px] flex-1 resize-none rounded-xl border-slate-700 bg-slate-950/70 text-sm text-white placeholder:text-slate-400'
                      />

                      <Button
                        type='button'
                        className='h-9 w-9 rounded-xl bg-violet-500 text-white hover:bg-violet-400'
                        onClick={() => handleSendMessage()}
                        disabled={!prompt.trim()}
                      >
                        <Send className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </main>

            <aside className='min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/65 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <div className='space-y-3'>
                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <Target className='h-4 w-4 text-sky-300' />
                    {t('我的学习状态')}
                  </div>

                  <div className='mt-2.5 space-y-2 text-sm'>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-400'>{t('当前阶段')}</span>
                      <span className='text-white'>
                        {learningContext.stage}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-400'>{t('当前节点')}</span>
                      <span className='text-white'>{learningContext.node}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-400'>{t('总体掌握度')}</span>
                      <span className='text-sky-200'>
                        {learningContext.progress}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <Compass className='h-4 w-4 text-violet-300' />
                    {t('AI 为你推荐')}
                  </div>

                  <div className='mt-2.5 space-y-2'>
                    {recommendations.map((item) => (
                      <button
                        key={item.title}
                        type='button'
                        onClick={() =>
                          navigate({
                            to: item.route as
                              | '/node-learning'
                              | '/path-planning',
                          })
                        }
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all',
                          item.accent === 'blue' &&
                            'border-sky-500/20 bg-sky-500/8 hover:bg-sky-500/12',
                          item.accent === 'purple' &&
                            'border-violet-500/20 bg-violet-500/8 hover:bg-violet-500/12',
                          item.accent === 'cyan' &&
                            'border-cyan-500/20 bg-cyan-500/8 hover:bg-cyan-500/12'
                        )}
                      >
                        <div>
                          <div className='text-sm font-medium text-white'>
                            {t(item.title)}
                          </div>
                          <div className='mt-1 text-xs text-slate-300'>
                            {t('预计：')}
                            {t(item.estimate)}
                          </div>
                        </div>
                        <ChevronRight className='mt-1 h-4 w-4 text-slate-300' />
                      </button>
                    ))}
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <BrainCircuit className='h-4 w-4 text-emerald-300' />
                    {t('AI 能力')}
                  </div>

                  <div className='mt-2.5 space-y-2'>
                    {capabilityList.map((item) => (
                      <div
                        key={item}
                        className='flex items-center justify-between gap-3'
                      >
                        <span className='text-sm text-slate-200'>
                          {t(item)}
                        </span>
                        <span className='flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-200'>
                          <span className='text-[10px]'>✓</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </Main>
    </>
  )
}
