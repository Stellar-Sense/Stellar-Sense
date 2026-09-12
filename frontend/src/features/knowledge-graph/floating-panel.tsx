import { useState, type ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FloatingPanelProps = {
  title: string
  icon?: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  onClose?: () => void
  className?: string
  children: ReactNode
}

export function FloatingPanel({
  title,
  icon,
  collapsible = false,
  defaultOpen = true,
  onClose,
  className,
  children,
}: FloatingPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const expanded = !collapsible || open

  return (
    <div
      className={cn(
        'pointer-events-auto absolute z-30 flex flex-col rounded-2xl border border-white/10 bg-slate-950/80 shadow-[0_12px_30px_rgba(2,6,23,0.55)] backdrop-blur-md',
        className
      )}
    >
      <div className='flex shrink-0 items-center justify-between gap-2 px-3 py-2'>
        {collapsible ? (
          <button
            type='button'
            aria-expanded={expanded}
            onClick={() => setOpen((value) => !value)}
            className='flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-sky-200'
          >
            {icon}
            <span className='truncate'>{title}</span>
            <ChevronDown
              className={cn(
                'ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300',
                expanded && 'rotate-180'
              )}
            />
          </button>
        ) : (
          <div className='flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-sky-200'>
            {icon}
            <span className='truncate'>{title}</span>
          </div>
        )}

        {onClose && (
          <button
            type='button'
            aria-label={`关闭${title}面板`}
            onClick={onClose}
            className='flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900/70 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100'
          >
            <X className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

      {expanded && (
        <div className='min-h-0 flex-1 overflow-y-auto px-3 pb-3'>
          {children}
        </div>
      )}
    </div>
  )
}
