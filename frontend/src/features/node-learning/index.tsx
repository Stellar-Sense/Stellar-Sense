import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type { CompanionMetadata } from '@/lib/chat-stream'
import { t, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { useExplainNode, useLearningNode, useLearningNodes } from './api'
import { NodeAssessment } from './assessment'
import { LearningStageNav } from './components/learning-stage-nav'
import { NodeContextActions } from './components/node-context-actions'
import { NodeLearningAIPanel } from './components/node-learning-ai-panel'
import { NodeSidebar } from './components/node-sidebar'
import { getAIConfig, quizQuestions, stageLabels } from './demo-data'
import type { LearningStage, QuizMode } from './types'
import { useNodeLearningChat } from './use-node-learning-chat'
import { CaseView } from './views/case-view'
import { FeedbackView } from './views/feedback-view'
import { MaterialView } from './views/material-view'
import { PracticeView } from './views/practice-view'
import { QuizView } from './views/quiz-view'

const EMPTY_STAGES = new Set<LearningStage>()

export function NodeLearning() {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const { nodeId: requestedNodeId, stage: requestedStage } = useSearch({
    from: '/_authenticated/node-learning/',
  })
  const stage: LearningStage = requestedStage ?? 'material'

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(stage === 'quiz')
  const [completedStages, setCompletedStages] = useState<Set<LearningStage>>(
    new Set()
  )
  const [quizMode, setQuizMode] = useState<QuizMode>('answering')
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0)
  const [quizHintStep, setQuizHintStep] = useState(-1)
  const [explanationText, setExplanationText] = useState<string | null>(null)
  const [explanationMetadata, setExplanationMetadata] =
    useState<CompanionMetadata>()
  const assessmentRef = useRef<HTMLDivElement | null>(null)

  const { data: overview } = useLearningNodes()
  const explainNodeRequest = useExplainNode()

  const nodeStatuses = useMemo(() => {
    const statuses: Record<string, 'done' | 'current' | 'todo'> = {}
    for (const group of overview?.groups ?? []) {
      for (const item of group.items) statuses[item.id] = item.status
    }
    return statuses
  }, [overview])

  const effectiveNodeId = useMemo(() => {
    if (overview && requestedNodeId && nodeStatuses[requestedNodeId]) {
      return requestedNodeId
    }
    return overview?.currentNodeId ?? overview?.sequence[0] ?? null
  }, [nodeStatuses, overview, requestedNodeId])

  const { data: selectedNode } = useLearningNode(effectiveNodeId)
  const sequence = overview?.sequence ?? []
  const groups = useMemo(() => overview?.groups ?? [], [overview])
  const currentProgress = useMemo(() => {
    const items = overview?.groups.flatMap((group) => group.items) ?? []
    if (items.length === 0) return 0
    return Math.round(
      (items.filter((item) => item.status === 'done').length / items.length) *
        100
    )
  }, [overview])

  const lockedNodeIds = useMemo(
    () =>
      new Set(
        groups
          .flatMap((group) => group.items)
          .filter((item) => item.label === '目标检测')
          .map((item) => item.id)
      ),
    [groups]
  )

  const chat = useNodeLearningChat({
    nodeId: selectedNode?.id ?? effectiveNodeId ?? '',
    nodeTitle: selectedNode?.title ?? '',
    progress: selectedNode?.progress ?? 0,
    stage,
    quizMode,
  })
  const isContextBusy = chat.isAiReplying || explainNodeRequest.isPending
  const resetConversation = chat.resetConversation

  const previousNodeIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!effectiveNodeId) return
    if (
      previousNodeIdRef.current !== null &&
      previousNodeIdRef.current !== effectiveNodeId
    ) {
      resetConversation()
      setExplanationText(null)
      setExplanationMetadata(undefined)
      setCompletedStages(new Set())
      setQuizMode('answering')
      setQuizQuestionIndex(0)
      setQuizHintStep(-1)
    }
    previousNodeIdRef.current = effectiveNodeId
  }, [effectiveNodeId, resetConversation])

  if (!selectedNode) {
    return (
      <>
        <PageHeader />
        <Main
          fixed
          className='relative overflow-hidden px-4 py-3 md:px-5 md:py-4'
        >
          <div className='flex h-full items-center justify-center gap-2 text-sm text-slate-400'>
            <Loader2 className='size-4 animate-spin text-sky-300' />
            {t('正在加载节点内容…')}
          </div>
        </Main>
      </>
    )
  }

  const selectedIndex = sequence.indexOf(selectedNode.id)
  const aiConfig = getAIConfig(stage, quizMode, selectedNode.title)
  const currentQuizQuestion = quizQuestions[quizQuestionIndex]
  const quizHint =
    quizHintStep >= 0
      ? currentQuizQuestion?.hints[
          Math.min(quizHintStep, currentQuizQuestion.hints.length - 1)
        ]
      : undefined

  const resetNodeExperience = () => {
    chat.resetConversation()
    setExplanationText(null)
    setExplanationMetadata(undefined)
    setCompletedStages(new Set())
    setQuizMode('answering')
    setQuizQuestionIndex(0)
    setQuizHintStep(-1)
    setRightCollapsed(false)
  }

  const navigateToNode = (nodeId: string) => {
    if (isContextBusy) {
      toast.info(t('请等待当前回复完成后再切换节点'))
      return
    }
    resetNodeExperience()
    void navigate({
      to: '/node-learning',
      search: { nodeId, stage: 'material' },
    })
  }

  const changeStage = (nextStage: LearningStage) => {
    if (isContextBusy) {
      toast.info(t('请等待当前回复完成后再切换学习阶段'))
      return
    }
    setCompletedStages((previous) => new Set(previous).add(stage))
    if (nextStage === 'quiz' && quizMode === 'answering') {
      setRightCollapsed(true)
    } else if (stage === 'quiz' && quizMode === 'answering') {
      setRightCollapsed(false)
    }
    void navigate({
      to: '/node-learning',
      search: { nodeId: selectedNode.id, stage: nextStage },
    })
  }

  const previousNode = () => {
    if (selectedIndex <= 0) return
    navigateToNode(sequence[selectedIndex - 1] ?? selectedNode.id)
  }

  const nextNode = () => {
    if (selectedIndex < 0 || selectedIndex >= sequence.length - 1) return
    navigateToNode(sequence[selectedIndex + 1] ?? selectedNode.id)
  }

  const markStageComplete = (completedStage: LearningStage) => {
    setCompletedStages((previous) => new Set(previous).add(completedStage))
  }

  const openAssessment = () => {
    assessmentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleExplainNode = () => {
    setExplanationText(null)
    setExplanationMetadata(undefined)
    explainNodeRequest.mutate(
      { nodeId: selectedNode.id, learnerLevel: chat.level },
      {
        onSuccess: (data) => {
          setExplanationText(data.explanation)
          setExplanationMetadata(data.metadata)
        },
        onError: () => toast.error(t('小遇暂时无法生成讲解，请稍后重试')),
      }
    )
  }

  const changeQuizMode = (mode: QuizMode) => {
    setQuizMode(mode)
    setRightCollapsed(mode === 'answering')
  }

  const requestQuizHint = () => {
    if (!currentQuizQuestion) return
    setQuizHintStep((current) =>
      Math.min(current + 1, currentQuizQuestion.hints.length - 1)
    )
  }

  const layoutClass = leftCollapsed
    ? rightCollapsed
      ? 'xl:grid-cols-[56px_minmax(0,1fr)_56px]'
      : 'xl:grid-cols-[56px_minmax(0,1fr)_320px]'
    : rightCollapsed
      ? 'xl:grid-cols-[250px_minmax(0,1fr)_56px]'
      : 'xl:grid-cols-[250px_minmax(0,1fr)_320px]'

  return (
    <>
      <PageHeader />
      <Main fixed fluid className='relative overflow-hidden px-3 py-3 md:px-4'>
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
          <div className='absolute top-6 -left-8 size-52 rounded-full bg-sky-500/8 blur-3xl' />
          <div className='absolute top-10 right-8 size-64 rounded-full bg-violet-500/8 blur-3xl' />
        </div>

        <div className='relative z-10 flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <section className='shrink-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,.42)] backdrop-blur-sm'>
            <div className='flex flex-wrap items-center gap-3'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/12 text-cyan-200'>
                <BookOpen className='size-5' />
              </span>
              <div className='min-w-48 flex-1'>
                <h1 className='text-xl font-bold tracking-tight text-white'>
                  {selectedNode.title}
                </h1>
                <p className='mt-0.5 text-xs text-slate-400'>
                  {selectedNode.breadcrumb}
                </p>
              </div>
              <div className='min-w-72 flex-[2] rounded-xl border border-sky-400/20 bg-sky-500/6 px-3 py-2 text-xs leading-5 text-slate-300'>
                <strong className='mr-2 text-cyan-300'>
                  {t('本节目标：')}
                </strong>
                {selectedNode.objectives[0] ?? selectedNode.summary}
              </div>
              <span className='inline-flex items-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200'>
                <Sparkles className='size-4' />
                {t('掌握度')} {selectedNode.progress}%
              </span>
              <span className='inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300'>
                <Clock3 className='size-4 text-cyan-300' />
                {t('预计学习时间')} {selectedNode.duration}
              </span>
            </div>
          </section>

          <div className={cn('grid min-h-0 gap-3 xl:flex-1', layoutClass)}>
            <NodeSidebar
              groups={groups}
              selectedNodeId={selectedNode.id}
              nodeStatuses={nodeStatuses}
              currentProgress={currentProgress}
              collapsed={leftCollapsed}
              disabled={isContextBusy}
              lockedNodeIds={lockedNodeIds}
              onToggle={() => setLeftCollapsed((value) => !value)}
              onSelect={navigateToNode}
            />

            <main className='flex min-h-0 min-w-0 flex-col gap-3'>
              <NodeContextActions node={selectedNode} />
              <LearningStageNav
                activeStage={stage}
                completedStages={completedStages}
                lockedStages={EMPTY_STAGES}
                disabled={isContextBusy}
                onChange={changeStage}
              />

              <div className='min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/65 p-4 shadow-[0_12px_30px_rgba(15,23,42,.42)] backdrop-blur-sm'>
                {stage === 'material' && (
                  <MaterialView
                    key={selectedNode.id}
                    node={selectedNode}
                    explanationText={explanationText}
                    explanationMetadata={explanationMetadata}
                    explaining={explainNodeRequest.isPending}
                    onExplain={handleExplainNode}
                  />
                )}
                {stage === 'case' && (
                  <CaseView
                    onAskAI={(question) => {
                      setRightCollapsed(false)
                      chat.sendMessage(question)
                    }}
                    onComplete={() => markStageComplete('case')}
                  />
                )}
                {stage === 'quiz' && (
                  <QuizView
                    mode={quizMode}
                    hintText={quizHint}
                    onModeChange={changeQuizMode}
                    onQuestionChange={(index) => {
                      setQuizQuestionIndex(index)
                      setQuizHintStep(-1)
                    }}
                    onRequestHint={requestQuizHint}
                    onComplete={() => markStageComplete('quiz')}
                    onStageChange={changeStage}
                    onAskAI={(question) => {
                      setRightCollapsed(false)
                      chat.sendMessage(question)
                    }}
                  />
                )}
                {stage === 'practice' && (
                  <PracticeView
                    onComplete={() => markStageComplete('practice')}
                  />
                )}
                {stage === 'feedback' && (
                  <div className='space-y-6'>
                    <FeedbackView
                      nodeTitle={selectedNode.title}
                      onStageChange={changeStage}
                      onOpenAssessment={openAssessment}
                      assessmentDisabled={isContextBusy}
                    />
                    <div ref={assessmentRef}>
                      <NodeAssessment
                        key={selectedNode.id}
                        nodeId={selectedNode.id}
                      />
                    </div>
                  </div>
                )}
              </div>

              <footer className='flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/65 px-3 py-2'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={selectedIndex <= 0 || isContextBusy}
                  onClick={previousNode}
                  className='border-slate-700 bg-slate-900 text-slate-200'
                >
                  <ArrowLeft className='mr-2 size-4' />
                  {t('上一个节点')}
                </Button>
                <div className='text-[11px] text-slate-500'>
                  {t('当前阶段')}：{t(stageLabels[stage])}
                </div>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    disabled={
                      selectedIndex < 0 ||
                      selectedIndex >= sequence.length - 1 ||
                      isContextBusy
                    }
                    onClick={nextNode}
                    className='bg-sky-500 text-white hover:bg-sky-400'
                  >
                    {t('下一个节点')}
                    <ArrowRight className='ml-2 size-4' />
                  </Button>
                </div>
              </footer>
            </main>

            <NodeLearningAIPanel
              {...aiConfig}
              collapsed={rightCollapsed}
              level={chat.level}
              conversationId={chat.conversationId}
              messages={chat.messages}
              streamingText={chat.streamingText}
              chatInput={chat.chatInput}
              isAiReplying={chat.isAiReplying}
              additionalMetadata={explanationMetadata}
              localHint={quizHint}
              onToggle={() => setRightCollapsed((value) => !value)}
              onLevelChange={chat.setLevel}
              onChatInputChange={chat.setChatInput}
              onSend={chat.sendMessage}
              onRequestHint={requestQuizHint}
              onContinueConversation={() => {
                if (!chat.conversationId) return
                void navigate({
                  to: '/ai-assistant',
                  search: { conversationId: chat.conversationId },
                })
              }}
            />
          </div>
        </div>
      </Main>
    </>
  )
}

function PageHeader() {
  return (
    <Header>
      <Search className='me-auto' />
      <ProfileDropdown />
    </Header>
  )
}
