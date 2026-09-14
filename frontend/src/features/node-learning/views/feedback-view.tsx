import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  RotateCcw,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { feedbackDemo } from '../demo-data'
import type { LearningStage } from '../types'

type FeedbackViewProps = {
  nodeTitle: string
  onStageChange: (stage: LearningStage) => void
  onCompleteNode: () => void
  completing: boolean
}

export function FeedbackView({
  nodeTitle,
  onStageChange,
  onCompleteNode,
  completing,
}: FeedbackViewProps) {
  return (
    <section className='space-y-4'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <span className='flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200'>
            <ClipboardCheck className='size-5' />
          </span>
          <div>
            <h2 className='text-lg font-semibold text-white'>学习结果反馈</h2>
            <p className='text-xs text-slate-400'>
              汇总本节点学习表现并给出下一步建议
            </p>
          </div>
        </div>
        <span className='rounded-full border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-[10px] text-amber-200'>
          所有分数均为前端 Demo
        </span>
      </header>

      <div className='grid gap-4 lg:grid-cols-[0.78fr_1.22fr]'>
        <div className='flex items-center gap-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/6 p-5'>
          <div
            className='relative flex size-32 shrink-0 items-center justify-center rounded-full p-2 shadow-[0_0_35px_rgba(34,211,238,.12)]'
            style={{
              background: `conic-gradient(#22d3ee 0 ${feedbackDemo.mastery}%, rgba(30,41,59,.75) ${feedbackDemo.mastery}%)`,
            }}
          >
            <div className='flex size-full flex-col items-center justify-center rounded-full bg-slate-950'>
              <span className='text-3xl font-bold text-white'>
                {feedbackDemo.mastery}%
              </span>
              <span className='text-[11px] text-slate-400'>综合掌握度</span>
            </div>
          </div>
          <div>
            <p className='text-lg font-semibold text-white'>本轮学习已完成</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              <span className='rounded-full bg-emerald-500/12 px-2 py-1 text-xs text-emerald-200'>
                <Check className='mr-1 inline size-3.5' />
                已完成本轮学习
              </span>
              <span className='rounded-full bg-violet-500/12 px-2 py-1 text-xs text-violet-200'>
                {feedbackDemo.status}
              </span>
            </div>
            <p className='mt-3 text-xs leading-5 text-slate-300'>
              你已完成{nodeTitle}
              节点的全部学习活动，建议针对薄弱点巩固后进入下一节点。
            </p>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          {feedbackDemo.activities.map((activity) => (
            <div
              key={activity.label}
              className='flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950/35 p-3 text-center'
            >
              <BookOpen className='size-5 text-sky-300' />
              <p className='mt-2 text-xs text-slate-400'>{activity.label}</p>
              <p className='mt-1 text-xl font-semibold text-white'>
                {activity.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold text-white'>能力维度表现</h3>
          <span className='text-[10px] text-slate-500'>前端 Demo 数据</span>
        </div>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
          {feedbackDemo.dimensions.map((dimension) => (
            <div
              key={dimension.label}
              className='rounded-lg bg-slate-900/55 p-3'
            >
              <div className='flex justify-between text-xs text-slate-300'>
                <span>{dimension.label}</span>
                <span>{dimension.value}%</span>
              </div>
              <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800'>
                <div
                  className='h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300'
                  style={{ width: `${dimension.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-4'>
        <h3 className='text-sm font-semibold text-white'>学习证据摘要</h3>
        <div className='mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
          {feedbackDemo.evidence.map((evidence) => (
            <div
              key={evidence}
              className='flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/45 p-2.5 text-xs text-slate-300'
            >
              <Check className='size-4 shrink-0 text-emerald-300' />
              {evidence}
            </div>
          ))}
        </div>
      </div>

      <div className='grid gap-3 lg:grid-cols-2'>
        <div className='rounded-xl border border-rose-400/20 bg-rose-500/8 p-4'>
          <h3 className='flex items-center gap-2 text-sm font-semibold text-rose-100'>
            <TriangleAlert className='size-4' />
            薄弱点诊断
          </h3>
          <div className='mt-3 space-y-3'>
            {feedbackDemo.weaknesses.map((weakness, index) => (
              <div
                key={weakness}
                className='flex gap-2 text-xs leading-5 text-slate-300'
              >
                <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-[10px] text-rose-200'>
                  {index + 1}
                </span>
                {weakness}
              </div>
            ))}
          </div>
        </div>
        <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-4'>
          <h3 className='flex items-center gap-2 text-sm font-semibold text-cyan-100'>
            <Target className='size-4' />
            下一步建议
          </h3>
          <div className='mt-3 space-y-2'>
            {feedbackDemo.suggestions.map((suggestion) => (
              <div
                key={suggestion}
                className='flex items-center gap-2 text-xs text-slate-300'
              >
                <Check className='size-4 shrink-0 text-emerald-300' />
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => onStageChange('quiz')}
          className='border-slate-700 bg-slate-900 text-slate-200'
        >
          <ClipboardCheck className='mr-2 size-4' />
          返回知识检测
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => onStageChange('material')}
          className='border-slate-700 bg-slate-900 text-slate-200'
        >
          <Sparkles className='mr-2 size-4' />
          复习薄弱点
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => onStageChange('practice')}
          className='border-slate-700 bg-slate-900 text-slate-200'
        >
          <RotateCcw className='mr-2 size-4' />
          再练一次
        </Button>
        <Button
          type='button'
          disabled={completing}
          onClick={onCompleteNode}
          className='bg-violet-500 text-white hover:bg-violet-400'
        >
          {completing ? '正在完成节点…' : '完成本节点并进入下一节点'}
          <ArrowRight className='ml-2 size-4' />
        </Button>
      </div>
    </section>
  )
}
