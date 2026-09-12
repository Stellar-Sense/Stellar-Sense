import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

type Conversation = {
  id: string
  title: string
  category: string
  messages: ChatMessage[]
}

const featureBadges = [
  '知识问答',
  '学习规划',
  '错题解析',
  '知识总结',
] as const

const quickQuestions = [
  '什么是遥感影像增强？',
  'Transformer 为什么适合遥感？',
  'CNN 和 Transformer 有什么区别？',
  '遥感大模型应该怎么学？',
] as const

const initialConversations: Conversation[] = [
  {
    id: 'image-enhance',
    title: '遥感影像增强怎么学习？',
    category: '知识问答',
    messages: [
      {
        id: 1,
        role: 'assistant',
        content:
          '你好，我是你的遥感学习助手。我可以帮助你：\n• 解释遥感专业知识\n• 制定学习路径\n• 分析知识薄弱点\n• 解答代码问题\n• 总结学习内容\n你可以直接问我。',
      },
      {
        id: 2,
        role: 'user',
        content: '什么是直方图均衡化？',
      },
      {
        id: 3,
        role: 'assistant',
        content:
          '直方图均衡化是一种常见的图像增强方法，它通过重新分配图像像素的灰度分布，提高图像整体的对比度。\n在遥感影像处理中，它可以帮助突出地物之间的差异，方便后续的特征提取和分类。\n结合你当前正在学习的图像增强，建议你继续了解 CLAHE 和局部对比度增强。',
      },
    ],
  },
  {
    id: 'transformer-guide',
    title: 'Transformer 学习路线',
    category: '学习规划',
    messages: [
      {
        id: 1,
        role: 'assistant',
        content:
          'Transformer 的学习路线可以分成 4 个阶段：基础概念 → 结构理解 → 遥感案例 → 实践训练。你现在已经具备 CNN 和图像处理基础，下一步最适合直接学习 Self-Attention。',
      },
    ],
  },
  {
    id: 'cnn-vs-transformer',
    title: 'CNN 和 Transformer 的区别',
    category: '知识问答',
    messages: [
      {
        id: 1,
        role: 'assistant',
        content:
          'CNN 更擅长提取局部空间特征，而 Transformer 更擅长建模全局关系。遥感任务中，前者适合细粒度局部识别，后者适合理解大范围上下文。',
      },
    ],
  },
  {
    id: 'llm-intro',
    title: '遥感大模型入门',
    category: '学习规划',
    messages: [
      {
        id: 1,
        role: 'assistant',
        content:
          '想学遥感大模型，建议从“预训练基础 + 任务迁移 + 实验落地”三步入手。先建立通用模型理解，再结合遥感数据做微调和评估。',
      },
    ],
  },
  {
    id: 'python-remote',
    title: 'Python 遥感数据处理',
    category: '知识总结',
    messages: [
      {
        id: 1,
        role: 'assistant',
        content:
          'Python 在遥感数据处理中主要负责读取、清洗、可视化和统计分析。NumPy 和 Pandas 负责数值与表格处理，GDAL 负责栅格数据读取与转换。',
      },
    ],
  },
]

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

