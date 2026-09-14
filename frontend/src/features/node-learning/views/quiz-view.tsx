import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { quizQuestions, quizSummaryDemo } from '../demo-data'
import type { LearningStage, QuizMode } from '../types'

type QuizViewProps = {
  mode: QuizMode
  hintText?: string
  onModeChange: (mode: QuizMode) => void
  onQuestionChange: (index: number) => void
  onRequestHint: () => void
  onComplete: () => void
  onStageChange: (stage: LearningStage) => void
  onAskAI: (question: string) => void
}

export function QuizView({
  mode,
  hintText,
  onModeChange,
  onQuestionChange,
  onRequestHint,
  onComplete,
  onStageChange,
  onAskAI,
}: QuizViewProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const currentQuestion = quizQuestions[questionIndex]

  const moveToQuestion = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, quizQuestions.length - 1))
    setQuestionIndex(nextIndex)
    onQuestionChange(nextIndex)
  }

  const submitQuiz = () => {
    const answeredCount = Object.keys(answers).length
    if (answeredCount < quizQuestions.length) {
      toast.info(`还有 ${quizQuestions.length - answeredCount} 道题未作答`)
      return
    }
    onComplete()
    onModeChange('summary')
    toast.success('检测已提交，以下为前端原型示例结果')
  }

  const resetQuiz = () => {
    setAnswers({})
    moveToQuestion(0)
    onModeChange('answering')
  }

  if (mode === 'summary') {
    return (
      <section className='space-y-4'>
        <Header title='检测完成' subtitle='结果总览与能力诊断' />
        <div className='rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-100'>
          当前分数与诊断为前端原型 Demo，不代表真实评分算法结果。
        </div>
        <div className='grid gap-4 lg:grid-cols-[0.75fr_1.25fr]'>
          <div className='flex items-center gap-5 rounded-2xl border border-slate-800 bg-slate-950/35 p-5'>
            <div
              className='relative flex size-32 shrink-0 items-center justify-center rounded-full p-2'
              style={{
                background: `conic-gradient(#22d3ee 0 ${quizSummaryDemo.accuracy}%, rgba(30,41,59,.7) ${quizSummaryDemo.accuracy}%)`,
              }}
            >
              <div className='flex size-full flex-col items-center justify-center rounded-full bg-slate-950'>
                <span className='text-3xl font-bold text-white'>
                  {quizSummaryDemo.accuracy}%
                </span>
                <span className='text-[11px] text-slate-400'>正确率</span>
              </div>
            </div>
            <div>
              <p className='text-xs text-slate-400'>本次得分</p>
              <p className='mt-1 text-3xl font-semibold text-white'>
                {quizSummaryDemo.score}
              </p>
              <p className='mt-2 text-xs leading-5 text-slate-300'>
                答对 {quizSummaryDemo.correct} 题，共 {quizSummaryDemo.total}{' '}
                题。方法选择仍有提升空间。
              </p>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-800 bg-slate-950/35 p-4'>
            <h3 className='text-sm font-semibold text-white'>各项能力表现</h3>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              {quizSummaryDemo.dimensions.map((dimension) => (
                <div key={dimension.label}>
                  <div className='flex justify-between text-xs text-slate-300'>
                    <span>{dimension.label}</span>
                    <span>{dimension.value}%</span>
                  </div>
                  <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800'>
                    <div
                      className='h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300'
                      style={{ width: `${dimension.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='grid gap-3 lg:grid-cols-[1fr_1.1fr]'>
          <div className='rounded-xl border border-rose-400/20 bg-rose-500/8 p-4'>
            <h3 className='text-sm font-semibold text-rose-100'>主要薄弱点</h3>
            <div className='mt-3 space-y-2'>
              {quizSummaryDemo.weaknesses.map((weakness, index) => (
                <div
                  key={weakness}
                  className='flex items-center gap-2 text-xs text-slate-300'
                >
                  <span className='flex size-5 items-center justify-center rounded-full bg-rose-500/15 text-[10px] text-rose-200'>
                    {index + 1}
                  </span>
                  {weakness}
                </div>
              ))}
            </div>
          </div>
          <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-4'>
            <h3 className='text-sm font-semibold text-cyan-100'>建议下一步</h3>
            <p className='mt-2 text-xs leading-6 text-slate-300'>
              进入实践任务，在一幅示例影像中应用增强方法，并说明参数选择依据。
            </p>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onModeChange('review')}
            className='border-slate-700 bg-slate-900 text-slate-200'
          >
            查看错题解析
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => onStageChange('material')}
            className='border-slate-700 bg-slate-900 text-slate-200'
          >
            复习薄弱点
          </Button>
          <Button
            type='button'
            onClick={() => onStageChange('practice')}
            className='bg-violet-500 text-white hover:bg-violet-400'
          >
            进入实践任务
            <ChevronRight className='ml-2 size-4' />
          </Button>
        </div>
      </section>
    )
  }

  if (mode === 'review') {
    const reviewedQuestion = quizQuestions[1] ?? quizQuestions[0]
    if (!reviewedQuestion) {
      return (
        <section className='space-y-4'>
          <Header title='错题解析' subtitle='当前没有可供复习的错题' />
          <Button type='button' onClick={() => onModeChange('summary')}>
            返回结果总览
          </Button>
        </section>
      )
    }
    // The fixed summary is a clearly-labelled frontend Demo, so its review keeps
    // the matching preset wrong answer instead of borrowing a live attempt.
    const selectedAnswer = 'A'
    const selectedLabel = reviewedQuestion.options.find(
      (option) => option.id === selectedAnswer
    )?.label
    const correctLabel = reviewedQuestion.options.find(
      (option) => option.id === reviewedQuestion.correctAnswer
    )?.label

    return (
      <section className='space-y-4'>
        <Header title='错题解析' subtitle='逐题理解错误来源，巩固方法选择' />
        <div className='rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-100'>
          以下错题及评分归属前端原型 Demo；AI 讲解仍使用当前小遇伴学能力。
        </div>
        <div className='grid gap-4 xl:grid-cols-[1.15fr_0.85fr]'>
          <div className='rounded-2xl border border-slate-800 bg-slate-950/35 p-5'>
            <p className='text-xs font-medium text-sky-300'>
              第 {quizQuestions.indexOf(reviewedQuestion) + 1} /{' '}
              {quizQuestions.length} 题 · {reviewedQuestion.category}
            </p>
            <h3 className='mt-2 text-base leading-7 font-semibold text-white'>
              {reviewedQuestion.prompt}
            </h3>
            <div className='mt-4 grid gap-2 sm:grid-cols-2'>
              <div className='rounded-xl border border-rose-400/25 bg-rose-500/8 p-3'>
                <p className='flex items-center gap-2 text-xs text-rose-200'>
                  <X className='size-4' />
                  你的答案
                </p>
                <p className='mt-1 text-sm text-white'>
                  {selectedAnswer}. {selectedLabel}
                </p>
              </div>
              <div className='rounded-xl border border-emerald-400/25 bg-emerald-500/8 p-3'>
                <p className='flex items-center gap-2 text-xs text-emerald-200'>
                  <Check className='size-4' />
                  正确答案
                </p>
                <p className='mt-1 text-sm text-white'>
                  {reviewedQuestion.correctAnswer}. {correctLabel}
                </p>
              </div>
            </div>
            <div className='mt-4'>
              <p className='text-xs font-semibold text-white'>详细解析</p>
              <p className='mt-2 text-sm leading-7 text-slate-300'>
                {reviewedQuestion.explanation}
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <div className='rounded-xl border border-sky-400/20 bg-sky-500/8 p-4'>
              <h3 className='flex items-center gap-2 text-sm font-semibold text-sky-100'>
                <Target className='size-4' />
                本题考察
              </h3>
              <div className='mt-3 flex flex-wrap gap-2'>
                {reviewedQuestion.focus.map((focus) => (
                  <span
                    key={focus}
                    className='rounded-full border border-sky-400/20 bg-slate-950/50 px-2.5 py-1 text-xs text-sky-100'
                  >
                    {focus}
                  </span>
                ))}
              </div>
            </div>
            <div className='rounded-xl border border-slate-800 bg-slate-950/35 p-4'>
              <h3 className='text-sm font-semibold text-white'>解析动作</h3>
              <div className='mt-3 space-y-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onStageChange('material')}
                  className='w-full justify-start border-slate-700 bg-slate-900 text-slate-200'
                >
                  <BookOpen className='mr-2 size-4' />
                  回看相关学习材料
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    onAskAI(
                      '请换一种方式解释：为什么这道题应该选择直方图均衡化，而不是几何校正？'
                    )
                  }
                  className='w-full justify-start border-violet-400/25 bg-violet-500/8 text-violet-100'
                >
                  <Sparkles className='mr-2 size-4' />让 AI 换一种方式解释
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled
                  className='w-full justify-start border-slate-700 bg-slate-900 text-slate-500'
                >
                  <ArrowRight className='mr-2 size-4' />
                  下一道错题（已完成）
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onModeChange('summary')}
            className='border-slate-700 bg-slate-900 text-slate-200'
          >
            <ArrowLeft className='mr-2 size-4' />
            返回结果总览
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={resetQuiz}
            className='border-slate-700 bg-slate-900 text-slate-200'
          >
            <RotateCcw className='mr-2 size-4' />
            重新检测
          </Button>
        </div>
      </section>
    )
  }

  if (!currentQuestion) return null

  return (
    <section className='space-y-4'>
      <Header
        title='知识检测'
        subtitle='完成整组题目后统一提交，答题过程不展示正确答案'
      />
      <div className='flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-2 text-xs text-slate-400'>
        <span>
          本次检测{' '}
          <strong className='text-white'>
            {questionIndex + 1} / {quizQuestions.length}
          </strong>
        </span>
        <span className='h-3 w-px bg-slate-700' />
        <span className='flex items-center gap-1'>
          <Clock3 className='size-3.5 text-sky-300' />
          预计 3 分钟
        </span>
        <span className='ml-auto rounded-full bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200'>
          前端 Demo 题组
        </span>
      </div>

      <div className='grid gap-4 xl:grid-cols-[1fr_240px]'>
        <div className='rounded-2xl border border-slate-800 bg-slate-950/35 p-4 sm:p-5'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-xs font-medium text-sky-300'>
              第 {questionIndex + 1} / {quizQuestions.length} 题 ·{' '}
              {currentQuestion.category}
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  aria-label='查看本题考察范围'
                  className='size-7 text-slate-500 hover:text-sky-200'
                >
                  <CircleHelp className='size-4' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align='end'
                className='w-64 border-slate-700 bg-slate-950 text-slate-200'
              >
                <p className='text-xs font-semibold'>本题考察范围</p>
                <p className='mt-2 text-xs leading-5 text-slate-400'>
                  仅显示范围标签，不提供答案线索：
                  {currentQuestion.focus.join('、')}
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <h3 className='mt-3 text-base leading-8 font-semibold text-white'>
            {currentQuestion.prompt}
          </h3>
          <div
            role='radiogroup'
            aria-label={`第 ${questionIndex + 1} 题选项`}
            className='mt-5 space-y-2'
          >
            {currentQuestion.options.map((option) => {
              const selected = answers[currentQuestion.id] === option.id
              return (
                <button
                  key={option.id}
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  onClick={() =>
                    setAnswers((previous) => ({
                      ...previous,
                      [currentQuestion.id]: option.id,
                    }))
                  }
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition',
                    selected
                      ? 'border-sky-400/60 bg-sky-500/15 text-white shadow-[0_0_20px_rgba(14,165,233,.08)]'
                      : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-900/75'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border text-xs',
                      selected
                        ? 'border-sky-300 bg-sky-500/25 text-sky-100'
                        : 'border-slate-600 bg-slate-800'
                    )}
                  >
                    {option.id}
                  </span>
                  {option.label}
                </button>
              )
            })}
          </div>
          {hintText && (
            <div className='mt-4 rounded-xl border border-amber-400/20 bg-amber-500/8 p-3 text-xs leading-5 text-amber-100'>
              <span className='font-semibold'>Hint：</span>
              {hintText}
            </div>
          )}
          <div className='mt-5 flex flex-wrap justify-between gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={questionIndex === 0}
              onClick={() => moveToQuestion(questionIndex - 1)}
              className='border-slate-700 bg-slate-900 text-slate-200'
            >
              <ArrowLeft className='mr-2 size-4' />
              上一题
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={onRequestHint}
              className='border-amber-400/25 bg-amber-500/8 text-amber-100'
            >
              <Lightbulb className='mr-2 size-4' />
              我不确定，给我一点提示
            </Button>
            {questionIndex < quizQuestions.length - 1 ? (
              <Button
                type='button'
                onClick={() => moveToQuestion(questionIndex + 1)}
                className='bg-sky-500 text-white hover:bg-sky-400'
              >
                下一题
                <ArrowRight className='ml-2 size-4' />
              </Button>
            ) : (
              <Button
                type='button'
                onClick={submitQuiz}
                className='bg-violet-500 text-white hover:bg-violet-400'
              >
                提交本次检测
                <CheckCircle2 className='ml-2 size-4' />
              </Button>
            )}
          </div>
        </div>

        <div className='rounded-2xl border border-slate-800 bg-slate-950/35 p-4'>
          <h3 className='text-sm font-semibold text-white'>题目进度</h3>
          <div className='mt-3 grid grid-cols-5 gap-2 xl:grid-cols-2'>
            {quizQuestions.map((question, index) => (
              <button
                key={question.id}
                type='button'
                aria-label={`第 ${index + 1} 题${answers[question.id] ? '，已作答' : ''}`}
                onClick={() => moveToQuestion(index)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg border text-xs',
                  index === questionIndex &&
                    'border-sky-400 bg-sky-500/15 text-white',
                  index !== questionIndex &&
                    answers[question.id] &&
                    'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
                  index !== questionIndex &&
                    !answers[question.id] &&
                    'border-slate-700 bg-slate-900 text-slate-400'
                )}
              >
                {answers[question.id] ? (
                  <Check className='size-4' />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
          <p className='mt-4 text-xs leading-5 text-slate-400'>
            已作答 {Object.keys(answers).length} / {quizQuestions.length}
            。答案会在题目间切换时保留。
          </p>
        </div>
      </div>
    </section>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className='flex items-center gap-3'>
      <span className='flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200'>
        <CheckCircle2 className='size-5' />
      </span>
      <div>
        <h2 className='text-lg font-semibold text-white'>{title}</h2>
        <p className='text-xs text-slate-400'>{subtitle}</p>
      </div>
    </header>
  )
}
