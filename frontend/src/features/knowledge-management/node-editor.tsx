import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { panelClass, selectClass } from '@/components/learning-page'
import type { GraphNode } from '@/features/path-planning/adaptive-api'
import { kindLabels, useGraphMutation, useManagedTasks } from './api'

export function NodeEditor({
  node,
  revision,
  onSaved,
  onCancel,
}: {
  node?: GraphNode
  revision: number
  onSaved: (id?: string) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: node?.name ?? '',
    domain: node?.domain ?? '',
    kind: node?.kind ?? 'concept',
    difficulty: node?.difficulty ?? 1,
    minutes: node?.minutes ?? 30,
    description: node?.description ?? '',
    x: node?.x ?? 50,
    y: node?.y ?? 50,
  })
  const mutation = useGraphMutation()
  const [baseRevision] = useState(revision)
  return (
    <form
      className={`${panelClass} space-y-4`}
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate(
          {
            method: node ? 'put' : 'post',
            path: node ? `/nodes/${encodeURIComponent(node.id)}` : '/nodes',
            data: { ...form, expectedRevision: baseRevision },
          },
          {
            onSuccess: (result) => {
              toast.success(node ? '节点已更新' : '节点已创建')
              onSaved(result.id ?? node?.id)
            },
          }
        )
      }}
    >
      <h2 className='font-semibold'>{node ? '编辑节点' : '新建节点'}</h2>
      {revision !== baseRevision && (
        <p role='alert' className='text-xs text-amber-200'>
          图谱已更新，请取消并重新打开编辑，核对最新内容后保存。
        </p>
      )}
      <label className='block text-sm'>
        节点名称
        <Input
          required
          maxLength={128}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className='mt-1'
        />
      </label>
      <label className='block text-sm'>
        所属领域
        <Input
          required
          maxLength={64}
          value={form.domain}
          onChange={(e) => setForm({ ...form, domain: e.target.value })}
          className='mt-1'
        />
      </label>
      <div className='grid grid-cols-2 gap-3'>
        <label className='text-sm'>
          节点类型
          <select
            className={selectClass}
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            {Object.entries(kindLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className='text-sm'>
          默认难度
          <select
            className={selectClass}
            value={form.difficulty}
            onChange={(e) =>
              setForm({ ...form, difficulty: Number(e.target.value) })
            }
          >
            <option value={1}>基础</option>
            <option value={2}>分步</option>
            <option value={3}>综合</option>
          </select>
        </label>
      </div>
      <label className='block text-sm'>
        预计学习时间（分钟）
        <Input
          required
          type='number'
          min={1}
          max={600}
          value={form.minutes}
          onChange={(e) =>
            setForm({ ...form, minutes: e.target.valueAsNumber })
          }
        />
      </label>
      <label className='block text-sm'>
        知识说明
        <Textarea
          maxLength={20000}
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className='mt-1'
        />
      </label>
      <div className='grid grid-cols-2 gap-3'>
        {(['x', 'y'] as const).map((axis) => (
          <label key={axis} className='text-sm'>
            星图 {axis.toUpperCase()} 坐标（0–100）
            <Input
              required
              type='number'
              min={0}
              max={100}
              step='any'
              value={form[axis]}
              onChange={(e) =>
                setForm({ ...form, [axis]: e.target.valueAsNumber })
              }
            />
          </label>
        ))}
      </div>
      <div className='flex gap-2'>
        <Button disabled={mutation.isPending} type='submit'>
          保存节点
        </Button>
        <Button type='button' variant='ghost' onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  )
}