const generateMockReply = (question: string) => {
  const normalized = question.toLowerCase()

  if (normalized.includes('直方图均衡化')) {
    return '直方图均衡化是一种常见的图像增强方法，它通过重新分配图像像素的灰度分布，提升图像整体的对比度。\n在遥感影像处理里，它能帮助突出地物之间的差异，便于后续特征提取和分类。\n如果你正在学习图像增强，可以再补充 CLAHE 和局部对比度增强的差异。'
  }

  if (normalized.includes('transformer')) {
    return 'Transformer 之所以适合遥感，是因为它能建立远距离空间依赖关系。\n遥感图像通常覆盖大面积区域，目标之间常常存在跨区域语义关联。\nSelf-Attention 能够让模型在图像中建立“全局理解”，而不仅仅看局部纹理。'
  }

  if (normalized.includes('cnn') && normalized.includes('transformer')) {
    return 'CNN 更擅长提取局部特征，例如边缘、纹理和细节；Transformer 更擅长建模全局关系，例如不同区域间的语义关联。\n在遥感任务中，CNN 适合细粒度局部识别，而 Transformer 通常在大范围场景理解和复杂上下文建模中更有优势。'
  }

  if (normalized.includes('大模型')) {
    return '遥感大模型的学习路线可以分为三步：\n1）先理解模型基础，如预训练、微调和迁移学习；\n2）再结合遥感任务分析数据与标注；\n3）最后进行专项实验与评估。\n建议你从遥感基础模型和多模态理解开始，而不是直接上复杂网络。'
  }

  if (normalized.includes('图像增强')) {
    return '遥感影像增强的核心目标是提升可见性，让地表特征更容易被识别。\n常见做法包括对比度增强、去噪、锐化和直方图均衡化。\n在你的学习阶段中，重点不是记住所有算法，而是理解它们分别解决什么样的图像问题。'
  }

  return '从你的当前学习阶段来看，建议优先把“概念理解”和“案例关联”结合起来。\n你可以把这个问题拆成：它解决了什么问题、适合什么数据、和前一个知识点有什么联系。\n这样能帮助你更快建立遥感知识图谱。'
}

