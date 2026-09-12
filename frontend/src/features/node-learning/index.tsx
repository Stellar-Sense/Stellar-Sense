import { useMemo, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

type NodeStatus = 'done' | 'current' | 'todo'

type KnowledgeNode = {
  id: string
  title: string
  breadcrumb: string
  summary: string
  progress: number
  duration: string
  objectives: string[]
  methods: string[]
  concept: string
  caseTitle: string
  caseSummary: string
  explanation: string
}

type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

type KnowledgeGroup = {
  group: string
  items: Array<{ id: string; label: string; status: NodeStatus }>
}

const knowledgeGroups: KnowledgeGroup[] = [
  {
    group: '遥感影像处理',
    items: [
      { id: '遥感概论', label: '遥感概论', status: 'done' },
      { id: '电磁波与遥感', label: '电磁波与遥感', status: 'done' },
      { id: '遥感成像原理', label: '遥感成像原理', status: 'done' },
      { id: '遥感传感器', label: '遥感传感器', status: 'done' },
      { id: 'Python 基础', label: 'Python 基础', status: 'done' },
      { id: 'NumPy', label: 'NumPy', status: 'done' },
      { id: 'Pandas', label: 'Pandas', status: 'done' },
      { id: 'GDAL', label: 'GDAL', status: 'done' },
      { id: '影像预处理', label: '影像预处理', status: 'done' },
      { id: '几何校正', label: '几何校正', status: 'done' },
      { id: '辐射校正', label: '辐射校正', status: 'done' },
      { id: '图像增强', label: '图像增强', status: 'current' },
      { id: '特征提取', label: '特征提取', status: 'todo' },
      { id: 'Raserio', label: 'Raserio', status: 'todo' },
      { id: 'CNN', label: 'CNN', status: 'todo' },
      { id: '目标检测', label: '目标检测', status: 'todo' },
      { id: 'Transformer', label: 'Transformer', status: 'todo' },
      { id: '遥感大模型', label: '遥感大模型', status: 'todo' },
    ],
  },
]

const nodeSequence = [
  '遥感概论',
  '电磁波与遥感',
  '遥感成像原理',
  '遥感传感器',
  'Python 基础',
  'NumPy',
  'Pandas',
  'GDAL',
  '影像预处理',
  '几何校正',
  '辐射校正',
  '图像增强',
  '特征提取',
  'Raserio',
  'CNN',
  '目标检测',
  'Transformer',
  '遥感大模型',
]

const nodeMap: Record<string, KnowledgeNode> = {
  图像增强: {
    id: '图像增强',
    title: '图像增强',
    breadcrumb: '遥感影像处理 / 图像增强',
    summary:
      '提升遥感影像的视觉质量与特征表达能力，使后续分类、目标检测和特征提取可以从更清晰的输入中受益。',
    progress: 42,
    duration: '20 分钟',
    objectives: [
      '理解遥感影像增强的基本概念',
      '掌握常见影像增强方法',
      '理解增强方法对后续特征提取的影响',
    ],
    methods: ['对比度增强', '直方图均衡化', '空间域增强', '锐化'],
    concept:
      '遥感影像增强是通过一定的图像处理方法改善影像视觉效果，突出目标地物和重要信息，为后续分类、目标检测和特征提取提供更好的输入。',
    caseTitle: '案例：城市遥感影像增强',
    caseSummary:
      '利用增强处理提升城市建筑、道路和植被区域的可分辨度，改善后续地物识别和变化检测任务的输入质量。',
    explanation:
      '简单来说，图像增强就是让模型更容易“看清”图中的关键内容，尤其是在对比度不足、光照不稳定或噪声较多的遥感影像中。',
  },
  特征提取: {
    id: '特征提取',
    title: '特征提取',
    breadcrumb: '遥感影像处理 / 特征提取',
    summary:
      '从遥感影像中提取纹理、边缘、形状和光谱特征，帮助后续分类和目标识别更稳定。',
    progress: 28,
    duration: '25 分钟',
    objectives: ['理解纹理和边缘特征', '掌握特征提取思路', '理解与增强的协同关系'],
    methods: ['边缘检测', '纹理分析', '光谱特征提取', '形状描述'],
    concept:
      '特征提取的关键是从原始图像中抽取出对任务更有价值的信息，使模型更容易从复杂背景中识别目标。',
    caseTitle: '案例：道路与建筑物提取',
    caseSummary:
      '通过综合利用边缘、纹理和空间结构信息，提升建筑物和道路等目标的分离能力。',
    explanation:
      '简单来说，特征提取相当于把原始图像“压缩成更有用的信号”，帮助后续模型更快地判断目标类型。',
  },
  目标检测: {
    id: '目标检测',
    title: '目标检测',
    breadcrumb: '遥感影像处理 / 目标检测',
    summary:
      '在大范围影像中定位并识别目标对象，例如车辆、建筑物和水体。',
    progress: 18,
    duration: '30 分钟',
    objectives: ['理解检测框与类别预测', '掌握遥感场景中的目标定位', '了解检测任务的输出结构'],
    methods: ['候选区域', '边界回归', '分类与定位', '多尺度检测'],
    concept:
      '目标检测不仅需要识别“是什么”，还需要判断“在哪里”，在遥感任务中这对大面积场景尤为重要。',
    caseTitle: '案例：港口船舶检测',
    caseSummary:
      '利用遥感影像中的多尺度特征，对港口和航道中的船舶目标进行定位和识别。',
    explanation:
      '简单来说，目标检测解决的是“找出对象并标出它的位置”，这比单纯分类更适合大范围遥感场景。',
  },
  Transformer: {
    id: 'Transformer',
    title: 'Transformer',
    breadcrumb: '深度学习 / Transformer',
    summary:
      'Transformer 利用注意力机制建立全局关系，适合分析遥感影像中的长距离空间关联。',
    progress: 12,
    duration: '35 分钟',
    objectives: ['理解 Self-Attention 原理', '掌握全局特征建模', '理解其在遥感任务中的适配'],
    methods: ['自注意力', '多头注意力', '位置编码', '残差连接'],
    concept:
      'Transformer 通过学习不同区域之间的关联关系，构建全局语义表达，从而有效捕获遥感影像中的上下文信息。',
    caseTitle: '案例：土地覆盖分类',
    caseSummary:
      '使用 Transformer 对多光谱影像中的区域交互关系进行建模，提高不同地物间的区分能力。',
    explanation:
      '简单来说，Transformer 相当于让模型在图像中“看全局”，而不只是关注局部细节。',
  },
  遥感大模型: {
    id: '遥感大模型',
    title: '遥感大模型',
    breadcrumb: '大模型与智能应用 / 遥感大模型',
    summary:
      '大模型能够在大规模遥感数据上学习通用表征，并应用于分类、检测和场景理解。',
    progress: 6,
    duration: '40 分钟',
    objectives: ['理解大模型迁移思路', '了解遥感通用表示', '建立模型落地视角'],
    methods: ['预训练模型', '微调', '迁移学习', '多模态对齐'],
    concept:
      '遥感大模型使用大规模数据学习基础表征，可以在多种任务上做迁移和增强，降低单任务训练门槛。',
    caseTitle: '案例：遥感大模型应用',
    caseSummary:
      '在土地覆盖、灾害识别和基础设施检测中，利用预训练大模型提升泛化能力与任务适配效率。',
    explanation:
      '简单来说，大模型帮助系统从海量遥感数据中学到“通用认知”，再将其迁移到具体任务上。',
  },
}

const quickQuestions = [
  '什么是直方图均衡化？',
  '为什么要进行影像增强？',
  '图像增强和特征提取有什么区别？',
]

const statusClassMap: Record<NodeStatus, string> = {
  done: 'border-emerald-400/30 bg-emerald-500/8 text-emerald-200',
  current: 'border-violet-400/40 bg-violet-500/10 text-violet-100',
  todo: 'border-slate-700 bg-slate-900/50 text-slate-400',
}

// 本地自增消息 id 生成器：避免在组件内调用 Date.now() 这类不纯函数（react-hooks/purity）
let localIdSeed = 1000
const nextLocalId = () => {
  localIdSeed += 1
  return localIdSeed
}

const generateMockAnswer = (question: string) => {
  const text = question.toLowerCase()

  if (text.includes('直方图均衡化')) {
    return '直方图均衡化是一种通过拉伸图像灰度分布来提升对比度的方法。它能让影像中的细节更明显，尤其适合低对比度的遥感影像。'
  }

  if (text.includes('为什么要进行影像增强') || text.includes('影像增强')) {
    return '遥感影像经常受到光照、传感器差异和大气条件影响，造成图像对比度不佳。增强处理可以提升关键信息的可见度，帮助后续分类和检测更稳定。'
  }

  if (text.includes('特征提取')) {
    return '图像增强主要是改善视觉质量，而特征提取更关注从图像中抽取任务相关的信息。增强可以让关键信息更清晰，特征提取则把这些信息转成模型可用的表达。'
  }

  return '从遥感学习的角度看，重点是理解增强是如何提升输入质量的，并为后续分类、检测与提取创造更有利的条件。'
}

export function NodeLearning() {
  const [selectedNodeId, setSelectedNodeId] = useState('图像增强')
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>({
    遥感概论: 'done',
    电磁波与遥感: 'done',
    遥感成像原理: 'done',
    遥感传感器: 'done',
    'Python 基础': 'done',
    NumPy: 'done',
    Pandas: 'done',
    GDAL: 'done',
    影像预处理: 'done',
    几何校正: 'done',
    辐射校正: 'done',
    图像增强: 'current',
    特征提取: 'todo',
    Raserio: 'todo',
    CNN: 'todo',
    目标检测: 'todo',
    Transformer: 'todo',
    遥感大模型: 'todo',
  })
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: '你好，我是你的遥感学习助手。如果你对图像增强有疑问，可以直接问我。',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isAiReplying, setIsAiReplying] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [explanationVisible, setExplanationVisible] = useState(false)

  const selectedNode = nodeMap[selectedNodeId] ?? nodeMap['图像增强']

  const currentProgress = useMemo(() => {
    const doneCount = Object.values(nodeStatuses).filter((status) => status === 'done').length
    return Math.round((doneCount / Object.keys(nodeStatuses).length) * 100)
  }, [nodeStatuses])

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setExplanationVisible(false)
  }

  const handlePreviousNode = () => {
    const index = nodeSequence.indexOf(selectedNodeId)
    const nextIndex = Math.max(index - 1, 0)
    setSelectedNodeId(nodeSequence[nextIndex])
    setExplanationVisible(false)
  }

  const handleNextNode = () => {
    const index = nodeSequence.indexOf(selectedNodeId)
    const nextIndex = Math.min(index + 1, nodeSequence.length - 1)
    setSelectedNodeId(nodeSequence[nextIndex])
    setExplanationVisible(false)
  }

  const handleMarkCompleted = () => {
    setNodeStatuses((prev) => ({
      ...prev,
      [selectedNodeId]: 'done',
    }))

    const index = nodeSequence.indexOf(selectedNodeId)
    const nextNodeId = nodeSequence[Math.min(index + 1, nodeSequence.length - 1)]

    if (nextNodeId && nextNodeId !== selectedNodeId) {
      setSelectedNodeId(nextNodeId)
      setNodeStatuses((prev) => ({
        ...prev,
        [nextNodeId]: 'current',
      }))
    }

    toast.success(`已完成 ${selectedNode.title}`)
  }

  const handleAIDescribe = () => {
    setIsAiLoading(true)
    setExplanationVisible(false)

    window.setTimeout(() => {
      setIsAiLoading(false)
      setExplanationVisible(true)
    }, 1000)
  }

  const handleSendMessage = (customQuestion?: string) => {
    const nextQuestion = (customQuestion ?? chatInput).trim()
    if (!nextQuestion) return

    const userMessage: ChatMessage = {
      id: nextLocalId(),
      role: 'user',
      content: nextQuestion,
    }

    setMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setIsAiReplying(true)

    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: nextLocalId(),
        role: 'assistant',
        content: generateMockAnswer(nextQuestion),
      }
      setMessages((prev) => [...prev, reply])
      setIsAiReplying(false)
    }, 700)
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
          <div className='absolute -left-8 top-6 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl' />
          <div className='absolute right-8 top-10 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl' />
          <div className='absolute bottom-6 left-1/3 h-52 w-52 rounded-full bg-cyan-400/8 blur-3xl' />
        </div>

        <div className='relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <div className='shrink-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex min-w-0 flex-wrap items-center gap-3'>
                <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200'>
                  <BookOpen className='h-3 w-3' />
                  节点学习
                </span>
                <h1 className='text-lg font-bold tracking-tight text-white md:text-xl'>
                  {selectedNode.title}
                </h1>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <div className='inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-violet-200'>
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
            <aside className='flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-950/65 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <div className='mb-2 flex items-center justify-between'>
                <h2 className='text-sm font-semibold uppercase tracking-[0.18em] text-slate-300'>
                  节点学习
                </h2>
                <span className='rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300'>
                  {currentProgress}%
                </span>
              </div>

              <div className='mb-2.5 rounded-2xl border border-slate-800 bg-slate-900/50 p-2.5'>
                <div className='text-[10px] uppercase tracking-[0.18em] text-slate-400'>
                  遥感影像处理
                </div>
                <div className='mt-1 text-xs text-slate-200'>学习进度：{currentProgress}%</div>
                <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800'>
                  <div
                    className='h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400'
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>

              <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
                {knowledgeGroups.map((group) => (
                  <div key={group.group} className='space-y-2'>
                    <div className='px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400'>
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
                              isCurrent && 'border-violet-400/40 bg-violet-500/10'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                                statusClassMap[status]
                              )}
                            >
                              {status === 'done' ? <Check className='h-3 w-3' /> : status === 'current' ? '●' : '○'}
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
                      <div className='truncate text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200'>
                        {selectedNode.breadcrumb}
                      </div>
                      <CardTitle className='mt-1 text-lg font-bold text-white'>
                        {selectedNode.title}
                      </CardTitle>
                    </div>
                    <div className='inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-violet-200'>
                      本节学习进度 {selectedNode.progress}%
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3.5'>
                  <p className='text-sm text-slate-300'>{selectedNode.summary}</p>

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
                        {isAiLoading ? (
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

                    {explanationVisible && (
                      <div className='mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/8 p-3 text-xs leading-5 text-violet-100'>
                        {selectedNode.explanation}
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
                          <div className='absolute left-6 right-6 top-6 bottom-6 rounded-2xl border border-sky-400/25 bg-slate-950/30 backdrop-blur-sm' />
                        </div>
                        <div className='mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-400'>
                          原始影像 → 增强后影像
                        </div>
                      </div>
                    </div>
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
                    标记为已完成
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
                    <div className='text-sm font-semibold text-white'>AI 学习助手</div>
                    <div className='mt-0.5 flex items-center gap-1 text-[11px] text-emerald-300'>
                      <span className='h-2 w-2 rounded-full bg-emerald-400' />
                      在线
                    </div>
                  </div>
                </div>
              </div>

              <div className='mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs leading-5 text-slate-300'>
                <p>你好，我是你的遥感学习助手。</p>
                <p className='mt-2'>如果你对图像增强有疑问，可以直接问我。</p>
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

              <div className='mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/40 p-3'>
                <div className='min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
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
                    </div>
                  ))}

                  {isAiReplying && (
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
