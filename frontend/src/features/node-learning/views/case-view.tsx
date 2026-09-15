import { useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Database,
  Lightbulb,
  MapPin,
  MessageSquareText,
  Send,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DemoSatelliteImage } from '../components/demo-satellite-image'
import { caseDemo } from '../demo-data'

type CaseViewProps = {
  onAskAI: (question: string) => void
  onComplete: () => void
}

export function CaseView({ onAskAI, onComplete }: CaseViewProps) {
  const [analysis, setAnalysis] = useState('')
  const [hintIndex, setHintIndex] = useState(-1)
  const [submitted, setSubmitted] = useState(false)

  const handleHint = () => {
    setHintIndex((current) => Math.min(current + 1, caseDemo.hints.length - 1))
  }

  const handleSubmit = () => {
    if (!analysis.trim()) {
      toast.info('请先写下你的观察与分析')
      return
    }
    setSubmitted(true)
    onComplete()
    toast.success('案例分析已保存为前端 Demo 状态，不包含自动评分')
  }

  return (
    <section className='space-y-4'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200'>
              <MessageSquareText className='size-5' />
            </span>
            <div>
              <h2 className='text-lg font-semibold text-white'>案例理解</h2>
              <p className='text-xs text-slate-400'>
                通过真实情境理解增强方法的适用场景
              </p>
            </div>
          </div>
        </div>
        <span className='rounded-full border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-[10px] text-amber-200'>
          前端原型案例 · 不自动评分
        </span>
      </header>

      <div className='grid gap-4 xl:grid-cols-[0.8fr_1.35fr]'>
        <div className='space-y-3'>
          <div>
            <p className='text-[11px] font-medium text-sky-300'>案例 1</p>
            <h3 className='mt-1 text-base font-semibold text-white'>
              {caseDemo.title}
            </h3>
            <p className='mt-2 text-xs leading-6 text-slate-300'>
              {caseDemo.background}
            </p>
          </div>
          <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-3'>
            <div className='flex items-center gap-2 text-xs font-semibold text-cyan-100'>
              <Target className='size-4 text-cyan-300' />
              学习目标
            </div>
            <p className='mt-1 text-xs leading-5 text-slate-300'>
              {caseDemo.objective}
            </p>
          </div>
          <div className='grid grid-cols-3 gap-2 text-[11px] text-slate-400'>
            <div className='rounded-lg bg-slate-900/55 p-2'>
              <Database className='mb-1 size-3.5 text-sky-300' />
              {caseDemo.source}
            </div>
            <div className='rounded-lg bg-slate-900/55 p-2'>
              <MapPin className='mb-1 size-3.5 text-sky-300' />
              {caseDemo.region}
            </div>
            <div className='rounded-lg bg-slate-900/55 p-2'>
              <Clock3 className='mb-1 size-3.5 text-sky-300' />
              {caseDemo.date}
            </div>
          </div>
        </div>

        <div className='grid gap-2 sm:grid-cols-2'>
          <DemoSatelliteImage variant='before' className='min-h-64' />
          <DemoSatelliteImage variant='after' className='min-h-64' />
        </div>
      </div>

      <div className='grid gap-3 xl:grid-cols-[0.9fr_1.2fr_0.65fr]'>
        <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-3'>
          <h3 className='text-sm font-semibold text-white'>思考与分析问题</h3>
          <ol className='mt-3 space-y-3'>
            {caseDemo.questions.map((question, index) => (
              <li
                key={question}
                className='flex gap-2 text-xs leading-5 text-slate-300'
              >
                <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] text-sky-200'>
                  {index + 1}
                </span>
                {question}
              </li>
            ))}
          </ol>
        </div>

        <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-3'>
          <label
            htmlFor='case-analysis'
            className='text-sm font-semibold text-white'
          >
            输入你的分析
          </label>
          <Textarea
            id='case-analysis'
            value={analysis}
            onChange={(event) => setAnalysis(event.target.value.slice(0, 1000))}
            placeholder='描述你的观察结果和分析，例如河流边界、植被纹理、增强方式与潜在副作用…'
            className='mt-2 min-h-36 resize-none border-slate-700 bg-slate-950/65 text-sm text-white'
          />
          <div className='mt-1 text-right text-[10px] text-slate-500'>
            {analysis.length} / 1000
          </div>
          {hintIndex >= 0 && (
            <div className='mt-2 rounded-lg border border-amber-400/20 bg-amber-500/8 p-2 text-xs leading-5 text-amber-100'>
              提示 {hintIndex + 1}：{caseDemo.hints[hintIndex]}
            </div>
          )}
          {submitted && (
            <div className='mt-2 flex items-center gap-2 text-xs text-emerald-300'>
              <CheckCircle2 className='size-4' />
              分析已保存为本次页面 Demo 状态
            </div>
          )}
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={handleHint}
              className='border-slate-700 bg-slate-900 text-slate-200'
            >
              <Lightbulb className='mr-2 size-3.5' />
              给我一点提示
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() =>
                onAskAI('请给我这个案例的观察思路，不要直接替我完成分析。')
              }
              className='border-sky-400/25 bg-sky-500/8 text-sky-100'
            >
              问 AI 伴学助手
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={handleSubmit}
              className='bg-violet-500 text-white hover:bg-violet-400'
            >
              <Send className='mr-2 size-3.5' />
              提交分析
            </Button>
          </div>
        </div>

        <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-3'>
          <h3 className='text-sm font-semibold text-white'>观察要点</h3>
          <div className='mt-3 space-y-2'>
            {caseDemo.observationPoints.map((item) => (
              <div
                key={item}
                className='flex items-center gap-2 rounded-lg bg-slate-900/55 p-2 text-xs text-slate-300'
              >
                <Target className='size-3.5 text-cyan-300' />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
