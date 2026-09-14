import {
  BookOpen,
  Check,
  ClipboardCheck,
  FlaskConical,
  Images,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { stageLabels } from '../demo-data'
import { LEARNING_STAGES, type LearningStage } from '../types'

const icons = {
  material: BookOpen,
  case: Images,
  quiz: ClipboardCheck,
  practice: FlaskConical,
  feedback: Check,
}

type LearningStageNavProps = {
  activeStage: LearningStage
  completedStages: ReadonlySet<LearningStage>
  lockedStages?: ReadonlySet<LearningStage>
  disabled?: boolean
  onChange: (stage: LearningStage) => void
}

export function LearningStageNav({
  activeStage,
  completedStages,
  lockedStages = new Set(),
  disabled,
  onChange,
}: LearningStageNavProps) {
  return (
    <nav
      aria-label='节点学习流程'
      className='grid grid-cols-2 gap-1.5 rounded-2xl border border-sky-400/15 bg-slate-950/65 p-1.5 sm:grid-cols-5'
    >
      {LEARNING_STAGES.map((stage, index) => {
        const Icon = icons[stage]
        const active = activeStage === stage
        const completed = completedStages.has(stage)
        const locked = lockedStages.has(stage)

        return (
          <button
            key={stage}
            type='button'
            disabled={disabled || locked}
            onClick={() => onChange(stage)}
            className={cn(
              'group relative flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
              active &&
                'border-sky-400/55 bg-sky-500/15 text-white shadow-[0_0_24px_rgba(14,165,233,.12)]',
              !active &&
                completed &&
                'border-emerald-400/20 bg-emerald-500/8 text-emerald-100 hover:bg-emerald-500/12',
              !active &&
                !completed &&
                !locked &&
                'border-transparent bg-slate-900/45 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70',
              locked &&
                'cursor-not-allowed border-transparent bg-slate-900/25 text-slate-600'
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                active && 'border-sky-300/60 bg-sky-500/25 text-sky-100',
                !active &&
                  completed &&
                  'border-emerald-400/35 bg-emerald-500/15',
                !active && !completed && 'border-slate-700 bg-slate-800/70'
              )}
            >
              {locked ? (
                <Lock className='size-3.5' />
              ) : completed ? (
                <Check className='size-3.5' />
              ) : (
                index + 1
              )}
            </span>
            <span className='min-w-0'>
              <span className='block text-[10px] text-slate-500'>
                步骤 {index + 1}
              </span>
              <span className='block truncate text-xs font-medium'>
                {stageLabels[stage]}
              </span>
            </span>
            <Icon className='ml-auto hidden size-3.5 shrink-0 opacity-50 2xl:block' />
          </button>
        )
      })}
    </nav>
  )
}
