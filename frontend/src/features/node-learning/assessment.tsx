import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  useLearningEvent,
  useLearningEvents,
  useNodeTasks,
  useRetryEvaluation,
  type LearningTask,
} from './assessment-api'

function TaskAnswer({
  task,
  blocked,
}: {
  task: LearningTask
  blocked: boolean
}) {
  const [answer, setAnswer] = useState('')
  const [startedAt] = useState(() => Date.now())
  const [hint, setHint] = useState(false)
  const requestId = useRef<string | null>(null)
  const submittedDuration = useRef(0)
  const record = useLearningEvent()
  return (
    <form
      className='space-y-3 rounded-xl border border-white/10 p-4'
      onSubmit={(event) => {
        event.preventDefault()
        if (!requestId.current) {
          requestId.current = crypto.randomUUID()
          submittedDuration.current = Math.min(
            28800,
            Math.max(0, Math.round((Date.now() - startedAt) / 1000))
          )
        }
        record.mutate(
          {
            requestId: requestId.current,
            nodeId: task.nodeId,
            kind: 'answer',
            taskId: task.id,
            answer,
            durationSeconds: submittedDuration.current,
          },
          {
            onSuccess: (result) => {
              requestId.current = null
              toast.success(
                result.status === 'pending'
                  ? '作答已保存，等待模型评价'
                  : '评价完成，学习路径已同步'
              )
            },
          }
        )
      }}
    >
      <p className='font-medium'>{task.title}</p>
      <p className='text-sm leading-6 whitespace-pre-wrap text-slate-300'>
        {task.prompt}
      </p>
      <p className='text-xs text-slate-500'>
        难度 {task.difficulty} · 预计 {task.minutes} 分钟 ·{' '}
        {task.kind === 'quiz' ? '客观测验' : '主观作答'}
      </p>
      {task.kind === 'quiz' ? (
        <fieldset disabled={blocked || record.isPending} className='space-y-2'>
          <legend className='sr-only'>{task.title}的选项</legend>
          {task.options.map((option, index) => (
            <label
              key={index}
              className='flex cursor-pointer items-start gap-2 text-sm'
            >
              <input
                type='radio'
                name={task.id}
                required
                value={index}
                checked={answer === String(index)}
                onChange={(e) => {
                  setAnswer(e.target.value)
                  requestId.current = null
                }}
                className='mt-1'
              />
              {option}
            </label>
          ))}
        </fieldset>
      ) : (
        <Textarea
          aria-label={`${task.title}的作答`}
          required
          maxLength={12000}
          rows={4}
          disabled={blocked || record.isPending}
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value)
            requestId.current = null
          }}
          placeholder='写出你的理解、推理过程和适用条件'
        />
      )}
      <div className='flex gap-2'>
        <Button
          size='sm'
          type='submit'
          disabled={blocked || record.isPending || !answer.trim()}
        >
          {record.isPending ? '正在评价…' : '提交作答'}
        </Button>
        <Button
          size='sm'
          type='button'
          variant='ghost'
          disabled={record.isPending}
          onClick={() =>
            record.mutate(
              {
                requestId: crypto.randomUUID(),
                nodeId: task.nodeId,
                kind: 'hint',
                hintLevel: 1,
              },
              { onSuccess: () => setHint(true) }
            )
          }
        >
          学习提示
        </Button>
      </div>
      {hint && (
        <p className='text-xs leading-5 text-sky-300'>
          先回顾当前节点的概念和适用条件，再对照题目说明理由。参考资料：
          {task.source}
        </p>
      )}
      {record.data?.kind === 'answer' && (
        <div
          role='status'
          className='rounded-lg bg-sky-500/10 p-3 text-xs leading-6 whitespace-pre-wrap'
        >
          {record.data.feedback}
        </div>
      )}
    </form>
  )
}

export function NodeAssessment({ nodeId }: { nodeId: string }) {
  const query = useNodeTasks(nodeId)
  const events = useLearningEvents(nodeId)
  const retry = useRetryEvaluation()
  const record = useLearningEvent()
  const data = query.data
  return (
    <section
      className='mt-6 space-y-4 border-t border-white/10 pt-5'
      aria-label='节点学习评价'
    >
      <h2 className='text-base font-semibold text-white'>学习评价与掌握证据</h2>
      <p className='text-xs leading-6 text-slate-400'>
        阅读、提问和跳过会留下记录，但不会直接提高掌握度。近期至少两道不同任务的有效评价、掌握度
        ≥80% 且置信度 ≥60%，才能确认节点达标。
      </p>
      {query.isPending ? (
        <p role='status'>正在加载评价任务…</p>
      ) : query.isError ? (
        <p role='alert'>评价任务加载失败，请稍后重试。</p>
      ) : (
        data && (
          <>
            <div className='flex flex-wrap gap-4 text-sm'>
              <span>掌握度 {data.state.mastery}%</span>
              <span>置信度 {data.state.confidence}%</span>
              <span>{data.state.evidenceCount} 条评价</span>
            </div>
            {data.blockers.length > 0 && (
              <p className='rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200'>
                请先完成：{data.blockerNames.join('、')}
                。当前内容可预览，评价任务暂未解锁。
              </p>
            )}
            <Button
              size='sm'
              variant='outline'
              disabled={record.isPending}
              onClick={() =>
                record.mutate(
                  { requestId: crypto.randomUUID(), nodeId, kind: 'read' },
                  { onSuccess: () => toast.success('已记录阅读，不改变掌握度') }
                )
              }
            >
              记录已阅读
            </Button>
            {!data.tasks.length && (
              <p className='rounded-lg border border-white/10 p-4 text-sm text-slate-400'>
                该节点尚未配置评价任务，请管理员在知识星云管理中添加。
              </p>
            )}
            {data.tasks.map((task) => (
              <TaskAnswer
                key={task.id}
                task={task}
                blocked={data.blockers.length > 0}
              />
            ))}
          </>
        )
      )}
      <h3 className='text-sm font-semibold'>最近学习证据</h3>
      {events.data
        ?.filter((event) => event.kind === 'answer')
        .slice(0, 8)
        .map((event) => (
          <div
            key={event.id}
            className='rounded-lg border border-white/10 p-3 text-xs leading-6'
          >
            <p>
              {event.taskTitle} ·{' '}
              {event.status === 'pending' ? '待评价' : `${event.score} 分`} ·{' '}
              {new Date(event.createdAt).toLocaleString()}
            </p>
            <p className='whitespace-pre-wrap text-slate-400'>
              {event.feedback}
            </p>
            {event.status === 'pending' && (
              <Button
                size='sm'
                variant='outline'
                disabled={retry.isPending}
                onClick={() =>
                  retry.mutate(event.id, {
                    onSuccess: (result) =>
                      toast.info(
                        result.status === 'pending'
                          ? '模型暂不可用，作答继续保留'
                          : '评价已完成'
                      ),
                  })
                }
              >
                重试评价
              </Button>
            )}
          </div>
        ))}
    </section>
  )
}
