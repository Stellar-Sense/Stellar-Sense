import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { cn } from '@/lib/utils'

import { useLearningHistory } from './api'

type RangeKey = '7d' | '30d' | '90d'

type LearningRecord = {
  id: number
  title: string
  category: string
  duration: string
  score: number
  timestamp: string
  summary: string
}

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '7 天' },
  { key: '30d', label: '30 天' },
  { key: '90d', label: '90 天' },
]

const statIcons = [Clock3, Target, Flame, TrendingUp] as const

const masteryColors = [
  'bg-cyan-400',
  'bg-violet-400',
  'bg-sky-400',
  'bg-indigo-400',
  'bg-slate-400',
] as const

export function LearningHistory() {
  const [selectedRange, setSelectedRange] = useState<RangeKey>('30d')
  const [selectedRecord, setSelectedRecord] = useState<LearningRecord | null>(
    null
  )

  const { data } = useLearningHistory(selectedRange)

  const trendData = useMemo(() => data?.trend ?? [], [data])
  const summaryStats = useMemo(
    () =>
      (data?.stats ?? []).map((stat, index) => ({
        ...stat,
        icon: statIcons[index % statIcons.length],
      })),
    [data]
  )
  const masteryData = useMemo(
    () =>
      (data?.mastery ?? []).map((item, index) => ({
        ...item,
        color: masteryColors[index % masteryColors.length],
      })),
    [data]
  )
  const recentStudySessions = data?.records ?? []
  const timelineEntries = data?.timeline ?? []

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
        <div className='relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
            <div className='flex min-w-0 flex-wrap items-center gap-3'>
              <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200'>
                <Sparkles className='h-3 w-3' />
                学习记录
              </span>
              <h1 className='text-lg font-bold text-white md:text-xl'>我的学习轨迹</h1>
            </div>
            <div className='flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/80 p-1'>
              {rangeOptions.map((option) => (
                <button
                  key={option.key}
                  type='button'
                  onClick={() => setSelectedRange(option.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs transition-colors',
                    selectedRange === option.key
                      ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4'>
            {summaryStats.map(({ label, value, detail, icon: Icon }) => (
              <Card
                key={label}
                className='gap-0 border border-slate-800 bg-slate-950/70 py-0 shadow-[0_10px_30px_rgba(15,23,42,0.35)]'
              >
                <CardContent className='flex items-center justify-between px-3.5 py-2.5'>
                  <div className='min-w-0'>
                    <p className='text-xs text-slate-400'>{label}</p>
                    <p className='mt-0.5 text-xl font-bold text-white'>{value}</p>
                    <p className='mt-0.5 truncate text-[11px] text-slate-400'>{detail}</p>
                  </div>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300'>
                    <Icon className='h-4 w-4' />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.5fr_1fr]'>
            <div className='flex min-h-0 flex-col gap-3'>
              <Card className='flex min-h-0 flex-[1.2] flex-col gap-0 border border-slate-800 bg-slate-950/70 py-0'>
                <CardHeader className='flex shrink-0 flex-row items-center justify-between px-4 pt-3.5 pb-2'>
                  <div>
                    <CardTitle className='text-base text-white'>学习时长与掌握度趋势</CardTitle>
                    <CardDescription className='mt-0.5 text-xs text-slate-400'>
                      根据最近 {rangeOptions.find((item) => item.key === selectedRange)?.label ?? '30 天'}的学习节奏
                    </CardDescription>
                  </div>
                  <Badge variant='secondary' className='border-sky-500/20 bg-sky-500/10 text-sky-100'>
                    <TrendingUp className='h-3.5 w-3.5' />
                    进度提升
                  </Badge>
                </CardHeader>
                <CardContent className='min-h-0 flex-1 px-4 pb-3.5'>
                  <div className='h-full min-h-[150px] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id='studyMinutes' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='5%' stopColor='#38bdf8' stopOpacity={0.5} />
                            <stop offset='95%' stopColor='#38bdf8' stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke='rgba(148,163,184,0.15)' />
                        <XAxis dataKey='label' tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis width={32} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(148,163,184,0.25)',
                            borderRadius: '12px',
                          }}
                        />
                        <Area type='monotone' dataKey='minutes' stroke='#38bdf8' fill='url(#studyMinutes)' strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className='flex min-h-0 flex-1 flex-col gap-0 border border-slate-800 bg-slate-950/70 py-0'>
                <CardHeader className='flex shrink-0 flex-row items-center justify-between px-4 pt-3.5 pb-2'>
                  <div>
                    <CardTitle className='text-base text-white'>学习热力图</CardTitle>
                    <CardDescription className='mt-0.5 text-xs text-slate-400'>
                      每日学习投入与知识巩固轨迹
                    </CardDescription>
                  </div>
                  <Badge className='border-violet-500/20 bg-violet-500/10 text-violet-100'>
                    <BookOpen className='h-3.5 w-3.5' />
                    产出稳定
                  </Badge>
                </CardHeader>
                <CardContent className='min-h-0 flex-1 px-4 pb-3.5'>
                  <div className='h-full min-h-[130px] w-full'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={trendData}>
                        <CartesianGrid vertical={false} stroke='rgba(148,163,184,0.14)' />
                        <XAxis dataKey='label' tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis width={32} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(148,163,184,0.25)',
                            borderRadius: '12px',
                          }}
                        />
                        <Bar dataKey='minutes' radius={[6, 6, 0, 0]} fill='#8b5cf6' />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className='flex min-h-0 flex-col gap-3'>
              <Card className='shrink-0 gap-0 border border-slate-800 bg-slate-950/70 py-0'>
                <CardHeader className='px-4 pt-3.5 pb-2'>
                  <CardTitle className='text-base text-white'>知识掌握度</CardTitle>
                  <CardDescription className='text-xs text-slate-400'>
                    当前模块学习状态与掌握强度
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-2 px-4 pb-3'>
                  {masteryData.map((item) => (
                    <div key={item.name} className='space-y-1'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-slate-300'>{item.name}</span>
                        <span className='text-slate-100'>{item.value}%</span>
                      </div>
                      <div className='h-1.5 rounded-full bg-slate-800'>
                        <div
                          className={cn('h-1.5 rounded-full', item.color)}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className='flex min-h-0 flex-1 flex-col gap-0 border border-slate-800 bg-slate-950/70 py-0'>
                <CardHeader className='shrink-0 px-4 pt-3.5 pb-2'>
                  <CardTitle className='text-base text-white'>最近学习</CardTitle>
                  <CardDescription className='text-xs text-slate-400'>
                    本周完成的重点学习会话
                  </CardDescription>
                </CardHeader>
                <CardContent className='min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-3.5'>
                  {recentStudySessions.map((session) => (
                    <button
                      key={session.id}
                      type='button'
                      onClick={() => setSelectedRecord(session)}
                      className='w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left transition-colors hover:border-sky-400/40 hover:bg-slate-900'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-white'>{session.title}</p>
                          <p className='mt-0.5 text-[11px] text-slate-400'>
                            {session.category} · {session.timestamp}
                          </p>
                        </div>
                        <div className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200'>
                          {session.score} 分
                        </div>
                      </div>
                      <div className='mt-2 flex items-center justify-between text-xs text-slate-300'>
                        <span>{session.duration}</span>
                        <span className='inline-flex items-center gap-1 text-sky-300'>
                          查看详情
                          <ChevronRight className='h-3.5 w-3.5' />
                        </span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className='flex min-h-0 flex-1 flex-col gap-0 border border-slate-800 bg-slate-950/70 py-0'>
                <CardHeader className='shrink-0 px-4 pt-3.5 pb-2'>
                  <CardTitle className='text-base text-white'>学习时间线</CardTitle>
                  <CardDescription className='text-xs text-slate-400'>
                    近期知识积累与路径调整记录
                  </CardDescription>
                </CardHeader>
                <CardContent className='min-h-0 flex-1 overflow-y-auto px-4 pb-3.5'>
                  <div className='space-y-2'>
                    {timelineEntries.map((item) => (
                      <button
                        key={item.id}
                        type='button'
                        onClick={() => setSelectedRecord({
                          id: item.id,
                          title: item.title,
                          category: item.tag,
                          duration: '学习记录',
                          score: 100,
                          timestamp: item.when,
                          summary: item.description,
                        })}
                        className='flex w-full items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-left transition-colors hover:border-violet-400/30 hover:bg-slate-900'
                      >
                        <div className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-200'>
                          <CalendarRange className='h-3.5 w-3.5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <p className='truncate text-sm font-semibold text-white'>{item.title}</p>
                            <Badge variant='outline' className='border-slate-700 text-[10px] text-slate-300'>
                              {item.tag}
                            </Badge>
                          </div>
                          <p className='mt-0.5 text-[11px] text-slate-400'>{item.when}</p>
                          <p className='mt-1 text-xs leading-5 text-slate-300'>{item.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Main>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className='border-slate-800 bg-slate-950 text-slate-50 sm:max-w-xl'>
          {selectedRecord && (
            <>
              <DialogHeader>
                <div className='inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200'>
                  <BrainCircuit className='h-3.5 w-3.5' />
                  {selectedRecord.category}
                </div>
                <DialogTitle className='mt-2 text-2xl text-white'>{selectedRecord.title}</DialogTitle>
                <DialogDescription className='text-slate-400'>
                  {selectedRecord.timestamp} · {selectedRecord.duration}
                </DialogDescription>
              </DialogHeader>

              <div className='mt-4 space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='rounded-2xl border border-slate-800 bg-slate-900/80 p-4'>
                    <p className='text-sm text-slate-400'>学习评分</p>
                    <p className='mt-2 text-3xl font-bold text-white'>{selectedRecord.score}</p>
                  </div>
                  <div className='rounded-2xl border border-slate-800 bg-slate-900/80 p-4'>
                    <p className='text-sm text-slate-400'>状态</p>
                    <p className='mt-2 flex items-center gap-2 text-lg font-semibold text-emerald-300'>
                      <CheckCircle2 className='h-5 w-5' />
                      已达标
                    </p>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-800 bg-slate-900/80 p-4'>
                  <div className='mb-2 flex items-center gap-2 text-sm font-medium text-sky-300'>
                    <ArrowUpRight className='h-4 w-4' />
                    学习总结
                  </div>
                  <p className='leading-7 text-slate-300'>{selectedRecord.summary}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
