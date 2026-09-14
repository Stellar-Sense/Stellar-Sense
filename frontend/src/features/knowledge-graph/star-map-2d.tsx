import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, Minus, Plus, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getNodeDetail,
  getNodeStatusColors,
  type KnowledgeEdge,
  type KnowledgeNode,
} from './graph-data'
import { NodeHoverCard } from './node-hover-card'

type StarMap2DProps = {
  nodes: readonly KnowledgeNode[]
  edges: readonly KnowledgeEdge[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  onSelectNode: (nodeId: string | null) => void
  onHoverNode: (nodeId: string | null) => void
}

type Viewport = {
  x: number
  y: number
  scale: number
}

type NodePosition = {
  x: number
  y: number
}

const domainGroups = [
  { id: '遥感基础', x: 16, y: 30, width: 220, height: 160, rotate: -18 },
  { id: 'Python 数据处理', x: 34, y: 20, width: 200, height: 150, rotate: 12 },
  { id: '遥感影像处理', x: 61, y: 25, width: 210, height: 160, rotate: -10 },
  { id: '深度学习', x: 26, y: 68, width: 220, height: 180, rotate: 14 },
  { id: 'Transformer', x: 56, y: 66, width: 200, height: 170, rotate: -12 },
  { id: '遥感大模型', x: 76, y: 58, width: 230, height: 170, rotate: 18 },
] as const

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const relationColors = {
  prerequisite: '#7dd3fc',
  contains: '#a78bfa',
  applies: '#34d399',
  related: '#fbbf24',
}

const importantNode = (node: KnowledgeNode) =>
  [
    'Transformer',
    'CNN',
    '神经网络基础',
    '多模态模型',
    '遥感大模型应用',
  ].includes(node.id) ||
  node.status === 'learning' ||
  node.prerequisites.length >= 2

export function StarMap2D({
  nodes,
  edges,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
}: StarMap2DProps) {
  const [positions, setPositions] = useState<Record<string, NodePosition>>(() =>
    Object.fromEntries(nodes.map((node) => [node.id, { x: node.x, y: node.y }]))
  )
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const graphRef = useRef<HTMLDivElement | null>(null)
  const markerId = useId()
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(graph)
    return () => observer.disconnect()
  }, [])
  const nodeDragRef = useRef<{
    nodeId: string
    startX: number
    startY: number
    originX: number
    originY: number
    pointerId: number
    moved: boolean
  } | null>(null)
  const canvasDragRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    pointerId: number
  } | null>(null)
  const suppressClickRef = useRef(false)

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? (nodes.find((node) => node.id === selectedNodeId) ?? null)
        : null,
    [nodes, selectedNodeId]
  )

  const relatedNodeIds = useMemo(() => {
    if (!selectedNode) {
      return new Set<string>()
    }

    const ids = new Set<string>([
      selectedNode.id,
      ...selectedNode.prerequisites,
    ])

    for (const edge of edges) {
      if (edge.from === selectedNode.id) ids.add(edge.to)
      if (edge.to === selectedNode.id) ids.add(edge.from)
    }

    return ids
  }, [selectedNode, edges])

  const stars = useMemo(
    () =>
      Array.from({ length: 200 }, (_, index) => ({
        id: index,
        left: (index * 13.7) % 100,
        top: (index * 17.9) % 100,
        size: 1 + (index % 4) * 0.8,
        opacity: 0.18 + ((index * 13) % 7) * 0.1,
        duration: 4 + ((index * 17) % 12),
        delay: (index * 29) % 8,
      })),
    []
  )

  const handleCanvasPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    onSelectNode(null)
    nodeDragRef.current = null
    canvasDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = graphRef.current?.getBoundingClientRect()
    if (rect) {
      const offsetX = (event.clientX - rect.left - rect.width / 2) / rect.width
      const offsetY = (event.clientY - rect.top - rect.height / 2) / rect.height
      setParallax({ x: offsetX * 14, y: offsetY * 10 })
    }

    const drag = canvasDragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    setViewport((previous) => ({
      ...previous,
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    }))
  }

  const handleCanvasPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      canvasDragRef.current &&
      event.pointerId === canvasDragRef.current.pointerId
    ) {
      canvasDragRef.current = null
    }
    setParallax({ x: 0, y: 0 })
  }

  const handleNodePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string
  ) => {
    if (event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    const position = positions[nodeId]
    if (!position) return

    suppressClickRef.current = false
    nodeDragRef.current = {
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      pointerId: event.pointerId,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleNodePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string
  ) => {
    const drag = nodeDragRef.current
    if (!drag || drag.nodeId !== nodeId || event.pointerId !== drag.pointerId) {
      return
    }

    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY
    )
    if (distance > 6) {
      drag.moved = true
      suppressClickRef.current = true
    }

    if (!drag.moved) return

    const graphRect = graphRef.current?.getBoundingClientRect()
    if (!graphRect) return

    const deltaPercentX =
      (((event.clientX - drag.startX) / graphRect.width) * 100) / viewport.scale
    const deltaPercentY =
      (((event.clientY - drag.startY) / graphRect.height) * 100) /
      viewport.scale

    setPositions((previous) => ({
      ...previous,
      [nodeId]: {
        x: clamp(drag.originX + deltaPercentX, 4, 96),
        y: clamp(drag.originY + deltaPercentY, 8, 92),
      },
    }))
  }

  const handleNodePointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string
  ) => {
    const drag = nodeDragRef.current
    if (drag && drag.nodeId === nodeId && event.pointerId === drag.pointerId) {
      if (!drag.moved) {
        onSelectNode(nodeId)
      }
      nodeDragRef.current = null
    }

    if (suppressClickRef.current && drag?.moved) {
      suppressClickRef.current = false
    }
  }

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const handleWheelZoom = (event: WheelEvent) => {
      // React 的委托 wheel 监听可能是 passive，必须在画布上显式允许阻止页面滚动。
      event.preventDefault()
      event.stopPropagation()
      if (event.deltaY === 0) return

      const rect = graph.getBoundingClientRect()

      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      setViewport((previous) => {
        const currentScale = previous.scale
        const nextScale = clamp(
          currentScale * (event.deltaY < 0 ? 1.12 : 0.9),
          0.7,
          1.6
        )
        const graphX = (mouseX - previous.x) / currentScale
        const graphY = (mouseY - previous.y) / currentScale

        return {
          scale: nextScale,
          x: mouseX - graphX * nextScale,
          y: mouseY - graphY * nextScale,
        }
      })
    }

    graph.addEventListener('wheel', handleWheelZoom, { passive: false })
    return () => graph.removeEventListener('wheel', handleWheelZoom)
  }, [])

  const zoomBy = (delta: number) => {
    const rect = graphRef.current?.getBoundingClientRect()
    if (!rect) return

    setViewport((previous) => {
      const nextScale = clamp(previous.scale + delta, 0.7, 1.6)
      const anchorX = rect.width / 2
      const anchorY = rect.height / 2
      const focusX = (anchorX - previous.x) / previous.scale
      const focusY = (anchorY - previous.y) / previous.scale

      return {
        scale: nextScale,
        x: anchorX - focusX * nextScale,
        y: anchorY - focusY * nextScale,
      }
    })
  }

  const fitCanvas = () => {
    const rect = graphRef.current?.getBoundingClientRect()
    if (!rect) return

    const bounds = Object.values(positions).reduce(
      (accumulator, position) => ({
        minX: Math.min(accumulator.minX, position.x),
        maxX: Math.max(accumulator.maxX, position.x),
        minY: Math.min(accumulator.minY, position.y),
        maxY: Math.max(accumulator.maxY, position.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    )

    const width = bounds.maxX - bounds.minX || 30
    const height = bounds.maxY - bounds.minY || 30
    const padding = 120
    const nextScale = clamp(
      Math.min(
        (rect.width - padding) / width,
        (rect.height - padding) / height
      ),
      0.6,
      1.2
    )
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    setViewport({
      scale: nextScale,
      x: rect.width / 2 - centerX * nextScale,
      y: rect.height / 2 - centerY * nextScale,
    })
  }

  return (
    <div
      ref={graphRef}
      role='region'
      aria-label='知识星图画布'
      className='relative h-full overflow-hidden rounded-2xl border border-white/8 bg-slate-950/80'
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <div
        className='pointer-events-none absolute inset-0 opacity-90'
        style={{
          transform: `translate(${parallax.x}px, ${parallax.y}px)`,
          background:
            'radial-gradient(circle at center, rgba(67,56,202,0.18), transparent 52%)',
        }}
      />

      <div
        className='absolute inset-0 origin-top-left transition-transform duration-150'
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        <div className='absolute inset-0'>
          {stars.map((star) => (
            <span
              key={star.id}
              className='absolute rounded-full bg-sky-100/70'
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                boxShadow: `0 0 ${star.size * 4}px rgba(125, 211, 252, 0.22)`,
                animation: `slowTwinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              }}
            />
          ))}
        </div>

        <svg
          aria-label='知识关系连线'
          className='absolute inset-0 z-10 h-full w-full'
        >
          <defs>
            {Object.entries(relationColors).map(([relation, color]) => (
              <marker
                key={relation}
                id={`${markerId}-${relation}`}
                markerWidth='10'
                markerHeight='8'
                refX='10'
                refY='4'
                orient='auto'
                markerUnits='userSpaceOnUse'
              >
                <path d='M 0 0 L 10 4 L 0 8 Z' fill={color} />
              </marker>
            ))}
          </defs>
          {edges.map((edge) => {
            const source = positions[edge.from]
            const target = positions[edge.to]

            if (!source || !target || !canvasSize.width) return null

            const shouldGlow =
              selectedNodeId === edge.from || selectedNodeId === edge.to
            const relation = edge.relation ?? 'prerequisite'
            const radius = (id: string) => {
              const node = nodes.find((item) => item.id === id)
              const size = node && importantNode(node) ? 58 : 46
              return (
                (size / 2) *
                  (id === selectedNodeId
                    ? 1.08
                    : id === hoveredNodeId
                      ? 1.04
                      : 1) +
                7
              )
            }
            const sx = (source.x / 100) * canvasSize.width
            const sy = (source.y / 100) * canvasSize.height
            const tx = (target.x / 100) * canvasSize.width
            const ty = (target.y / 100) * canvasSize.height
            const distance = Math.hypot(tx - sx, ty - sy) || 1
            // 距离较近时弯出一段弧线，让箭头仍能露在节点外；端点始终停在圆点边缘。
            const bend =
              distance < radius(edge.from) + radius(edge.to) + 24 ? -60 : 0
            const cx = (sx + tx) / 2 - ((ty - sy) / distance) * bend
            const cy = (sy + ty) / 2 + ((tx - sx) / distance) * bend
            const startDistance = Math.hypot(cx - sx, cy - sy) || 1
            const endDistance = Math.hypot(cx - tx, cy - ty) || 1
            const x1 = sx + ((cx - sx) / startDistance) * radius(edge.from)
            const y1 = sy + ((cy - sy) / startDistance) * radius(edge.from)
            const x2 = tx + ((cx - tx) / endDistance) * radius(edge.to)
            const y2 = ty + ((cy - ty) / endDistance) * radius(edge.to)

            return (
              <path
                key={edge.id ?? `${edge.from}-${edge.to}`}
                data-relation={relation}
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                fill='none'
                stroke={relationColors[relation]}
                markerEnd={
                  relation === 'related'
                    ? undefined
                    : `url(#${markerId}-${relation})`
                }
                strokeWidth={shouldGlow ? 3 : 2}
                vectorEffect='non-scaling-stroke'
                strokeDasharray={
                  edge.relation === 'related' ? '3 5' : undefined
                }
                opacity={shouldGlow ? 1 : selectedNodeId ? 0.25 : 0.85}
              >
                <title>{edge.reason ?? `${edge.from} → ${edge.to}`}</title>
              </path>
            )
          })}
        </svg>

        {domainGroups.map((group, index) => (
          <div
            key={group.id}
            className='pointer-events-none absolute z-0 rounded-full border border-sky-400/10 bg-sky-500/[0.03]'
            style={{
              left: `${group.x}%`,
              top: `${group.y}%`,
              width: `${group.width}px`,
              height: `${group.height}px`,
              transform: `translate(-50%, -50%) rotate(${group.rotate}deg)`,
              boxShadow: 'inset 0 0 20px rgba(96,165,250,0.05)',
              animation:
                index % 2 === 0
                  ? 'starDrift 14s ease-in-out infinite'
                  : 'starDrift 18s ease-in-out infinite reverse',
            }}
          />
        ))}

        {nodes.map((node) => {
          const position = positions[node.id]
          if (!position) return null

          const detail = getNodeDetail(node)
          const isHovering = hoveredNodeId === node.id
          const isSelected = selectedNodeId === node.id
          const isRelated =
            Boolean(selectedNodeId) && relatedNodeIds.has(node.id)
          const isDimmed = Boolean(selectedNodeId) && !isSelected && !isRelated
          const isImportant = importantNode(node)
          const nodeSize = isImportant
            ? 58
            : node.status === 'learning'
              ? 52
              : 46
          const orbitRadius = isSelected ? nodeSize + 22 : nodeSize + 14
          const colors = getNodeStatusColors(node.status)

          return (
            <button
              key={node.id}
              type='button'
              onPointerDown={(event) => handleNodePointerDown(event, node.id)}
              onPointerMove={(event) => handleNodePointerMove(event, node.id)}
              onPointerUp={(event) => handleNodePointerUp(event, node.id)}
              onClick={(event) => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false
                  event.preventDefault()
                  event.stopPropagation()
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                onSelectNode(node.id)
              }}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() =>
                onHoverNode(hoveredNodeId === node.id ? null : hoveredNodeId)
              }
              className={cn(
                'absolute z-20 flex cursor-grab flex-col items-center gap-2 transition-all duration-300 select-none active:cursor-grabbing',
                isSelected && 'z-30',
                isHovering && 'z-40'
              )}
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                opacity: isDimmed ? 0.45 : 1,
                transform: `translate(-50%, -${nodeSize / 2}px) scale(${isSelected ? 1.08 : isHovering ? 1.04 : 1})`,
                transformOrigin: `50% ${nodeSize / 2}px`,
              }}
            >
              {(isSelected || isImportant) && (
                <span
                  className='pointer-events-none absolute rounded-full border border-sky-300/15'
                  style={{
                    width: `${orbitRadius}px`,
                    height: `${orbitRadius}px`,
                    transform: `translate(-50%, -50%) rotate(${position.x * 2}deg)`,
                    left: '50%',
                    top: '50%',
                    opacity: isSelected ? 0.95 : 0.6,
                    boxShadow: 'inset 0 0 18px rgba(125, 211, 252, 0.06)',
                    animation: isSelected
                      ? 'rotateHalo 12s linear infinite'
                      : 'haloPulse 5s ease-in-out infinite',
                  }}
                />
              )}

              <span
                className='relative flex items-center justify-center rounded-full transition-all duration-300'
                style={{
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                  filter: isSelected ? 'saturate(1.2)' : 'saturate(1)',
                  animation:
                    node.status === 'learning'
                      ? 'planetPulse 5s ease-in-out infinite'
                      : node.status === 'mastered'
                        ? 'planetPulse 7s ease-in-out infinite'
                        : 'none',
                }}
              >
                <span
                  className='absolute inset-0 rounded-full blur-xl'
                  style={{
                    background: colors.gradient,
                    opacity: isSelected ? 0.9 : isHovering ? 0.8 : 0.6,
                    transform: `scale(${isSelected ? 1.35 : isHovering ? 1.2 : 1.08})`,
                    filter: 'blur(14px)',
                  }}
                />

                <span
                  className='absolute inset-[-7px] rounded-full border border-dashed'
                  style={{
                    borderColor: colors.ring,
                    opacity: isSelected
                      ? 0.9
                      : node.status === 'learning'
                        ? 0.82
                        : 0.36,
                    animation: isSelected
                      ? 'slowSpin 12s linear infinite'
                      : node.status === 'learning'
                        ? 'slowSpin 14s linear infinite reverse'
                        : 'none',
                  }}
                />

                <span
                  className='absolute inset-[-2px] rounded-full border'
                  style={{
                    borderColor: isSelected
                      ? 'rgba(255,255,255,0.38)'
                      : 'rgba(255,255,255,0.12)',
                    opacity: isSelected ? 1 : 0.72,
                    boxShadow: isSelected
                      ? `0 0 16px ${colors.glow}`
                      : `0 0 10px ${colors.glow}`,
                  }}
                />

                <span
                  className='relative z-10 flex items-center justify-center rounded-full border text-sm font-semibold shadow-lg'
                  style={{
                    width: `${nodeSize - 8}px`,
                    height: `${nodeSize - 8}px`,
                    background: colors.gradient,
                    borderColor: colors.border,
                    boxShadow: isSelected
                      ? `0 0 28px ${colors.glow}, 0 0 0 1px rgba(148,163,184,0.28), inset 0 0 18px rgba(255,255,255,0.26)`
                      : isHovering
                        ? `0 0 20px ${colors.glow}, inset 0 0 18px rgba(255,255,255,0.18)`
                        : `0 0 18px ${colors.glow}, 0 0 0 1px rgba(148,163,184,0.16), inset 0 0 12px rgba(255,255,255,0.12)`,
                  }}
                >
                  {node.status === 'mastered' ? (
                    <Check className='h-4 w-4 text-white' />
                  ) : (
                    <span className='text-[10px] font-semibold text-white'>
                      {node.name.slice(0, 1)}
                    </span>
                  )}
                </span>
              </span>

              <span
                className='max-w-[110px] text-center text-[10px] leading-4 font-medium text-slate-100 transition-opacity duration-200'
                style={{
                  textShadow: '0 0 8px rgba(59,130,246,0.4)',
                  opacity: isDimmed ? 0.5 : 1,
                }}
              >
                {node.name}
              </span>

              {isHovering && !isSelected && (
                <NodeHoverCard
                  node={node}
                  detail={detail}
                  className='absolute top-full left-1/2 z-40 mt-3 -translate-x-1/2'
                />
              )}
            </button>
          )
        })}
      </div>

      <div className='absolute top-3 right-3 z-20 flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/75 p-2 shadow-lg backdrop-blur-sm'>
        <output
          aria-label='缩放比例'
          className='text-center text-xs text-slate-300'
        >
          {Math.round(viewport.scale * 100)}%
        </output>
        <button
          type='button'
          onClick={() => zoomBy(0.12)}
          className='flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15'
          aria-label='Zoom in'
        >
          <Plus className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={() => zoomBy(-0.12)}
          className='flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15'
          aria-label='Zoom out'
        >
          <Minus className='h-4 w-4' />
        </button>
        <button
          type='button'
          onClick={fitCanvas}
          className='flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15'
          aria-label='Fit canvas'
        >
          <ZoomIn className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}
