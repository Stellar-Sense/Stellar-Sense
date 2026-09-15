import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { usePathPlan } from '@/features/path-planning/adaptive-api'
import { PathPlanet } from '@/features/path-planning/path-constellation'
import { PathNodeDialog } from '@/features/path-planning/path-node-dialog'

export function LearningPath() {
  const en = useLocale((state) => state.locale) === 'en'
  const navigate = useNavigate()
  const plan = usePathPlan()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const entries = plan.data?.entries ?? []
  const next = plan.data?.nextNodeId ?? null
  return (
    <div className='flex h-full min-w-0 flex-col justify-center rounded-2xl border border-white/8 bg-slate-900/40 p-3'>
      {plan.isPending ? (
        <p role='status' className='text-xs text-slate-400'>
          {en ? 'Loading route…' : '正在同步路线…'}
        </p>
      ) : plan.isError ? (
        <button
          type='button'
          onClick={() => void plan.refetch()}
          className='text-sm text-sky-200'
        >
          {en ? 'Retry loading route' : '重新加载路线'}
        </button>
      ) : entries.length === 0 ? (
        <p className='py-3 text-sm text-slate-300'>
          {plan.data?.goalReached
            ? en
              ? 'Route complete. Set a new goal.'
              : '当前路线已完成，可以选择新的目标。'
            : en
              ? 'Choose a goal to begin.'
              : '前往路径规划，选择学习目标。'}
        </p>
      ) : (
        <ul className='flex min-w-0 items-start gap-1 overflow-x-auto pb-2'>
          {entries.slice(0, 4).map((entry) => (
            <li
              key={entry.nodeId}
              className='flex min-w-[105px] flex-1 items-center'
            >
              <button
                type='button'
                onClick={() => setSelectedId(entry.nodeId)}
                aria-label={en ? `View ${entry.name}` : `查看 ${entry.name}`}
                className='path-stop flex flex-1 flex-col items-center rounded-lg text-center focus-visible:outline-2 focus-visible:outline-sky-300'
              >
                <span className='scale-75'>
                  <PathPlanet entry={entry} current={entry.nodeId === next} />
                </span>
                <span className='-mt-1 line-clamp-2 px-1 text-xs leading-5 text-slate-200'>
                  {entry.name}
                </span>
                <span className='mt-1 text-[10px] text-slate-400'>
                  {entry.nodeId === next
                    ? en
                      ? 'Recommended next'
                      : '推荐下一步'
                    : entry.status === 'ready'
                      ? en
                        ? 'Ready to learn'
                        : '可选择学习'
                      : en
                        ? 'Prerequisites first'
                        : '先学前置'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className='mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2'>
        <span className='text-[10px] text-slate-400'>
          {en ? 'Synced with your learning route' : '与路径规划同步'}
        </span>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 text-xs text-sky-200'
          onClick={() => void navigate({ to: '/path-planning' })}
        >
          {en ? 'Full route' : '查看完整路线'}
          <ArrowRight className='ml-1 size-3' />
        </Button>
      </div>
      <PathNodeDialog
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
        entries={entries}
        nodes={plan.data?.nodes}
        nextNodeId={next}
        syncing={plan.isFetching}
      />
    </div>
  )
}
