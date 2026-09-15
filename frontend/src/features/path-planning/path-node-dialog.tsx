import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Clock3, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { t, useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLearningEvent } from '@/features/node-learning/assessment-api'
import type { GraphNode, PathEntry } from './adaptive-api'
import { PathPlanet } from './path-constellation'

export function PathNodeDialog({
  selectedId,
  onClose,
  entries,
  nodes,
  nextNodeId,
  readOnly = false,
  syncing = false,
}: {
  selectedId: string | null
  onClose: () => void
  entries: PathEntry[]
  nodes?: GraphNode[]
  nextNodeId?: string | null
  readOnly?: boolean
  syncing?: boolean
}) {
  const en = useLocale((state) => state.locale) === 'en'
  const navigate = useNavigate()
  const record = useLearningEvent()
  // 只存节点 ID，弹窗内容始终从本次最新路径派生，不能保留旧状态快照。
  const entry = entries.find((item) => item.nodeId === selectedId)
  const node = !readOnly
    ? nodes?.find((item) => item.id === selectedId)
    : undefined
  return (
    <Dialog
      open={selectedId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {selectedId !== null && (
        <DialogContent className='max-h-[85svh] overflow-y-auto overscroll-contain rounded-2xl border-sky-300/20 bg-[#0b1325] sm:max-w-xl'>
          <DialogHeader>
            {entry && (
              <div className='mb-2 flex justify-center sm:justify-start'>
                <PathPlanet
                  entry={entry}
                  current={entry.nodeId === nextNodeId}
                />
              </div>
            )}
            <DialogTitle>
              {entry?.name ?? (en ? 'Route updated' : '路径已更新')}
            </DialogTitle>
            <DialogDescription>
              {entry
                ? `${entry.domain} · ${entry.isGoal ? (en ? 'Learning goal' : '学习目标') : en ? 'Prerequisite preparation' : '前置补学'}`
                : en
                  ? 'This node is no longer in the pending route. Close to view the latest route.'
                  : '该节点已不在当前待学路线中，关闭后查看最新路线。'}
            </DialogDescription>
          </DialogHeader>
          {entry && (
            <>
              {readOnly && (
                <p className='rounded-lg bg-violet-400/10 p-3 text-xs text-violet-200'>
                  {en ? 'Historical route · read only' : '历史路线 · 仅供查看'}
                </p>
              )}
              {node?.description && (
                <p className='max-h-40 overflow-y-auto text-sm leading-7 whitespace-pre-wrap text-slate-300'>
                  {node.description}
                </p>
              )}
              <div className='flex items-center gap-2 text-sm text-sky-200'>
                <Clock3 className='size-4' />
                {en ? 'Estimated study time' : '预计学习时间'} · {entry.minutes}{' '}
                {en ? 'minutes' : '分钟'}
              </div>
              {entry.sessions.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {entry.sessions.map((session, index) => (
                    <span
                      key={`${session.day}-${index}`}
                      className='rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300'
                    >
                      {t('第 {0} 天 · {1} 分钟', session.day, session.minutes)}
                    </span>
                  ))}
                </div>
              )}
              {entry.prerequisites.length > 0 ? (
                <div className='rounded-xl border border-amber-300/15 bg-amber-300/5 p-3'>
                  <p className='mb-2 flex items-center gap-2 text-sm text-amber-200'>
                    <LockKeyhole className='size-4' />
                    {en ? 'Learn these first' : '请先学习这些内容'}
                  </p>
                  <p className='text-sm leading-6 text-slate-300'>
                    {entry.prerequisites
                      .map(
                        (id) =>
                          entries.find((item) => item.nodeId === id)?.name ??
                          nodes?.find((item) => item.id === id)?.name ??
                          id
                      )
                      .join('、')}
                  </p>
                </div>
              ) : (
                <p className='text-sm text-slate-300'>
                  {en
                    ? 'Ready to begin this step.'
                    : '前置内容已就绪，可以开始这一站。'}
                </p>
              )}
              {entry.taskTitle && (
                <p className='text-sm text-slate-300'>
                  {en ? 'Practice' : '配套练习'}：{entry.taskTitle}
                </p>
              )}
              {!readOnly && (
                <div className='flex flex-wrap gap-2 border-t border-white/10 pt-4'>
                  <Button
                    disabled={
                      entry.status !== 'ready' || record.isPending || syncing
                    }
                    onClick={() =>
                      record.mutate(
                        {
                          requestId: crypto.randomUUID(),
                          nodeId: entry.nodeId,
                          kind: 'accept',
                        },
                        {
                          onSuccess: () => {
                            onClose()
                            void navigate({
                              to: '/node-learning',
                              search: { nodeId: entry.nodeId },
                            })
                          },
                        }
                      )
                    }
                  >
                    {syncing ? (en ? 'Syncing…' : '同步中…') : t('开始学习')}
                    <ArrowRight className='ml-1 size-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    disabled={record.isPending || syncing}
                    onClick={() =>
                      record.mutate(
                        {
                          requestId: crypto.randomUUID(),
                          nodeId: entry.nodeId,
                          kind: 'skip',
                        },
                        {
                          onSuccess: () => {
                            onClose()
                            toast.success(t('已记录跳过偏好，必要先修仍会保留'))
                          },
                        }
                      )
                    }
                  >
                    {t('暂时跳过')}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
