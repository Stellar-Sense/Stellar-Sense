import { Bot, Clock3, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardSuggestion } from '../api'

type AiSuggestionProps = {
  suggestion: DashboardSuggestion
}

export function AiSuggestion({ suggestion }: AiSuggestionProps) {
  return (
    <Card className='relative flex min-h-0 flex-col overflow-hidden border border-cyan-400/20 bg-gradient-to-br from-sky-500/8 via-slate-950/80 to-violet-500/10 shadow-[0_12px_30px_rgba(14,165,233,0.09)] backdrop-blur-sm'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_28%)]' />

      <CardHeader className='relative shrink-0 pt-3.5 pb-2'>
        <CardTitle className='flex items-center gap-2 text-white'>
          <div className='flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200'>
            <Bot className='h-4 w-4' />
          </div>
          ✦ AI 学习建议
        </CardTitle>
      </CardHeader>

      <CardContent className='relative min-h-0 flex-1 space-y-3 overflow-y-auto pb-3.5'>
        <div className='rounded-2xl border border-white/10 bg-slate-900/60 p-3'>
          <div className='mb-3 flex items-center gap-2 text-sm font-medium text-cyan-200'>
            <Sparkles className='h-4 w-4' />
            推荐学习主题
          </div>
          <p className='text-sm leading-7 text-slate-200'>
            根据你的近期学习记录，推荐你继续学习：
            <span className='font-semibold text-white'>{suggestion.topic}</span>
          </p>
        </div>

        <div className='space-y-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3'>
          <p className='text-xs uppercase tracking-[0.18em] text-violet-200/80'>
            预计学习时间
          </p>
          <div className='flex items-center gap-2 text-sm text-violet-100'>
            <Clock3 className='h-4 w-4 text-violet-200' />
            <span>{suggestion.estimate}</span>
          </div>
        </div>

        <Button className='w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/20 transition-all hover:brightness-110'>
          <Sparkles className='mr-2 h-4 w-4' />
          开始学习 →
        </Button>
      </CardContent>
    </Card>
  )
}