export function TaskEditor({
  nodeId,
  revision,
}: {
  nodeId: string
  revision: number
}) {
  const tasks = useManagedTasks(nodeId)
  const mutation = useGraphMutation()
  const [form, setForm] = useState({
    title: '',
    kind: 'quiz',
    difficulty: 1,
    minutes: 10,
    prompt: '',
    options: '',
    answerIndex: 0,
    reference: '',
    source: '',
    rubric: '概念准确性、推理过程、适用条件，各项按 0—100 分评价。',
  })
  const [removing, setRemoving] = useState<string | null>(null)
  return (
    <section className={`${panelClass} space-y-4`}>
      <h2 className='font-semibold'>学习评价任务</h2>
      <p className='text-xs leading-5 text-slate-400'>
        每个知识点至少配置两道不同题目，以便确认掌握。客观题由服务器判分；主观题根据量规与资料调用真实模型。
      </p>
      {tasks.isError && <p role='alert'>任务加载失败。</p>}
      {tasks.data?.map((task) => (
        <div
          key={task.id}
          className='rounded-lg border border-white/10 p-3 text-sm'
        >
          <p>
            {task.title}{' '}
            <span className='text-xs text-slate-400'>
              · {task.kind === 'quiz' ? '客观题' : '主观题'} · 难度{' '}
              {task.difficulty}
            </span>
          </p>
          <p className='my-2 text-xs text-slate-400'>{task.prompt}</p>
          {removing === task.id ? (
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='destructive'
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate(
                    {
                      method: 'delete',
                      path: `/tasks/${task.id}`,
                      data: { expectedRevision: revision },
                    },
                    { onSuccess: () => setRemoving(null) }
                  )
                }
              >
                确认移除
              </Button>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setRemoving(null)}
              >
                取消
              </Button>
            </div>
          ) : (
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setRemoving(task.id)}
            >
              移除任务
            </Button>
          )}
        </div>
      ))}
      <form
        className='space-y-3 border-t border-white/10 pt-4'
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate(
            {
              method: 'post',
              path: `/nodes/${encodeURIComponent(nodeId)}/tasks`,
              data: {
                ...form,
                options: form.options
                  .split('\n')
                  .map((option) => option.trim())
                  .filter(Boolean),
                expectedRevision: revision,
              },
            },
            {
              onSuccess: () => {
                toast.success('评价任务已添加')
                setForm({ ...form, title: '', prompt: '', options: '' })
              },
            }
          )
        }}
      >
        <label className='block text-sm'>
          任务标题
          <Input
            required
            maxLength={128}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className='grid grid-cols-3 gap-2'>
          <label className='text-xs'>
            类型
            <select
              className={selectClass}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value='quiz'>客观题</option>
              <option value='explanation'>主观题</option>
            </select>
          </label>
          <label className='text-xs'>
            难度
            <select
              className={selectClass}
              value={form.difficulty}
              onChange={(e) =>
                setForm({ ...form, difficulty: Number(e.target.value) })
              }
            >
              <option value={1}>基础</option>
              <option value={2}>分步</option>
              <option value={3}>综合</option>
            </select>
          </label>
          <label className='text-xs'>
            分钟
            <Input
              type='number'
              required
              min={1}
              max={180}
              value={form.minutes}
              onChange={(e) =>
                setForm({ ...form, minutes: e.target.valueAsNumber })
              }
            />
          </label>
        </div>
        <label className='block text-sm'>
          题目
          <Textarea
            required
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          />
        </label>
        {form.kind === 'quiz' && (
          <>
            <label className='block text-sm'>
              选项（每行一个，2–8 项）
              <Textarea
                required
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
              />
            </label>
            <label className='block text-sm'>
              正确选项
              <Input
                type='number'
                required
                min={1}
                max={8}
                value={form.answerIndex + 1}
                onChange={(e) =>
                  setForm({ ...form, answerIndex: e.target.valueAsNumber - 1 })
                }
              />
            </label>
          </>
        )}
        <label className='block text-sm'>
          参考答案与专业依据
          <Textarea
            required
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
        </label>
        <label className='block text-sm'>
          资料来源及章节／链接
          <Input
            required
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
        </label>
        {form.kind === 'explanation' && (
          <label className='block text-sm'>
            评分量规
            <Textarea
              required
              value={form.rubric}
              onChange={(e) => setForm({ ...form, rubric: e.target.value })}
            />
          </label>
        )}
        <Button type='submit' disabled={mutation.isPending}>
          添加评价任务
        </Button>
      </form>
    </section>
  )
}
