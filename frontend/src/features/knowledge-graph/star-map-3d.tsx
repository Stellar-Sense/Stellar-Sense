import { useEffect, useMemo, useRef } from 'react'
import { Crosshair } from 'lucide-react'
import { t, useLocale } from '@/lib/i18n'
import {
  getNodeDetail,
  statusLabel,
  type KnowledgeEdge,
  type KnowledgeNode,
} from './graph-data'
import { NodeHoverCard } from './node-hover-card'
import type { StarMapLayout } from './star-map-layout'
import { useStarMap } from './use-star-map'

type StarMap3DProps = {
  layout: StarMapLayout
  nodes: readonly KnowledgeNode[]
  nodeMap: Record<string, KnowledgeNode>
  edges: readonly KnowledgeEdge[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  onSelectNode: (nodeId: string | null) => void
  onHoverNode: (nodeId: string | null) => void
  onUnsupported: () => void
}

const CARD_MARGIN = 18
const CARD_WIDTH = 210
const CARD_HEIGHT = 150

export default function StarMap3D({
  layout,
  nodes,
  nodeMap,
  edges,
  selectedNodeId,
  hoveredNodeId,
  onSelectNode,
  onHoverNode,
  onUnsupported,
}: StarMap3DProps) {
  useLocale((state) => state.locale)

  const { containerRef, labelLayerRef, focusNode, resetView } = useStarMap({
    layout,
    nodeMap,
    edges,
    selectedNodeId,
    onSelectNode,
    onHoverNode,
    onUnsupported,
  })
  const cardRef = useRef<HTMLDivElement | null>(null)

  // 悬停卡片跟随鼠标：直接改 transform，避免每帧 setState 触发 React 重渲染
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const card = cardRef.current
      if (!card) return

      const left = Math.min(
        event.clientX + CARD_MARGIN,
        window.innerWidth - CARD_WIDTH
      )
      const top = Math.min(
        event.clientY + CARD_MARGIN,
        window.innerHeight - CARD_HEIGHT
      )
      card.style.transform = `translate3d(${Math.max(8, left)}px, ${Math.max(8, top)}px, 0)`
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  const hoveredNode = hoveredNodeId ? (nodeMap[hoveredNodeId] ?? null) : null
  const hoveredDetail = useMemo(
    () => (hoveredNode ? getNodeDetail(hoveredNode) : null),
    [hoveredNode]
  )

  const handleReset = () => {
    onSelectNode(null)
    resetView()
  }

  return (
    <div className='dark relative h-full overflow-hidden rounded-2xl border border-white/8 bg-[#02040c] text-slate-100'>
      <div
        ref={containerRef}
        className='absolute inset-0'
        role='application'
        aria-label={t(
          '知识星系三维视图，可拖拽旋转、滚轮缩放，点击行星查看节点详情'
        )}
      />
      <div
        ref={labelLayerRef}
        className='pointer-events-none absolute inset-0 overflow-hidden'
      />

      <div className='absolute top-3 right-3 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/75 p-1.5 shadow-lg backdrop-blur-sm'>
        <button
          type='button'
          onClick={handleReset}
          className='flex h-8 items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-500/10 px-2.5 text-[11px] text-sky-100 hover:bg-sky-500/15'
        >
          <Crosshair className='h-3.5 w-3.5' />
          {t('返回全景')}
        </button>
      </div>

      <div className='pointer-events-none absolute bottom-3 left-3 z-20 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-[10px] text-slate-400 backdrop-blur-sm'>
        {t('拖拽旋转 · 滚轮缩放 · 点击行星查看详情')}
      </div>

      {hoveredNode && hoveredDetail && (
        <div
          ref={cardRef}
          className='pointer-events-none fixed top-0 left-0 z-40'
        >
          <NodeHoverCard node={hoveredNode} detail={hoveredDetail} />
        </div>
      )}

      <ul className='sr-only'>
        {nodes.map((node) => (
          <li key={node.id}>
            <button
              type='button'
              onClick={() => {
                onSelectNode(node.id)
                focusNode(node.id)
              }}
            >
              {node.name}（{t(statusLabel[node.status])}，{node.domain}）
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
