import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

type PathNode = {
  title: string
  status: 'completed' | 'current' | 'upcoming'
}

const pathNodes: PathNode[] = [
  { title: '遥感基础', status: 'completed' },
  { title: 'Python 数据处理', status: 'completed' },
  { title: '遥感影像处理', status: 'completed' },
  { title: '深度学习', status: 'current' },
  { title: 'Transformer', status: 'upcoming' },
  { title: '遥感大模型', status: 'upcoming' },
]

export function LearningPath() {
  return (
    <div className='flex h-full flex-col justify-center rounded-2xl border border-white/8 bg-slate-900/40 p-3'>
      <div className='flex flex-col gap-3 xl:flex-row xl:items-center'>
        {pathNodes.map((node, index) => (
          <div key={node.title} className='flex flex-1 items-center'>
            <div className='flex w-full flex-col items-center text-center'>
              {index > 0 && (
                <div className='mb-3 hidden h-px w-full max-w-[52px] bg-gradient-to-r from-sky-400/70 via-violet-400/50 to-slate-600/60 xl:block' />
              )}

              <div
                className={cn(
                  'relative flex h-14 w-14 items-center justify-center rounded-full border shadow-[0_0_0_6px_rgba(15,23,42,0.55)] transition-all',
                  node.status === 'completed' &&
                    'border-sky-400/60 bg-gradient-to-br from-sky-500/80 to-cyan-400/80 text-white shadow-sky-500/20',
                  node.status === 'current' &&
                    'border-violet-300/80 bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 text-white shadow-[0_0_20px_rgba(96,165,250,0.2)]',
                  node.status === 'upcoming' &&
                    'border-slate-600/70 bg-slate-800/90 text-slate-400'
                )}
              >
                {node.status === 'completed' ? (
                  <Check className='h-5 w-5' />
                ) : node.status === 'current' ? (
                  <Circle className='h-5 w-5 fill-current' />
                ) : (
                  <Circle className='h-4 w-4' />
                )}
              </div>

              <div className='mt-2.5 w-full'>
                <p
                  className={cn(
                    'text-[12px] font-medium leading-5',
                    node.status === 'completed' && 'text-sky-100',
                    node.status === 'current' && 'text-violet-100',
                    node.status === 'upcoming' && 'text-slate-400'
                  )}
                >
                  {node.title}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300'>
        <span className='rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1'>
          当前节点：深度学习
        </span>
        <span className='rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1'>
          下一节点：Transformer
        </span>
      </div>
    </div>
  )
}