export function AIAssistant() {
  const navigate = useNavigate()
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedConversationId, setSelectedConversationId] = useState('image-enhance')
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ??
    conversations[0]

  const learningContext = useMemo(
    () => ({
      stage: '遥感影像处理',
      node: '图像增强',
      progress: '68%',
    }),
    []
  )

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, selectedConversationId])

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  const handleCreateConversation = () => {
    const nextId = `conversation-${nextLocalId()}`
    const newConversation: Conversation = {
      id: nextId,
      title: '新对话',
      category: '知识问答',
      messages: [
        {
          id: 1,
          role: 'assistant',
          content:
            '你好，我是你的遥感学习助手。新的学习会话已开始。你可以直接提出问题，我会给出学习建议和知识解释。',
        },
      ],
    }

    setConversations((prev) => [newConversation, ...prev])
    setSelectedConversationId(nextId)
  }

  const handleSendMessage = (customQuestion?: string) => {
    const normalizedQuestion = (customQuestion ?? prompt).trim()
    if (!normalizedQuestion) return

    const userMessage: ChatMessage = {
      id: nextLocalId(),
      role: 'user',
      content: normalizedQuestion,
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? {
              ...conversation,
              title:
                conversation.title === '新对话' ? normalizedQuestion.slice(0, 18) || '新对话' : conversation.title,
              messages: [...conversation.messages, userMessage],
            }
          : conversation
      )
    )

    setPrompt('')
    setIsThinking(true)

    window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: nextLocalId(),
        role: 'assistant',
        content: generateMockReply(normalizedQuestion),
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, assistantMessage],
              }
            : conversation
        )
      )
      setIsThinking(false)
    }, 650)
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
          <div className='absolute -left-8 top-6 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl' />
          <div className='absolute right-8 top-10 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl' />
          <div className='absolute bottom-6 left-1/3 h-52 w-52 rounded-full bg-cyan-400/8 blur-3xl' />
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(168,85,247,0.08),transparent_24%)]' />
        </div>

        <div className='relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <div className='shrink-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex min-w-0 flex-wrap items-center gap-3'>
                <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200'>
                  <Sparkles className='h-3 w-3' />
                  AI 学习助手
                </span>
                <h1 className='text-lg font-bold tracking-tight text-white md:text-xl'>
                  你的专属遥感学习伙伴
                </h1>
              </div>
              <div className='flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200'>
                <span className='h-2 w-2 rounded-full bg-emerald-400' />
                在线
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
                    <div className='text-sm font-semibold text-white'>AI 学习助手</div>
                  </div>
                </div>
              </div>

              <Button
                type='button'
                className='mt-3 h-9 w-full justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400'
                onClick={handleCreateConversation}
              >
                <Plus className='mr-2 h-4 w-4' />
                新建对话
              </Button>

              <div className='mt-3 flex min-h-0 flex-1 flex-col'>
                <div className='mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400'>
                  最近对话
                </div>
                <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
                  {conversations.map((conversation) => (
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
                        {conversation.messages[conversation.messages.length - 1]?.content ?? '暂无内容'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className='mt-3 shrink-0'>
                <div className='mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400'>
                  功能分类
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {featureBadges.map((tag) => (
                    <Badge
                      key={tag}
                      variant='outline'
                      className='rounded-full border-slate-700 bg-slate-900/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-200'
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
                        <div className='text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400'>
                          AI 学习助手
                        </div>
                        <CardTitle className='mt-0.5 text-base font-semibold text-white'>
                          {selectedConversation.title}
                        </CardTitle>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 text-xs text-slate-300'>
                      <div className='rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1'>
                        当前节点：{learningContext.node}
                      </div>
                      <div className='rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1'>
                        当前学习阶段：{learningContext.stage}
                      </div>
                      <div className='rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-violet-200'>
                        学习进度：{learningContext.progress}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='flex min-h-0 flex-1 flex-col px-4 pb-3.5'>
                  <div className='mb-2.5 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-xs leading-5 text-slate-300'>
                    <div className='flex items-center gap-2 text-slate-200'>
                      <BookOpen className='h-3.5 w-3.5 text-sky-300' />
                      当前上下文
                    </div>
                    <div className='mt-1.5 flex flex-wrap gap-1.5 text-[11px]'>
                      <span className='rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1'>
                        当前节点：{learningContext.node}
                      </span>
                      <span className='rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1'>
                        当前学习阶段：{learningContext.stage}
                      </span>
                      <span className='rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-violet-200'>
                        学习进度：{learningContext.progress}
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
                              message.role === 'user' ? 'justify-end' : 'justify-start'
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
                              {message.content.split('\n').map((line, index) => (
                                <div key={`${message.id}-${index}`}>{line || ' '}</div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {isThinking && (
                          <div className='flex justify-start'>
                            <div className='flex max-w-[88%] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-300'>
                              <Loader2 className='h-3.5 w-3.5 animate-spin text-sky-300' />
                              AI 正在思考……
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
                        {question}
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
                        aria-label='添加资料'
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
                        placeholder='输入你的问题，例如：帮我解释一下 Transformer 的 Self-Attention'
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
                    我的学习状态
                  </div>

                  <div className='mt-2.5 space-y-2 text-sm'>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-400'>当前阶段</span>
                      <span className='text-white'>遥感影像处理</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-400'>当前节点</span>
                      <span className='text-white'>图像增强</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-slate-400'>总体掌握度</span>
                      <span className='text-sky-200'>68%</span>
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <Compass className='h-4 w-4 text-violet-300' />
                    AI 为你推荐
                  </div>

                  <div className='mt-2.5 space-y-2'>
                    {recommendations.map((item) => (
                      <button
                        key={item.title}
                        type='button'
                        onClick={() => navigate({ to: item.route as '/node-learning' | '/path-planning' })}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all',
                          item.accent === 'blue' && 'border-sky-500/20 bg-sky-500/8 hover:bg-sky-500/12',
                          item.accent === 'purple' && 'border-violet-500/20 bg-violet-500/8 hover:bg-violet-500/12',
                          item.accent === 'cyan' && 'border-cyan-500/20 bg-cyan-500/8 hover:bg-cyan-500/12'
                        )}
                      >
                        <div>
                          <div className='text-sm font-medium text-white'>{item.title}</div>
                          <div className='mt-1 text-xs text-slate-300'>预计：{item.estimate}</div>
                        </div>
                        <ChevronRight className='mt-1 h-4 w-4 text-slate-300' />
                      </button>
                    ))}
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <BrainCircuit className='h-4 w-4 text-emerald-300' />
                    AI 能力
                  </div>

                  <div className='mt-2.5 space-y-2'>
                    {capabilityList.map((item) => (
                      <div key={item} className='flex items-center justify-between gap-3'>
                        <span className='text-sm text-slate-200'>{item}</span>
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
