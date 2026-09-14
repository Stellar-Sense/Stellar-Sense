import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Compass, Sparkles } from 'lucide-react'
import { t, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { useKnowledgeGraph } from './api'
import { FloatingPanel } from './floating-panel'
import {
  domainOrder,
  getDomainTheme,
  getNodeDetail,
  statusLabel,
  type KnowledgeNode,
  type NodeStatus,
} from './graph-data'
import { StarMap2D } from './star-map-2d'
import { buildStarMapLayout } from './star-map-layout'

const StarMap3D = lazy(() => import('./star-map-3d'))

type ViewMode = '3d' | '2d'

const viewOptions: { id: ViewMode; label: string; hint: string }[] = [
  { id: '3d', label: '3D 星系', hint: '旋转、缩放并飞近行星观察' },
  { id: '2d', label: '2D 星图', hint: '经典平面星图，可拖拽节点' },
]

const statusClassNames: Record<NodeStatus, string> = {
  mastered: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
  learning: 'border-violet-400/20 bg-violet-500/10 text-violet-200',
  unlearned: 'border-slate-600/60 bg-slate-700/60 text-slate-300',
}

export function KnowledgeGraph() {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('3d')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)

  const { data, isPending } = useKnowledgeGraph()

  const nodes = useMemo(() => data?.nodes ?? [], [data])
  const edges = useMemo(() => data?.edges ?? [], [data])

  const nodeMap = useMemo(
    () =>
      Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<
        string,
        KnowledgeNode
      >,
    [nodes]
  )

  const layout = useMemo(() => buildStarMapLayout(nodes, edges), [nodes, edges])

  const selectedNode = selectedNodeId ? (nodeMap[selectedNodeId] ?? null) : null

  const selectedNodeDetail = useMemo(
    () => (selectedNode ? getNodeDetail(selectedNode) : null),
    [selectedNode]
  )

  const stats = useMemo(
    () => ({
      total: nodes.length,
      mastered: nodes.filter((node) => node.status === 'mastered').length,
      learning: nodes.filter((node) => node.status === 'learning').length,
      unlearned: nodes.filter((node) => node.status === 'unlearned').length,
    }),
    [nodes]
  )

  const handleUnsupported = useCallback(() => {
    setView('2d')
    setFallbackNotice(
      '当前环境未启用 WebGL，已自动切换到 2D 星图；升级浏览器或开启硬件加速后可切回 3D。'
    )
  }, [])

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId)
  }, [])

  const handleHoverNode = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId)
  }, [])

  const handleStartLearning = useCallback(() => {
    if (!selectedNode) return
    navigate({ to: '/node-learning', search: { nodeId: selectedNode.id } })
  }, [navigate, selectedNode])

  return (
    <>
      <style>{`
        @keyframes starDrift {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(12px, -10px, 0) scale(1.12); }
          100% { transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes slowTwinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.8; }
        }
        @keyframes haloPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes rotateHalo {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes planetPulse {
          0%, 100% { transform: scale(1); filter: saturate(1); }
          50% { transform: scale(1.06); filter: saturate(1.15); }
        }
        @keyframes slowSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes galaxyLoading {
          0%, 100% { opacity: 0.4; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>

      <Header>
        <Search />

        <ProfileDropdown />
      </Header>

      <Main
        fixed
        fluid
        className='relative overflow-hidden px-4 py-3 md:px-5 md:py-4'
      >
        <div className='pointer-events-none absolute inset-0 overflow-hidden'>
          <div className='absolute top-10 -left-12 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl' />
          <div className='absolute top-12 right-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl' />
          <div className='absolute bottom-10 left-1/3 h-52 w-52 rounded-full bg-cyan-400/8 blur-3xl' />
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(168,85,247,0.08),transparent_24%)]' />
        </div>

        <div className='relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto xl:overflow-hidden'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 backdrop-blur-sm'>
            <div className='flex items-center gap-3'>
              <span className='inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.2em] text-sky-200 uppercase'>
                {t('Remote Sensing Knowledge Universe')}
              </span>
              <h1 className='text-lg font-bold tracking-tight text-white md:text-xl'>
                {t('学科星图')}
              </h1>
            </div>

            <div
              className='flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/70 p-1'
              role='group'
              aria-label={t('视图切换')}
            >
              {viewOptions.map((option) => (
                <button
                  key={option.id}
                  type='button'
                  title={t(option.hint)}
                  aria-pressed={view === option.id}
                  onClick={() => setView(option.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    view === option.id
                      ? 'bg-gradient-to-r from-sky-500/80 to-violet-500/80 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>
          </div>

          {/* 宇宙画布及其浮层固定使用深色，页面其余部分跟随用户主题。 */}
          <div className='dark relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-2 text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.42)] backdrop-blur-sm xl:min-h-0'>
            {fallbackNotice && (
              <div className='pointer-events-none absolute top-4 left-1/2 z-40 w-[min(92%,560px)] -translate-x-1/2 rounded-2xl border border-amber-400/20 bg-amber-950/90 px-3 py-2 text-center text-[11px] text-amber-200 shadow-lg backdrop-blur-sm'>
                {fallbackNotice}
              </div>
            )}

            {isPending ? (
              <div className='flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-white/8 bg-slate-950/80 text-sm text-slate-400'>
                {t('正在加载知识星图…')}
              </div>
            ) : view === '3d' ? (
              <Suspense
                fallback={
                  <div className='flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/8 bg-slate-950/80 text-sm text-slate-400'>
                    <span
                      className='h-16 w-16 rounded-full bg-gradient-to-br from-sky-500/40 via-violet-500/30 to-transparent'
                      style={{
                        animation: 'galaxyLoading 1.8s ease-in-out infinite',
                      }}
                    />
                    {t('正在构建知识星系…')}
                  </div>
                }
              >
                <StarMap3D
                  key={data?.revision}
                  layout={layout}
                  nodes={nodes}
                  nodeMap={nodeMap}
                  edges={edges}
                  selectedNodeId={selectedNodeId}
                  hoveredNodeId={hoveredNodeId}
                  onSelectNode={handleSelectNode}
                  onHoverNode={handleHoverNode}
                  onUnsupported={handleUnsupported}
                />
              </Suspense>
            ) : (
              <StarMap2D
                key={data?.revision}
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                hoveredNodeId={hoveredNodeId}
                onSelectNode={handleSelectNode}
                onHoverNode={handleHoverNode}
              />
            )}
            <FloatingPanel
              title={t('知识状态')}
              icon={<Compass className='h-4 w-4' />}
              collapsible
              defaultOpen
              className='top-4 left-4 max-h-[calc(100%-2rem)] w-[min(280px,calc(100%-2rem))]'
            >
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between rounded-xl border border-slate-600/50 bg-slate-800/60 px-3 py-2 text-sm'>
                  <span className='text-slate-200'>{t('● 全部节点')}</span>
                  <span className='text-slate-200'>{stats.total}</span>
                </div>
                <div className='flex items-center justify-between rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm'>
                  <span className='text-sky-100'>{t('● 已掌握')}</span>
                  <span className='text-slate-200'>{stats.mastered}</span>
                </div>
                <div className='flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-sm'>
                  <span className='text-violet-100'>{t('● 当前学习')}</span>
                  <span className='text-slate-200'>{stats.learning}</span>
                </div>
                <div className='flex items-center justify-between rounded-xl border border-slate-600/50 bg-slate-800/60 px-3 py-2 text-sm'>
                  <span className='text-slate-200'>{t('● 未学习')}</span>
                  <span className='text-slate-200'>{stats.unlearned}</span>
                </div>
              </div>

              {view === '3d' && (
                <p className='mt-3 text-[11px] leading-5 text-slate-400'>
                  <span className='text-slate-300'>{t('色相')}</span>
                  {t('表示所属领域，轨道半径表示先修层级，')}
                  <span className='text-slate-300'>{t('亮度与大气/环')}</span>
                  {t('表示掌握状态；选中后会高亮前置链路。')}
                </p>
              )}

              <div className='mt-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3'>
                <div className='text-[10px] tracking-[0.18em] text-slate-400 uppercase'>
                  {t('Domains')}
                </div>
                <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1.5'>
                  {(data?.domainOrder ?? domainOrder).map((domain) => (
                    <span
                      key={domain}
                      className='flex items-center gap-1.5 text-[11px] text-slate-300'
                    >
                      <span
                        className='h-2 w-2 rounded-full'
                        style={{
                          background: getDomainTheme(domain).accent,
                          boxShadow: `0 0 8px ${getDomainTheme(domain).accent}`,
                        }}
                      />
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            </FloatingPanel>

            {selectedNode && selectedNodeDetail && (
              <FloatingPanel
                title={t('知识点详情')}
                icon={<Sparkles className='h-4 w-4' />}
                onClose={() => handleSelectNode(null)}
                className='right-4 bottom-4 max-h-[min(65%,460px)] w-[min(320px,calc(100%-2rem))]'
              >
                <div className='mb-3 flex items-start justify-between gap-2'>
                  <div>
                    <div className='text-[10px] tracking-[0.18em] text-slate-400 uppercase'>
                      {t('Selected')}
                    </div>
                    <h2 className='mt-1 text-lg font-semibold text-white'>
                      {selectedNode.name}
                    </h2>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-1 text-[10px] font-medium',
                      statusClassNames[selectedNode.status]
                    )}
                  >
                    {t(statusLabel[selectedNode.status])}
                  </span>
                </div>

                <dl className='space-y-2.5 text-sm text-slate-300'>
                  <div>
                    <dt className='text-slate-400'>{t('知识节点')}</dt>
                    <dd className='mt-1 text-slate-100'>{selectedNode.name}</dd>
                  </div>
                  <div>
                    <dt className='text-slate-400'>{t('学习状态')}</dt>
                    <dd className='mt-1 text-slate-100'>
                      {t(statusLabel[selectedNode.status])}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-slate-400'>{t('知识简介')}</dt>
                    <dd className='mt-1 text-slate-100'>
                      {selectedNodeDetail.description}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-slate-400'>{t('前置知识')}</dt>
                    <dd className='mt-1 text-slate-100'>
                      {selectedNode.prerequisites.length > 0
                        ? selectedNode.prerequisites
                            .map((id) => nodeMap[id]?.name ?? id)
                            .join(' · ')
                        : t('无')}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-slate-400'>{t('学习进度')}</dt>
                    <dd className='mt-1 text-slate-100'>
                      {selectedNodeDetail.progress}%
                    </dd>
                  </div>
                  <div>
                    <dt className='text-slate-400'>{t('所属领域')}</dt>
                    <dd className='mt-1 flex items-center gap-2 text-slate-100'>
                      <span
                        className='h-2 w-2 rounded-full'
                        style={{
                          background: getDomainTheme(selectedNode.domain)
                            .accent,
                        }}
                      />
                      {selectedNode.domain}
                    </dd>
                  </div>
                </dl>

                <Button
                  className='mt-4 w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/15 hover:brightness-110'
                  onClick={handleStartLearning}
                >
                  <Sparkles className='mr-2 h-4 w-4' />
                  {t('开始学习 →')}
                </Button>
              </FloatingPanel>
            )}
          </div>
        </div>
      </Main>
    </>
  )
}
