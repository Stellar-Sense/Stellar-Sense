import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DashboardRecentItem } from '../api'

type RecentLearningProps = {
  items: DashboardRecentItem[]
}

export function RecentLearning({ items }: RecentLearningProps) {
  return (
    <Card className='flex min-h-0 flex-col border border-white/10 bg-slate-950/70 shadow-[0_12px_30px_rgba(15,23,42,0.45)] backdrop-blur-sm'>
      <CardHeader className='shrink-0 pt-3.5 pb-2'>
        <CardTitle className='text-base font-semibold text-white'>
          最近学习
        </CardTitle>
        <CardDescription className='text-xs text-slate-300'>
          你最近学习的知识节点
        </CardDescription>
      </CardHeader>
      <CardContent className='min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-3.5'>
        {items.map((item) => (
          <div
            key={item.title}
            className='rounded-2xl border border-white/8 bg-slate-900/70 p-2.5'
          >
            <div className='flex items-center gap-3'>
              <Avatar className='h-8 w-8 rounded-xl'>
                <AvatarFallback className={`rounded-xl ${item.iconClass}`}>
                  {item.fallback}
                </AvatarFallback>
              </Avatar>

              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='truncate text-sm font-medium text-slate-100'>
                    {item.title}
                  </p>
                  <div className='flex items-center gap-1 text-[10px] font-medium text-slate-300'>
                    {item.status}
                    <ArrowUpRight className='h-3.5 w-3.5 text-sky-300' />
                  </div>
                </div>

                <p className='mt-1 text-[11px] text-slate-400'>{item.description}</p>

                <div className='mt-2 flex items-center gap-2'>
                  <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800'>
                    <div
                      className='h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500'
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className='flex items-center gap-1 text-[10px] text-slate-300'>
                    <CheckCircle2 className='h-3 w-3 text-emerald-400' />
                    {item.progress}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}