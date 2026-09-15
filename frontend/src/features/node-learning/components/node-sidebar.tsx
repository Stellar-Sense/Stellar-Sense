import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListTree,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LearningGroup, NodeStatus } from '../api'

type NodeSidebarProps = {
  groups: LearningGroup[]
  selectedNodeId: string
  nodeStatuses: Record<string, NodeStatus>
  currentProgress: number
  collapsed: boolean
  disabled?: boolean
  lockedNodeIds?: ReadonlySet<string>
  onToggle: () => void
  onSelect: (nodeId: string) => void
}

const statusStyles: Record<NodeStatus, string> = {
  done: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
  current: 'border-sky-400/50 bg-sky-500/20 text-sky-100',
  todo: 'border-slate-700 bg-slate-900/70 text-slate-500',
}

export function NodeSidebar({
  groups,
  selectedNodeId,
  nodeStatuses,
  currentProgress,
  collapsed,
  disabled,
  lockedNodeIds = new Set(),
  onToggle,
  onSelect,
}: NodeSidebarProps) {
  if (collapsed) {
    return (
      <aside className='flex min-h-14 items-start justify-center rounded-2xl border border-white/10 bg-slate-950/65 p-2 backdrop-blur-sm'>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          aria-label='展开节点目录'
          onClick={onToggle}
          className='rounded-xl text-sky-200 hover:bg-sky-500/10'
        >
          <ChevronRight className='size-4' />
        </Button>
      </aside>
    )
  }

  return (
    <aside className='flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 shadow-[0_12px_30px_rgba(15,23,42,.42)] backdrop-blur-sm'>
      <div className='flex items-center justify-between border-b border-slate-800 px-3 py-3'>
        <div className='flex items-center gap-2'>
          <ListTree className='size-4 text-cyan-300' />
          <h2 className='text-sm font-semibold text-white'>学习目录</h2>
        </div>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          aria-label='收起节点目录'
          onClick={onToggle}
          className='size-7 text-slate-400 hover:bg-slate-800 hover:text-white'
        >
          <ChevronLeft className='size-4' />
        </Button>
      </div>

      <div className='border-b border-slate-800 px-3 py-3'>
        <div className='flex items-center justify-between text-xs text-slate-300'>
          <span>整体进度</span>
          <span>{currentProgress}%</span>
        </div>
        <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800'>
          <div
            className='h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500'
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>

      <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-3'>
        {groups.map((group) => (
          <section key={group.group}>
            <h3 className='mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400'>
              {group.group}
            </h3>
            <div className='space-y-1.5'>
              {group.items.map((item) => {
                const selected = item.id === selectedNodeId
                const status = nodeStatuses[item.id] ?? item.status
                const locked = lockedNodeIds.has(item.id)

                return (
                  <button
                    key={item.id}
                    type='button'
                    disabled={disabled || locked}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
                      selected
                        ? 'border-sky-400/50 bg-sky-500/15 text-white shadow-[inset_3px_0_0_rgba(34,211,238,.85)]'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70',
                      locked && 'cursor-not-allowed opacity-55'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full border',
                        statusStyles[status]
                      )}
                    >
                      {locked ? (
                        <Lock className='size-3' />
                      ) : status === 'done' ? (
                        <Check className='size-3.5' />
                      ) : (
                        <Circle
                          className={cn(
                            'size-2.5',
                            status === 'current' && 'fill-current'
                          )}
                        />
                      )}
                    </span>
                    <span className='min-w-0 flex-1 truncate text-xs font-medium'>
                      {item.label}
                    </span>
                    {selected && (
                      <span className='text-[10px] text-sky-300'>当前</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
