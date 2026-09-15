import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type DemoSatelliteImageProps = {
  variant: 'before' | 'after'
  label?: string
  className?: string
  onExpand?: () => void
}

export function DemoSatelliteImage({
  variant,
  label,
  className,
  onExpand,
}: DemoSatelliteImageProps) {
  const enhanced = variant === 'after'

  return (
    <div
      role='img'
      className={cn(
        'relative isolate min-h-44 overflow-hidden rounded-xl border border-slate-700 bg-slate-950',
        className
      )}
      aria-label={label ?? (enhanced ? '增强后影像示意' : '增强前影像示意')}
    >
      <div
        className={cn(
          'absolute inset-0 transition duration-500',
          enhanced
            ? 'bg-[radial-gradient(circle_at_18%_22%,rgba(74,222,128,.55),transparent_20%),radial-gradient(circle_at_78%_28%,rgba(34,197,94,.45),transparent_25%),radial-gradient(circle_at_65%_78%,rgba(148,163,184,.48),transparent_24%),linear-gradient(135deg,#213826,#557749_44%,#6b7d64_62%,#334c39)]'
            : 'bg-[radial-gradient(circle_at_18%_22%,rgba(100,116,139,.42),transparent_20%),radial-gradient(circle_at_78%_28%,rgba(71,85,105,.4),transparent_25%),radial-gradient(circle_at_65%_78%,rgba(100,116,139,.35),transparent_24%),linear-gradient(135deg,#303a34,#4b554c_44%,#505b53_62%,#35413b)]'
        )}
      />
      <div className='absolute inset-0 [background-image:linear-gradient(28deg,transparent_43%,rgba(226,232,240,.28)_44%,transparent_46%),linear-gradient(118deg,transparent_58%,rgba(15,23,42,.42)_59%,transparent_61%)] [background-size:48px_42px,72px_66px] opacity-45' />
      <div className='absolute top-[42%] -left-[8%] h-[34%] w-[116%] -rotate-6 rounded-[48%] bg-sky-900/90 shadow-[0_0_0_5px_rgba(186,230,253,.2)]' />
      <div className='absolute top-[47%] -left-[6%] h-[22%] w-[114%] -rotate-6 rounded-[50%] bg-sky-700/80' />
      <div className='absolute top-[18%] left-[13%] h-9 w-16 rotate-12 border border-slate-200/25 bg-slate-100/15' />
      <div className='absolute top-[22%] right-[12%] h-14 w-20 -rotate-6 border border-slate-200/25 bg-slate-100/15' />
      <div className='absolute bottom-[10%] left-[52%] h-10 w-24 rotate-6 border border-slate-200/25 bg-slate-100/15' />
      {!enhanced && (
        <div className='absolute inset-0 bg-slate-500/20 backdrop-grayscale-[35%]' />
      )}

      <span className='absolute top-3 left-3 rounded-md border border-white/15 bg-slate-950/75 px-2 py-1 text-[11px] font-medium text-white backdrop-blur'>
        {label ?? (enhanced ? '增强后' : '增强前')}
      </span>
      {onExpand && (
        <button
          type='button'
          onClick={onExpand}
          className='absolute top-3 right-3 inline-flex items-center gap-1 rounded-md border border-white/15 bg-slate-950/75 px-2 py-1 text-[11px] text-slate-200 backdrop-blur hover:bg-slate-900'
        >
          <Maximize2 className='size-3' />
          放大查看
        </button>
      )}
      <span className='absolute right-3 bottom-3 rounded bg-slate-950/70 px-2 py-1 text-[10px] text-slate-300'>
        Sentinel-2 · UI Demo
      </span>
    </div>
  )
}
