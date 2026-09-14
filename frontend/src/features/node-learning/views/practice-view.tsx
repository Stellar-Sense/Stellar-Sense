import { useState } from 'react'
import {
  Check,
  Circle,
  Clock3,
  FlaskConical,
  Play,
  RotateCcw,
  Save,
  Send,
  SlidersHorizontal,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DemoSatelliteImage } from '../components/demo-satellite-image'
import { practiceDemo } from '../demo-data'

type PracticeViewProps = {
  onComplete: () => void
}

export function PracticeView({ onComplete }: PracticeViewProps) {
  const [method, setMethod] = useState<string>(practiceDemo.methods[0])
  const [strength, setStrength] = useState<number>(
    practiceDemo.defaultParameters.strength
  )
  const [contrast, setContrast] = useState<number>(
    practiceDemo.defaultParameters.contrast
  )
  const [localEnhancement, setLocalEnhancement] = useState<boolean>(
    practiceDemo.defaultParameters.localEnhancement
  )
  const [hasRun, setHasRun] = useState(false)
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const reset = () => {
    setMethod(practiceDemo.methods[0])
    setStrength(practiceDemo.defaultParameters.strength)
    setContrast(practiceDemo.defaultParameters.contrast)
    setLocalEnhancement(practiceDemo.defaultParameters.localEnhancement)
    setHasRun(false)
    setSubmitted(false)
  }

  const runDemo = () => {
    setHasRun(true)
    setSubmitted(false)
    toast.success('已运行前端预设效果（未执行真实遥感算法）')
  }

  const submit = () => {
    if (!hasRun) {
      toast.info('请先运行一次处理 Demo')
      return
    }
    if (!description.trim()) {
      toast.info('请补充处理结果说明')
      return
    }
    setSubmitted(true)
    onComplete()
    toast.success('实践任务已保存为前端 Demo 状态')
  }

  const checklist = [
    { label: '完成一次图像增强处理', done: hasRun },
    { label: '对比处理前后差异', done: hasRun },
    { label: '填写简要结果说明', done: Boolean(description.trim()) },
  ]

  return (
    <section className='space-y-4'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <span className='flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200'>
            <FlaskConical className='size-5' />
          </span>
          <div>
            <h2 className='text-lg font-semibold text-white'>实践任务</h2>
            <p className='text-xs text-slate-400'>
              在示例影像上应用增强方法并说明处理思路
            </p>
          </div>
        </div>
        <div className='flex gap-2 text-[10px]'>
          <span className='rounded-full border border-cyan-400/20 bg-cyan-500/8 px-2.5 py-1 text-cyan-200'>
            基础任务
          </span>
          <span className='flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-slate-300'>
            <Clock3 className='size-3' />
            {practiceDemo.duration}
          </span>
          <span className='rounded-full border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-amber-200'>
            UI Demo
          </span>
        </div>
      </header>

      <div className='flex items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-3'>
        <Target className='mt-0.5 size-4 shrink-0 text-cyan-300' />
        <div>
          <p className='text-xs font-semibold text-cyan-100'>任务目标</p>
          <p className='mt-1 text-xs leading-5 text-slate-300'>
            {practiceDemo.objective}
          </p>
        </div>
      </div>

      <div className='grid gap-3 xl:grid-cols-[1fr_1fr_230px]'>
        <div>
          <p className='mb-2 text-xs font-semibold text-slate-300'>原始影像</p>
          <DemoSatelliteImage variant='before' className='min-h-60' />
        </div>
        <div>
          <p className='mb-2 text-xs font-semibold text-slate-300'>处理结果</p>
          <DemoSatelliteImage
            variant={hasRun ? 'after' : 'before'}
            label={hasRun ? '处理后' : '等待运行'}
            className='min-h-60'
          />
        </div>
        <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-3'>
          <h3 className='text-sm font-semibold text-white'>任务完成清单</h3>
          <div className='mt-3 space-y-3'>
            {checklist.map((item) => (
              <div
                key={item.label}
                className='flex items-start gap-2 text-xs leading-5 text-slate-300'
              >
                {item.done ? (
                  <Check className='mt-0.5 size-4 shrink-0 text-emerald-300' />
                ) : (
                  <Circle className='mt-0.5 size-4 shrink-0 text-slate-600' />
                )}
                {item.label}
              </div>
            ))}
          </div>
          {submitted && (
            <p className='mt-4 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-200'>
              任务已提交（前端 Demo）
            </p>
          )}
        </div>
      </div>

      <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-4'>
        <div className='flex items-center gap-2 text-sm font-semibold text-white'>
          <SlidersHorizontal className='size-4 text-sky-300' />
          处理参数
        </div>
        <div className='mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr_1.2fr_0.8fr]'>
          <label className='text-xs text-slate-400'>
            增强方法
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className='mt-1.5 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200'
            >
              {practiceDemo.methods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className='text-xs text-slate-400'>
            <span className='flex justify-between'>
              <span>参数强度</span>
              <span className='text-sky-200'>
                {(strength / 100).toFixed(2)}
              </span>
            </span>
            <input
              type='range'
              min='20'
              max='100'
              value={strength}
              onChange={(event) => setStrength(Number(event.target.value))}
              className='mt-3 w-full accent-violet-500'
            />
          </label>
          <label className='text-xs text-slate-400'>
            <span className='flex justify-between'>
              <span>对比度提升</span>
              <span className='text-sky-200'>
                {(contrast / 100).toFixed(2)}
              </span>
            </span>
            <input
              type='range'
              min='80'
              max='180'
              value={contrast}
              onChange={(event) => setContrast(Number(event.target.value))}
              className='mt-3 w-full accent-sky-500'
            />
          </label>
          <label className='flex items-center justify-between gap-3 text-xs text-slate-400'>
            局部增强
            <Switch
              aria-label='局部增强'
              checked={localEnhancement}
              onCheckedChange={setLocalEnhancement}
            />
          </label>
        </div>
        <div className='mt-4 flex flex-wrap justify-center gap-2'>
          <Button
            type='button'
            onClick={runDemo}
            className='min-w-52 bg-violet-500 text-white hover:bg-violet-400'
          >
            <Play className='mr-2 size-4' />
            运行处理
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={reset}
            className='border-slate-700 bg-slate-900 text-slate-200'
          >
            <RotateCcw className='mr-2 size-4' />
            重置参数
          </Button>
        </div>
        <p className='mt-2 text-center text-[10px] text-amber-200/70'>
          运行处理仅切换预设视觉状态，不执行真实遥感计算。
        </p>
      </div>

      <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-4'>
        <label
          htmlFor='practice-result-description'
          className='text-xs font-semibold text-white'
        >
          结果说明
        </label>
        <Textarea
          id='practice-result-description'
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, 300))}
          placeholder={practiceDemo.defaultDescription}
          className='mt-2 min-h-20 resize-none border-slate-700 bg-slate-950/65 text-sm text-white'
        />
        <div className='mt-1 text-right text-[10px] text-slate-500'>
          {description.length} / 300
        </div>
        <div className='mt-3 flex flex-wrap justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => toast.success('草稿已保存在当前页面生命周期中')}
            className='border-slate-700 bg-slate-900 text-slate-200'
          >
            <Save className='mr-2 size-4' />
            保存草稿
          </Button>
          <Button
            type='button'
            onClick={submit}
            className='bg-violet-500 text-white hover:bg-violet-400'
          >
            <Send className='mr-2 size-4' />
            提交任务
          </Button>
        </div>
      </div>
    </section>
  )
}
