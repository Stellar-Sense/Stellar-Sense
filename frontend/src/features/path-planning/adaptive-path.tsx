import { useState } from 'react'
import { Clock3, History, RefreshCw, Route, Target } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { LearningPage, panelClass } from '@/components/learning-page'
import {
  usePathHistory,
  usePathPlan,
  usePathReplay,
  useRegeneratePath,
  useUpdateGoal,
  type Goal,
  type GraphNode,
  type PathPlanPayload,
} from './adaptive-api'
import { PathConstellation } from './path-constellation'
import { PathNodeDialog } from './path-node-dialog'

function GoalEditor({
  goal,
  nodes,
  suggestion,
  onSaved,
}: {
  goal: Goal
  nodes: GraphNode[]
  suggestion?: PathPlanPayload['profileSuggestion']
  onSaved?: () => void
}) {
  useLocale((state) => state.locale)

  const [selected, setSelected] = useState(goal.nodeIds)
  const [minutes, setMinutes] = useState(goal.dailyMinutes)
  const [search, setSearch] = useState('')
  const update = useUpdateGoal()
  return (
    <form
      className={panelClass}
      onSubmit={(event) => {
        event.preventDefault()
        update.mutate(
          { nodeIds: selected, dailyMinutes: minutes },
          {
            onSuccess: () => {
              toast.success(t('目标与学习时间已保存'))
              onSaved?.()
            },
          }
        )
      }}
    >
      <h2 className='flex items-center gap-2 font-semibold'>
        <Target className='size-4 text-sky-300' />
        {t('我的学习目标')}
      </h2>
      <p className='mt-2 text-xs leading-5 text-slate-400'>
        {t(
          '可选择课程、方向或知识点；系统会补齐必要先修。未选择时规划整个星图。'
        )}
      </p>
      {suggestion && suggestion.nodeIds.length > 0 && (
        <div className='my-3 rounded-lg border border-sky-400/20 bg-sky-400/5 p-3'>
          <p className='text-sm text-sky-200'>{t('根据个人画像推荐')}</p>
          <p className='my-2 text-xs text-muted-foreground'>
            {t(suggestion.reason)}
          </p>
          <p className='mb-2 text-xs'>
            {suggestion.nodeIds
              .map((id) => nodes.find((node) => node.id === id)?.name)
              .filter(Boolean)
              .join('、')}{' '}
            · {suggestion.dailyMinutes} {t('分钟')}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setSelected(suggestion.nodeIds)
              setMinutes(suggestion.dailyMinutes)
            }}
          >
            {t('填入推荐目标与时间')}
          </Button>
          <p className='mt-2 text-xs text-muted-foreground'>
            {t('填入后可调整，点击保存目标后生效。')}
          </p>
        </div>
      )}
      <Input
        aria-label={t('搜索目标节点')}
        placeholder={t('搜索课程、方向或知识点')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className='my-3'
      />
      <div className='max-h-64 space-y-1 overflow-y-auto'>
        {nodes
          .filter((node) =>
            `${node.name} ${node.domain}`
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map((node) => (
            <label
              key={node.id}
              className='flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/5'
            >
              <input
                type='checkbox'
                checked={selected.includes(node.id)}
                disabled={!selected.includes(node.id) && selected.length >= 30}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, node.id]
                      : selected.filter((id) => id !== node.id)
                  )
                }
              />
              <span>
                {node.name}
                <span className='ml-2 text-xs text-slate-500'>
                  {node.domain}
                </span>
              </span>
            </label>
          ))}
        {nodes.length === 0 && (
          <p className='text-sm text-slate-400'>
            {t('暂无知识节点，请管理员维护星图。')}
          </p>
        )}
      </div>
      <div className='mt-4 flex items-end gap-3'>
        <label className='flex-1 text-sm'>
          {t('每天可用时间（分钟）')}
          <Input
            type='number'
            min={10}
            max={480}
            required
            value={minutes}
            onChange={(event) => setMinutes(event.target.valueAsNumber)}
            className='mt-2'
          />
        </label>
        <Button type='submit' disabled={update.isPending}>
          {update.isPending ? t('保存中…') : t('保存目标')}
        </Button>
      </div>
      <button
        type='button'
        className='mt-3 text-xs text-sky-300'
        onClick={() => setSelected([])}
      >
        {t('清空选择，学习整个星图')}
      </button>
    </form>
  )
}

