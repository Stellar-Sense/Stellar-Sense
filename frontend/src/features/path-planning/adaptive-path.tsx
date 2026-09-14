import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  LockKeyhole,
  RefreshCw,
  Route,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { t, useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LearningPage, panelClass } from '@/components/learning-page'
import { useLearningEvent } from '@/features/node-learning/assessment-api'
import {
  usePathHistory,
  usePathPlan,
  usePathReplay,
  useRegeneratePath,
  useUpdateGoal,
  type Goal,
  type GraphNode,
  type PathEntry,
  type PathPlanPayload,
} from './adaptive-api'

const difficultyLabels = ['', '基础练习', '分步练习', '综合练习']

function GoalEditor({
  goal,
  nodes,
  suggestion,
}: {
  goal: Goal
  nodes: GraphNode[]
  suggestion?: PathPlanPayload['profileSuggestion']
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
          { onSuccess: () => toast.success(t('目标与学习时间已保存')) }
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

function EntryCard({
  entry,
  readOnly = false,
}: {
  entry: PathEntry
  readOnly?: boolean
}) {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const record = useLearningEvent()
  return (
    <article
      className={`rounded-xl border p-4 ${entry.status === 'ready' ? 'border-sky-500/30 bg-sky-500/5' : 'border-white/10 bg-white/[0.02]'}`}
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='mb-1 text-xs text-slate-400'>
            {entry.domain} · {entry.isGoal ? t('目标节点') : t('先修补学')}
            {entry.isReview ? t(' · 复习巩固') : ''}
          </p>
          <h3 className='font-medium'>{entry.name}</h3>
        </div>
        <span
          className={`flex items-center gap-1 text-xs ${entry.status === 'ready' ? 'text-sky-300' : 'text-amber-200'}`}
        >
          {entry.status === 'ready' ? (
            <CheckCircle2 className='size-3.5' />
          ) : (
            <LockKeyhole className='size-3.5' />
          )}
          {entry.status === 'ready' ? t('可立即学习') : t('等待前置达标')}
        </span>
      </div>
      <div className='my-3 flex flex-wrap gap-3 text-xs text-slate-300'>
        <span>
          {t('掌握度')}
          {entry.mastery}%
        </span>
        <span>
          {t('置信度')}
          {entry.confidence}%
        </span>
        <span>{t(difficultyLabels[entry.difficulty])}</span>
        <span>
          {entry.minutes}
          {t('分钟')}
        </span>
      </div>
      <ul className='space-y-1 text-xs leading-5 text-slate-400'>
        {entry.reasons.map((reason) => (
          <li key={reason}>• {reason}</li>
        ))}
      </ul>
      <p className='mt-3 text-xs text-violet-300'>
        {entry.sessions
          .map((session) =>
            t('第 {0} 天 · {1} 分钟', session.day, session.minutes)
          )
          .join(' / ')}
      </p>
      {entry.taskTitle && (
        <p className='mt-2 text-xs text-slate-300'>
          {t('评价任务：')}
          {entry.taskTitle}
        </p>
      )}
      {!readOnly && (
        <div className='mt-4 flex gap-2'>
          <Button
            size='sm'
            disabled={entry.status !== 'ready' || record.isPending}
            onClick={() =>
              record.mutate(
                {
                  requestId: crypto.randomUUID(),
                  nodeId: entry.nodeId,
                  kind: 'accept',
                },
                {
                  onSuccess: () =>
                    navigate({
                      to: '/node-learning',
                      search: { nodeId: entry.nodeId },
                    }),
                }
              )
            }
          >
            {t('开始学习')}
            <ArrowRight className='ml-1 size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='sm'
            disabled={record.isPending}
            onClick={() =>
              record.mutate(
                {
                  requestId: crypto.randomUUID(),
                  nodeId: entry.nodeId,
                  kind: 'skip',
                },
                {
                  onSuccess: () =>
                    toast.success(t('已记录跳过偏好，必要先修仍会保留')),
                }
              )
            }
          >
            {t('暂时跳过')}
          </Button>
        </div>
      )}
    </article>
  )
}

export function PathPlanning() {
  useLocale((state) => state.locale)

  const plan = usePathPlan()
  const history = usePathHistory()
  const regenerate = useRegeneratePath()
  const [version, setVersion] = useState<number | null>(null)
  const replay = usePathReplay(version)
  const data = plan.data
  return (
    <LearningPage
      title={t('学习路径')}
      description={t(
        '从你的目标出发，依据先修关系与学习证据安排补学、练习和复习。目标或证据变化后，路径会重新计算。'
      )}
      actions={
        <Button
          variant='outline'
          disabled={regenerate.isPending || !data}
          onClick={() =>
            regenerate.mutate(undefined, {
              onSuccess: (result) =>
                toast.success(
                  result.changed
                    ? t('已生成第 {0} 版路径', result.version)
                    : t('当前安排仍然适用，沿用原版本')
                ),
            })
          }
        >
          <RefreshCw
            className={`mr-2 size-4 ${regenerate.isPending ? 'animate-spin' : ''}`}
          />
          {t('重新规划')}
        </Button>
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
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                {
                  icon: Route,
                  label: '当前路径',
                  value: t('第 {0} 版', data.version),
                },
                {
                  icon: CheckCircle2,
                  label: '已达标 / 目标及先修节点',
                  value: `${data.completedNodeIds.length} / ${data.completedNodeIds.length + data.entries.length}`,
                },
                {
                  icon: Clock3,
                  label: '按当前预算预计',
                  value: t(
                    '{0} 分钟 · {1} 天',
                    data.totalMinutes,
                    data.estimatedDays
                  ),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className={panelClass}>
                  <Icon className='mb-3 size-5 text-sky-300' />
                  <p className='text-xs text-slate-400'>{t(label)}</p>
                  <p className='mt-2 text-xl font-semibold'>{value}</p>
                </div>
              ))}
            </div>
            <div className='grid items-start gap-5 xl:grid-cols-[340px_1fr]'>
              <div className='space-y-5'>
                <GoalEditor
                  key={data.goal.version}
                  goal={data.goal}
                  nodes={data.nodes}
                  suggestion={data.profileSuggestion}
                />
                <section className={panelClass}>
                  <h2 className='flex items-center gap-2 font-semibold'>
                    <History className='size-4 text-violet-300' />
                    {t('路径版本')}
                  </h2>
                  <p className='my-2 text-xs leading-5 text-slate-400'>
                    {t(
                      '只有安排发生变化才保存新版本。查看历史不会覆盖当前路径。'
                    )}
                  </p>
                  {history.isError && (
                    <p role='alert' className='text-sm'>
                      {t('版本记录加载失败。')}
                    </p>
                  )}
                  <div className='max-h-80 space-y-2 overflow-y-auto'>
                    {history.data?.map((item) => (
                      <button
                        key={item.version}
                        className='w-full rounded-lg border border-white/10 p-3 text-left hover:bg-white/5'
                        onClick={() => setVersion(item.version)}
                      >
                        <p className='text-sm'>
                          {t('第 {0} 版', item.version)}{' '}
                          <span className='float-right text-xs text-slate-500'>
                            {new Date(item.createdAt).toLocaleDateString(
                              useLocale.getState().locale === 'zh'
                                ? 'zh-CN'
                                : 'en-US'
                            )}
                          </span>
                        </p>
                        <p className='mt-1 text-xs text-slate-400'>
                          {item.trigger}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <section className={`${panelClass} space-y-4`}>
                <div className='flex items-center justify-between gap-3'>
                  <h2 className='font-semibold'>
                    {version
                      ? t('历史路径 · 第 {0} 版', version)
                      : t('目标与补学路线')}
                  </h2>
                  {version && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setVersion(null)}
                    >
                      {t('返回当前路径')}
                    </Button>
                  )}
                </div>
                {version ? (
                  replay.isPending ? (
                    <p role='status'>{t('正在回放历史路径…')}</p>
                  ) : replay.isError ? (
                    <p role='alert'>{t('回放失败，请重试或返回当前路径。')}</p>
                  ) : (
                    replay.data && (
                      <>
                        <div className='rounded-xl bg-violet-500/10 p-3 text-xs leading-6 text-violet-200'>
                          {replay.data.verified
                            ? t('冻结输入重新计算一致')
                            : t('当前规则版本无法验证此记录')}{' '}
                          {t('· 图谱版本')}
                          {replay.data.graphRevision}
                          <br />
                          {replay.data.eventIds.length}
                          {t('条学习事件 ·')} {replay.data.evaluationIds.length}
                          {t('条评价 · 每天')} {replay.data.goal.dailyMinutes}
                          {t('分钟')}
                          <br />
                          {replay.data.changes.join('；')}
                        </div>
                        {replay.data.result.entries.map((entry) => (
                          <EntryCard
                            key={entry.nodeId}
                            entry={entry}
                            readOnly
                          />
                        ))}
                        {replay.data.result.goalReached && (
                          <p>{t('该版本中的目标已达标。')}</p>
                        )}
                      </>
                    )
                  )
                ) : (
                  <>
                    {data.goalReached && (
                      <div className='rounded-xl bg-emerald-500/10 p-5 text-emerald-200'>
                        {t(
                          '当前目标已达标。可以选择新的目标，或进入节点学习进行复习。'
                        )}
                      </div>
                    )}
                    {!data.entries.length && !data.goalReached && (
                      <p className='text-slate-400'>
                        {t('还没有可规划的知识节点，请管理员先维护星图。')}
                      </p>
                    )}
                    {data.entries.map((entry) => (
                      <EntryCard key={entry.nodeId} entry={entry} />
                    ))}
                  </>
                )}
              </section>
            </div>
          </>
        )
      )}
    </LearningPage>
  )
}
