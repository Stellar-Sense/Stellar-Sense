import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  BrainCircuit,
  CodeXml,
  Flag,
  Layers,
  Orbit,
  Satellite,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import type { PathEntry } from './adaptive-api'
import './path-constellation.css'
import { layoutPath } from './path-layout'

export function PathPlanet({
  entry,
  current = false,
}: {
  entry: PathEntry
  current?: boolean
}) {
  const Icon =
    entry.kind === 'tool'
      ? Wrench
      : /Python|数据处理/.test(entry.domain)
        ? CodeXml
        : /Transformer|大模型/.test(entry.domain)
          ? Sparkles
          : /深度学习|机器学习/.test(entry.domain)
            ? BrainCircuit
            : /影像/.test(entry.domain)
              ? Layers
              : /遥感/.test(entry.domain)
                ? Satellite
                : Orbit
  return (
    <span
      aria-hidden='true'
      className={`path-planet ${current ? 'path-planet-current' : entry.status === 'ready' ? 'path-planet-ready' : 'path-planet-upcoming'}`}
    >
      <span className='path-planet-surface' />
      <Icon className='relative z-10 size-6' />
      {current && <span className='path-planet-orbit' />}
    </span>
  )
}

export function PathConstellation({
  entries,
  nextNodeId,
  onSelect,
  selectedId,
  summary,
}: {
  entries: PathEntry[]
  nextNodeId: string | null
  onSelect: (id: string) => void
  selectedId?: string | null
  summary?: ReactNode
}) {
  const en = useLocale((state) => state.locale) === 'en'
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width))
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const {
    positions,
    edges,
    layers,
    width: graphWidth,
    height,
  } = layoutPath(entries, width)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const activeId = hoveredId ?? selectedId
  const focusNext = () => {
    host.current
      ?.querySelector<HTMLButtonElement>('[data-next="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  return (
    <div className='path-universe rounded-2xl border border-sky-300/15'>
      <div className='relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs'>
        {summary}
        {nextNodeId && (
          <button
            type='button'
            onClick={focusNext}
            className='ml-auto shrink-0 rounded-full border border-sky-300/25 px-3 py-1.5 text-sky-200 hover:bg-sky-300/10'
          >
            {en ? 'Locate recommendation' : '定位推荐节点'}
          </button>
        )}
      </div>
      <div
        ref={host}
        className='relative max-h-[640px] overflow-auto overscroll-contain'
        role='region'
        aria-label={en ? 'Learning route map' : '学习路线图'}
      >
        <div className='relative' style={{ height, width: graphWidth }}>
          {layers.map((_, rank) => (
            <div
              key={rank}
              className='pointer-events-none absolute right-5 left-5 border-t border-white/5 pt-2 text-[10px] tracking-wider text-slate-500'
              style={{ top: rank * 270 + 12 }}
            >
              {rank > 0 &&
                (en ? `DEPENDENCY LAYER ${rank}` : `后续知识 · 第 ${rank} 层`)}
            </div>
          ))}
          <svg
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 h-full w-full'
            viewBox={`0 0 ${graphWidth} ${height}`}
          >
            <defs>
              <marker
                id={`${id}-arrow`}
                markerWidth='8'
                markerHeight='8'
                refX='6'
                refY='4'
                orient='auto'
                markerUnits='userSpaceOnUse'
              >
                <path
                  d='M1 1 L6 4 L1 7'
                  fill='none'
                  stroke='#7dd3fc'
                  strokeWidth='1.5'
                />
              </marker>
            </defs>
            {edges.map(({ source, target }) => {
              const startY = source.y + 145
              const endY = target.y - 48
              const middleY = (startY + endY) / 2
              const d = `M ${source.x} ${startY} C ${source.x} ${middleY}, ${target.x} ${middleY}, ${target.x} ${endY}`
              const related =
                !activeId ||
                source.entry.nodeId === activeId ||
                target.entry.nodeId === activeId
              return (
                <g
                  key={`${source.entry.nodeId}-${target.entry.nodeId}`}
                  data-route-edge={`${source.entry.nodeId}:${target.entry.nodeId}`}
                  opacity={related ? 1 : 0.15}
                >
                  <path
                    d={d}
                    stroke='#38bdf8'
                    strokeWidth='7'
                    opacity='.08'
                    fill='none'
                  />
                  <circle cx={source.x} cy={startY} r='2.5' fill='#7dd3fc' />
                  <path
                    d={d}
                    stroke={activeId && related ? '#bae6fd' : '#6596c9'}
                    strokeWidth={activeId && related ? 2.2 : 1.6}
                    fill='none'
                    markerEnd={`url(#${id}-arrow)`}
                  />
                </g>
              )
            })}
          </svg>
          <ul className='m-0 list-none p-0'>
            {positions.map(({ entry, x, y, rank }) => {
              const current = entry.nodeId === nextNodeId
              return (
                <li
                  key={entry.nodeId}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y - 36,
                    width: 180,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <button
                    type='button'
                    onClick={() => onSelect(entry.nodeId)}
                    data-next={current}
                    data-node-id={entry.nodeId}
                    data-layer={rank}
                    onMouseEnter={() => setHoveredId(entry.nodeId)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(entry.nodeId)}
                    onBlur={() => setHoveredId(null)}
                    aria-label={
                      en ? `View ${entry.name}` : `查看 ${entry.name}`
                    }
                    aria-current={current ? 'step' : undefined}
                    aria-pressed={entry.nodeId === selectedId}
                    className='path-stop flex w-full flex-col items-center rounded-xl px-1 pb-2 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300'
                  >
                    <span className='relative'>
                      <PathPlanet entry={entry} current={current} />
                      {entry.isGoal && (
                        <span
                          aria-label={en ? 'Learning goal' : '学习目标'}
                          className='absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center rounded-full border border-amber-300/50 bg-[#101a30] text-amber-200'
                        >
                          <Flag className='size-3' />
                        </span>
                      )}
                    </span>
                    <span className='mt-4 line-clamp-2 text-sm leading-5 font-medium text-slate-100'>
                      {entry.name}
                    </span>
                    <span className='mt-1 text-[11px] text-slate-400'>
                      {entry.minutes} {en ? 'min' : '分钟'} ·{' '}
                      {entry.isGoal
                        ? en
                          ? 'Goal'
                          : '目标'
                        : en
                          ? 'Preparation'
                          : '先修'}
                    </span>
                    {current ? (
                      <span className='mt-2 rounded-full bg-sky-300/15 px-2.5 py-0.5 text-[10px] text-sky-200'>
                        {en ? 'Recommended next' : '推荐下一步'}
                      </span>
                    ) : (
                      <span className='mt-2 text-[10px] text-slate-500'>
                        {entry.status === 'ready'
                          ? en
                            ? 'Ready to learn'
                            : '可学习'
                          : en
                            ? 'Prerequisites first'
                            : '先学前置'}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className='relative flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 px-4 py-3 text-[11px] text-slate-400'>
        <span>
          <span className='mr-1.5 inline-block size-2 rounded-full bg-sky-300' />
          {en ? 'Recommended next' : '推荐下一步'}
        </span>
        <span>
          <span className='mr-1.5 inline-block size-2 rounded-full bg-violet-300' />
          {en ? 'Ready to learn' : '可学习'}
        </span>
        <span>
          <span className='mr-1.5 inline-block size-2 rounded-full bg-slate-500' />
          {en ? 'Prerequisites first' : '先学前置'}
        </span>
        <span className='sm:ml-auto'>
          {en
            ? 'Arrows show remaining prerequisites. Scroll to explore the graph.'
            : '箭头表示尚需完成的前置关系；可滚动查看完整分支。'}
        </span>
      </div>
    </div>
  )
}