export function PathPlanning() {
  const en = useLocale((state) => state.locale) === 'en'
  const plan = usePathPlan()
  const history = usePathHistory()
  const regenerate = useRegeneratePath()
  const [version, setVersion] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const replay = usePathReplay(version)
  const data = plan.data
  const showing = version !== null ? replay.data?.result : data
  const showingGoal = version !== null ? replay.data?.goal : data?.goal
  const nextId =
    showing?.nextNodeId ??
    showing?.entries.find((entry) => entry.status === 'ready')?.nodeId ??
    null
  const currentView = () => {
    setVersion(null)
    setSelectedId(null)
  }
  return (
    <LearningPage
      title={t('学习路径')}
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            onClick={() => setGoalsOpen(true)}
            disabled={!data}
          >
            <Target className='mr-2 size-4' />
            {en ? 'Adjust goals' : '调整目标'}
          </Button>
          <Button variant='outline' onClick={() => setHistoryOpen(true)}>
            <History className='mr-2 size-4' />
            {en ? 'Route history' : '历史路线'}
          </Button>
          <Button
            variant='outline'
            disabled={regenerate.isPending || plan.isFetching || !data}
            onClick={() =>
              regenerate.mutate(undefined, {
                onSuccess: (result) => {
                  currentView()
                  toast.success(
                    result.changed
                      ? t('已生成第 {0} 版路径', result.version)
                      : t('当前安排仍然适用，沿用原版本')
                  )
                },
              })
            }
          >
            <RefreshCw
              className={`mr-2 size-4 ${regenerate.isPending ? 'animate-spin' : ''}`}
            />
            {t('重新规划')}
          </Button>
        </div>
      }
    >
      {plan.isPending ? (
        <p role='status'>{t('正在计算学习路径…')}</p>
      ) : plan.isError ? (
        <div role='alert' className={panelClass}>
          {t('无法加载学习路径。')}
          <Button variant='link' onClick={() => void plan.refetch()}>
            {t('重试')}
          </Button>
        </div>
      ) : (
        data && (
          <>
            {version !== null ? (
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-300/20 bg-violet-300/5 px-4 py-3 text-sm text-violet-200'>
                <span>
                  <span className='mr-3'>
                    {en
                      ? `Historical route · Version ${version}`
                      : `历史路径 · 第 ${version} 版`}
                  </span>
                  {en
                    ? 'Viewing a saved route. Your current learning plan is unchanged.'
                    : '正在查看历史路线，不会改变当前学习安排。'}
                </span>
                <Button size='sm' variant='outline' onClick={currentView}>
                  {t('返回当前路径')}
                </Button>
              </div>
            ) : plan.isFetching || regenerate.isPending ? (
              <p role='status' className='text-xs text-slate-400'>
                {en ? 'Syncing the latest route…' : '正在同步最新路线…'}
              </p>
            ) : null}
            {version !== null && replay.isPending ? (
              <p role='status'>{t('正在回放历史路径…')}</p>
            ) : version !== null && replay.isError ? (
              <p role='alert'>{t('回放失败，请重试或返回当前路径。')}</p>
            ) : (
              showing && (
                <>
                  {showing.entries.length > 0 ? (
                    <PathConstellation
                      key={version ?? 'current'}
                      entries={showing.entries}
                      nextNodeId={nextId}
                      onSelect={setSelectedId}
                      selectedId={selectedId}
                      summary={
                        <div className='flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300'>
                          <span className='flex items-center gap-2'>
                            <Route className='size-4 text-violet-300' />
                            {showing?.entries.length ?? '—'}{' '}
                            {en ? 'stops ahead' : '个待学节点'}
                          </span>
                          <span className='flex items-center gap-2'>
                            <Clock3 className='size-4 text-sky-300' />
                            {showing
                              ? t(
                                  '{0} 分钟 · {1} 天',
                                  showing.totalMinutes,
                                  showing.estimatedDays
                                )
                              : '—'}
                          </span>
                          <span>
                            {en ? 'Daily budget' : '每天'}{' '}
                            {showingGoal?.dailyMinutes ?? '—'}{' '}
                            {en ? 'min' : '分钟'}
                          </span>
                        </div>
                      }
                    />
                  ) : (
                    <div className={`${panelClass} py-16 text-center`}>
                      <Route className='mx-auto mb-4 size-10 text-sky-300' />
                      <p>
                        {showing.goalReached
                          ? en
                            ? 'This route is complete. Choose a new learning goal when you are ready.'
                            : '这条路线已完成，可以调整目标，开启下一段学习旅程。'
                          : t('还没有可规划的知识节点，请管理员先维护星图。')}
                      </p>
                    </div>
                  )}
                </>
              )
            )}
            <PathNodeDialog
              selectedId={selectedId}
              onClose={() => setSelectedId(null)}
              entries={showing?.entries ?? []}
              nodes={version === null ? data.nodes : undefined}
              nextNodeId={nextId}
              readOnly={version !== null}
              syncing={plan.isFetching || regenerate.isPending}
            />
          </>
        )
      )}
      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent className='max-h-[85svh] overflow-y-auto overscroll-contain rounded-2xl sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>
              {en ? 'Adjust learning goals' : '调整学习目标'}
            </DialogTitle>
            <DialogDescription>
              {en
                ? 'Save to update the route across your learning pages.'
                : '保存后，路线图和学习驾驶舱将同步更新。'}
            </DialogDescription>
          </DialogHeader>
          {data && (
            <GoalEditor
              key={JSON.stringify(data.goal)}
              goal={data.goal}
              nodes={data.nodes}
              suggestion={data.profileSuggestion}
              onSaved={() => {
                setGoalsOpen(false)
                currentView()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className='max-h-[85svh] overflow-y-auto overscroll-contain rounded-2xl'>
          <DialogHeader>
            <DialogTitle>{en ? 'Route history' : '历史路线'}</DialogTitle>
            <DialogDescription>
              {t('只有安排发生变化才保存新版本。查看历史不会覆盖当前路径。')}
            </DialogDescription>
          </DialogHeader>
          {history.isPending && (
            <p role='status'>{en ? 'Loading…' : '加载中…'}</p>
          )}
          {history.isError && <p role='alert'>{t('版本记录加载失败。')}</p>}
          {history.data?.map((item) => (
            <button
              type='button'
              key={item.version}
              className='w-full rounded-xl border border-white/10 p-4 text-left hover:bg-sky-400/5'
              onClick={() => {
                setSelectedId(null)
                setVersion(item.version)
                setHistoryOpen(false)
              }}
            >
              <span className='text-sm'>{t('第 {0} 版', item.version)}</span>
              <span className='float-right text-xs text-slate-500'>
                {new Date(item.createdAt).toLocaleDateString(
                  en ? 'en-US' : 'zh-CN'
                )}
              </span>
              <p className='mt-2 text-xs text-slate-400'>{item.trigger}</p>
            </button>
          ))}
          {history.data?.length === 0 && (
            <p className='text-sm text-slate-400'>
              {en ? 'No saved routes yet.' : '还没有历史路线。'}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </LearningPage>
  )
}
