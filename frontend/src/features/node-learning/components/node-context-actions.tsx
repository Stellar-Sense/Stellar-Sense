import {
  BookOpenText,
  ChevronDown,
  CircleHelp,
  GitBranch,
  Lightbulb,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { LearningNodeDetail } from '../api'

type NodeContextActionsProps = {
  node: LearningNodeDetail
}

export function NodeContextActions({ node }: NodeContextActionsProps) {
  const actions = [
    {
      label: '节点导入',
      icon: BookOpenText,
      content: node.summary,
    },
    {
      label: '学习目标',
      icon: Target,
      content: node.objectives.join('；'),
    },
    {
      label: '前置 / 后续关系',
      icon: GitBranch,
      content:
        '前置建议：几何校正；后续建议：特征提取。关系信息当前用于前端原型展示。',
    },
    {
      label: '学习提示',
      icon: Lightbulb,
      content:
        '先观察增强前后的灰度与边界变化，再结合应用场景判断方法是否合适。',
    },
  ]

  return (
    <div className='grid grid-cols-2 gap-1.5 sm:grid-cols-4'>
      {actions.map(({ label, icon: Icon, content }) => (
        <Popover key={label}>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='h-9 justify-start rounded-xl border-slate-700/80 bg-slate-900/55 px-3 text-xs text-slate-200 hover:border-sky-500/35 hover:bg-slate-900'
            >
              <Icon className='mr-2 size-3.5 text-sky-300' />
              <span className='truncate'>{label}</span>
              <ChevronDown className='ml-auto size-3.5 text-slate-500' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align='start'
            className='w-80 border-slate-700 bg-slate-950/95 text-slate-200 shadow-2xl backdrop-blur'
          >
            <div className='flex items-center gap-2 text-sm font-semibold text-white'>
              <CircleHelp className='size-4 text-sky-300' />
              {label}
            </div>
            <p className='mt-2 text-xs leading-6 text-slate-300'>{content}</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}
