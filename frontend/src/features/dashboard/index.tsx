import { CalendarDays, CheckCircle2, Target, TrendingUp } from 'lucide-react'
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
import { AbilityRadar } from './components/ability-radar'
import { AiSuggestion } from './components/ai-suggestion'
import { LearningPath } from './components/learning-path'
import { RecentLearning } from './components/recent-learning'

const statCards = [
  {
    title: '学习天数',
    value: '28 天',
    description: '连续学习中',
    icon: CalendarDays,
  },
  {
    title: '已完成节点',
    value: '24 / 86',
    description: '知识节点',
    icon: CheckCircle2,
  },
  {
    title: '学科掌握度',
    value: '68%',
    description: '较上周 +8%',
    icon: Target,
  },
  {
    title: '当前学习阶段',
    value: '深度学习',
    description: '建议继续学习 Transformer',
    icon: TrendingUp,
  },
]

export function Dashboard() {
  return (
    <>
      <Header>
        <Search />
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
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 backdrop-blur-sm'>
            <div className='flex min-w-0 items-center gap-3'>
              <span className='inline-flex shrink-0 items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.22em] text-sky-200 uppercase'>
                AI × Remote Sensing
              </span>
              <h1 className='text-lg font-bold tracking-tight text-white md:text-xl'>
                学习驾驶舱
              </h1>
              <p className='hidden truncate text-xs text-slate-400 md:block'>
                掌握你的学习进度，探索遥感与大模型知识体系
              </p>
            </div>

            <Button className='h-9 shrink-0 rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 text-sm font-medium text-sky-100 shadow-sm shadow-sky-500/10 hover:bg-sky-500/15'>
              继续学习 →
            </Button>
          </div>

          <div className='grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4'>
            {statCards.map((card) => (
              <Card
                key={card.title}
                className='border border-white/10 bg-slate-950/60 p-0 shadow-[0_10px_24px_rgba(2,6,23,0.35)] backdrop-blur-sm'
              >
                <CardHeader className='flex flex-row items-center justify-between space-y-0 px-3.5 pb-1.5 pt-3'>
                  <CardTitle className='text-xs font-medium text-slate-300'>
                    {card.title}
                  </CardTitle>
                  <div className='flex h-7 w-7 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-sky-200'>
                    <card.icon className='h-3.5 w-3.5' />
                  </div>
                </CardHeader>
                <CardContent className='px-3.5 pb-3'>
                  <div className='text-xl font-bold tracking-tight text-white'>
                    {card.value}
                  </div>
                  <p className='mt-0.5 truncate text-[11px] text-slate-400'>
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-2 xl:grid-rows-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
            <Card className='flex min-h-0 flex-col border border-white/10 bg-slate-950/70 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <CardHeader className='shrink-0 px-4 pt-3.5 pb-1'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <CardTitle className='text-base font-semibold text-white'>
                      当前学习路径
                    </CardTitle>
                    <CardDescription className='mt-0.5 text-xs text-slate-300'>
                      你的个性化遥感学习路线
                    </CardDescription>
                  </div>
                  <div className='rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[10px] font-medium text-violet-200'>
                    课程进度 58%
                  </div>
                </div>
              </CardHeader>
              <CardContent className='min-h-0 flex-1 px-4 pb-3.5'>
                <LearningPath />
              </CardContent>
            </Card>

            <Card className='flex min-h-0 flex-col border border-white/10 bg-slate-950/70 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm'>
              <CardHeader className='shrink-0 px-4 pt-3.5 pb-1'>
                <CardTitle className='text-base font-semibold text-white'>
                  能力雷达图
                </CardTitle>
                <CardDescription className='text-xs text-slate-300'>
                  当前各项能力掌握情况
                </CardDescription>
              </CardHeader>
              <CardContent className='min-h-0 flex-1 px-4 pb-3.5'>
                <AbilityRadar />
              </CardContent>
            </Card>

            <RecentLearning />

            <AiSuggestion />
          </div>
        </div>
      </Main>
    </>
  )
}