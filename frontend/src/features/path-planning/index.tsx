import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCheck,
  Clock3,
  Loader2,
  Map,
  RefreshCcw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

import { usePathPlan, useRegeneratePath } from './api'

const insightIcons = [Target, Zap, Clock3] as const







export function PathPlanning() {
  const navigate = useNavigate()
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const { data } = usePathPlan()
  const regeneratePath = useRegeneratePath()

  const stages = data?.stages ?? []
  const selectedStage =
    stages.find((stage) => stage.id === selectedStageId) ??
    stages.find((stage) => stage.status === 'active') ??
    stages[0]

  const insightCards = useMemo(
    () =>
      (data?.insight.cards ?? []).map((card, index) => ({
        ...card,
        icon: insightIcons[index % insightIcons.length],
      })),
    [data]
  )

  const variant = data?.analysis

  const overallCompletion = Math.round(
    stages.reduce((sum, stage) => sum + stage.completion, 0) /
      Math.max(stages.length, 1)
  )

  if (!variant || !selectedStage) {
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
            正在加载学习路径…
          </div>
        </Main>
      </>
    )
  }

  const handleContinueLearning = () => {
    navigate({ to: '/node-learning' })
  }

  const handleStartStudy = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    navigate({ to: '/node-learning' })
  }

  const handleRegenerate = () => {
    if (regeneratePath.isPending) return

    const loadingId = toast.loading('AI 正在分析你的学习记录……')
    regeneratePath.mutate(undefined, {
      onSuccess: () => {
        toast.dismiss(loadingId)
        toast.success('已根据你的近期学习表现重新生成学习路径')
        setSelectedStageId(null)
      },
      onError: () => toast.dismiss(loadingId),
    })
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
          <Card className='shrink-0 gap-0 border border-white/10 bg-slate-950/65 py-0 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
            <CardHeader className='flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5 pb-2 md:px-5'>
              <div className='flex min-w-0 flex-wrap items-center gap-3'>
                <span className='inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] text-sky-200 uppercase'>
                  <Sparkles className='h-3 w-3' />
                  {variant.badge}
                </span>
                <div className='min-w-0'>
                  <CardTitle className='text-base font-bold text-white md:text-lg'>
                    {variant.title}
                  </CardTitle>
                  <CardDescription className='mt-0.5 max-w-3xl truncate text-xs text-slate-300'>
                    {variant.subtitle}
                  </CardDescription>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  className='h-9 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-80'
                  onClick={handleRegenerate}
                  disabled={regeneratePath.isPending}
                >
                  {regeneratePath.isPending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      正在分析……
                    </>
                  ) : (
                    <>
                      <RefreshCcw className='mr-2 h-4 w-4' />
                      重新生成路径
                    </>
                  )}
                </Button>
                <Button
                  className='h-9 rounded-xl bg-sky-500 px-4 text-sm font-medium text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400'
                  onClick={handleContinueLearning}
                >
                  继续学习
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </CardHeader>

            <CardContent className='px-4 pb-3 md:px-5'>
              <div className='grid gap-2.5 md:grid-cols-3'>
                {insightCards.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className='flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-2'
                  >
                    <div>
                      <div className='text-[10px] uppercase tracking-[0.16em] text-slate-400'>
                        {label}
                      </div>
                      <div className='mt-0.5 text-lg font-bold text-white'>
                        {value}
                      </div>
                    </div>
                    <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-200'>
                      <Icon className='h-3.5 w-3.5' />
                    </div>
                  </div>
                ))}
              </div>

              <div className='mt-2.5 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/8 px-3 py-1.5 text-xs text-violet-100'>
                <BrainCircuit className='h-3.5 w-3.5 text-violet-300' />
                <span className='font-medium'>{variant.momentum}</span>
                <span className='text-violet-200/80'>·</span>
                <span>{variant.nextAction}</span>
              </div>
            </CardContent>
          </Card>

          <div className='grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.15fr_0.85fr]'>
            <Card className='flex min-h-0 flex-col gap-0 border border-white/10 bg-slate-950/70 py-0 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <CardHeader className='shrink-0 px-4 pt-3.5 pb-2 md:px-5'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <CardTitle className='text-base font-semibold text-white'>
                      学习路线图
                    </CardTitle>
                    <CardDescription className='mt-0.5 text-xs text-slate-300'>
                      根据你的知识进度与目标能力，推荐分阶段推进
                    </CardDescription>
                  </div>
                  <div className='inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200'>
                    <CheckCheck className='h-3.5 w-3.5' />
                    进度 {overallCompletion}%
                  </div>
                </div>
              </CardHeader>

              <CardContent className='min-h-0 flex-1 overflow-y-auto px-4 pb-3.5 md:px-5'>
                <div className='space-y-2.5 pr-1'>
                  {stages.map((stage, index) => {
                    const isSelected = stage.id === selectedStage.id
                    const isCurrent = stage.status === 'active'

                    return (
                      <button
                        key={stage.id}
                        type='button'
                        onClick={() => setSelectedStageId(stage.id)}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all duration-200',
                          isSelected
                            ? 'border-violet-400/30 bg-violet-500/8 shadow-[0_0_0_1px_rgba(167,139,250,0.22)]'
                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60',
                          isCurrent && isSelected && 'border-violet-400/50 bg-violet-500/10'
                        )}
                      >
                        <div className='relative flex flex-col items-center'>
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold',
                              stage.status === 'done'
                                ? 'border-emerald-400/30 bg-emerald-500/8 text-emerald-200'
                                : stage.status === 'active'
                                  ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
                                  : 'border-slate-700 bg-slate-900/35 text-slate-400',
                              isCurrent && isSelected && 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                            )}
                          >
                            {stage.status === 'done' ? '✓' : index + 1}
                          </div>
                          {index < stages.length - 1 && (
                            <div className='mt-1.5 h-6 w-px bg-slate-700/80' />
                          )}
                        </div>

                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                              <div className='flex items-center gap-2'>
                                <span className='text-sm font-semibold text-white'>
                                  {stage.title}
                                </span>
                                {isCurrent && (
                                  <span className='rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-violet-200'>
                                    当前学习
                                  </span>
                                )}
                              </div>
                              <div className='mt-0.5 text-xs text-slate-300'>
                                {stage.summary}
                              </div>
                            </div>
                            <span className='rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300'>
                              {stage.difficulty}
                            </span>
                          </div>

                          <div className='mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-300'>
                            <span className='inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1'>
                              <Clock3 className='h-3 w-3' />
                              {stage.duration}
                            </span>
                            <span className='inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1'>
                              <BookOpen className='h-3 w-3' />
                              {stage.focus}
                            </span>
                          </div>

                          {isCurrent && (
                            <div className='mt-2 rounded-xl border border-violet-500/25 bg-slate-950/60 p-2.5'>
                              <div className='mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-violet-200'>
                                <span>当前进度</span>
                                <span>{stage.completion}%</span>
                              </div>
                              <div className='h-2 overflow-hidden rounded-full bg-slate-800'>
                                <div
                                  className='h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400'
                                  style={{ width: `${stage.completion}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className='flex min-h-0 flex-col gap-0 border border-white/10 bg-slate-950/70 py-0 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <CardHeader className='shrink-0 px-4 pt-3.5 pb-2 md:px-5'>
                <div className='flex items-center justify-between gap-3'>
                  <CardTitle className='text-base font-semibold text-white'>
                    阶段详情
                  </CardTitle>
                  <div className='rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[10px] font-medium text-sky-200'>
                    {selectedStage.status === 'active' ? '当前学习' : '阶段详情'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3.5 md:px-5'>
                <div className='min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
                  <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5'>
                  <div className='flex items-center justify-between gap-3'>
                    <h3 className='text-base font-semibold text-white'>
                      {selectedStage.title}
                    </h3>
                    <span className='rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-violet-200'>
                      {selectedStage.duration}
                    </span>
                  </div>

                  <p className='mt-2 text-xs leading-5 text-slate-300'>
                    {selectedStage.detail}
                  </p>

                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <div className='rounded-xl border border-slate-800 bg-slate-950/60 p-3'>
                      <div className='text-[10px] uppercase tracking-[0.18em] text-slate-400'>
                        学习目标
                      </div>
                      <div className='mt-2 text-sm font-medium text-white'>
                        {selectedStage.learningGoal}
                      </div>
                    </div>
                    <div className='rounded-xl border border-slate-800 bg-slate-950/60 p-3'>
                      <div className='text-[10px] uppercase tracking-[0.18em] text-slate-400'>
                        学习重点
                      </div>
                      <div className='mt-2 text-sm font-medium text-white'>
                        {selectedStage.focus}
                      </div>
                    </div>
                  </div>

                  <div className='mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3'>
                    <div className='mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-violet-200'>
                      <span>当前完成度</span>
                      <span>{selectedStage.completion}%</span>
                    </div>
                    <div className='h-2 overflow-hidden rounded-full bg-slate-800'>
                      <div
                        className='h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400'
                        style={{ width: `${selectedStage.completion}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <Map className='h-4 w-4 text-sky-300' />
                    推荐学习内容
                  </div>
                  <ul className='mt-2 space-y-1.5 text-xs text-slate-300'>
                    {selectedStage.recommendedContent.map((item) => (
                      <li key={item} className='flex items-start gap-2'>
                        <span className='mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-400' />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <Target className='h-4 w-4 text-emerald-300' />
                    前置知识
                  </div>
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {selectedStage.prerequisites.map((item) => (
                      <span
                        key={item}
                        className='rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-300'
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/50 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium text-slate-200'>
                    <Clock3 className='h-4 w-4 text-violet-300' />
                    预计学习时间
                  </div>
                  <div className='mt-1 text-base font-semibold text-white'>
                    {selectedStage.estimatedTime}
                  </div>
                </div>

                </div>

                <Button
                  className='w-full shrink-0 justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400'
                  onClick={handleStartStudy}
                >
                  开始学习
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
