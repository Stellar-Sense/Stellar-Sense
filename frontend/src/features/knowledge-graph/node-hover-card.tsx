import { cn } from '@/lib/utils'
import { statusLabel, type KnowledgeNode, type NodeDetail } from './graph-data'

type NodeHoverCardProps = {
  node: KnowledgeNode
  detail: NodeDetail
  className?: string
}

/** 2D 与 3D 视图共用的节点悬停卡片 */
export function NodeHoverCard({ node, detail, className }: NodeHoverCardProps) {
  return (
    <div
      className={cn(
        'pointer-events-none min-w-[180px] rounded-2xl border border-sky-400/20 bg-slate-950/90 px-3 py-2.5 text-left shadow-[0_18px_42px_rgba(15,23,42,0.7)] backdrop-blur-sm',
        className
      )}
    >
      <div className='text-[10px] font-medium tracking-[0.18em] text-sky-200 uppercase'>
        {node.name}
      </div>
      <div className='mt-1 text-[10px] text-slate-300'>
        {node.domain} · {statusLabel[node.status]}
      </div>
      <div className='mt-2 flex items-center justify-between text-[10px] text-slate-300'>
        <span>掌握度</span>
        <span>{detail.progress}%</span>
      </div>
      <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800'>
        <div
          className='h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-cyan-400'
          style={{ width: `${detail.progress}%` }}
        />
      </div>
      <div className='mt-2 text-[10px] text-slate-300'>
        前置知识：
        {node.prerequisites.length > 0 ? node.prerequisites.join('、') : '无'}
      </div>
    </div>
  )
}
