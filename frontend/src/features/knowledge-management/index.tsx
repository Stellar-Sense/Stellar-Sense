import { useState } from 'react'
import {
  Network,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { t, useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  LearningPage,
  panelClass,
  selectClass,
} from '@/components/learning-page'
import { StarMap2D } from '@/features/knowledge-graph/star-map-2d'
import {
  kindLabels,
  relationLabels,
  useGraphChanges,
  useGraphMutation,
  useManagedGraph,
  type GraphEdge,
  type ManagedGraph,
  type Relation,
} from './api'
import { NodeEditor, TaskEditor } from './node-editor'

function EdgeEditor({
  graph,
  edge,
  selectedId,
  onSaved,
}: {
  graph: ManagedGraph
  edge?: GraphEdge
  selectedId: string | null
  onSaved: () => void
}) {
  useLocale((state) => state.locale)

  const [form, setForm] = useState({
    fromId: edge?.fromId ?? selectedId ?? graph.nodes[0]?.id ?? '',
    toId: edge?.toId ?? '',
    relation: edge?.relation ?? 'prerequisite',
    reason: edge?.reason ?? '',
  })
  const mutation = useGraphMutation()
  const [baseRevision] = useState(graph.revision)
  return (
    <form
      className={`${panelClass} space-y-3`}
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate(
          {
            method: edge ? 'put' : 'post',
            path: edge ? `/edges/${edge.id}` : '/edges',
            data: { ...form, expectedRevision: baseRevision },
          },
          {
            onSuccess: () => {
              toast.success(t('关系已保存'))
              onSaved()
            },
          }
        )
      }}
    >
      <h2 className='font-semibold'>{edge ? t('编辑关系') : t('添加关系')}</h2>
      {graph.revision !== baseRevision && (
        <p role='alert' className='text-xs text-amber-200'>
          {t('图谱已更新，请重新打开关系编辑后保存。')}
        </p>
      )}
      <p className='text-xs leading-5 text-slate-400'>
        {t(
          '前置依赖：先学 A，再学 B。包含：A 下含 B。只有前置依赖影响解锁；课程或方向的依赖会展开到其包含的知识点。'
        )}
      </p>
      {(['fromId', 'toId'] as const).map((key) => (
        <label key={key} className='block text-sm'>
          {key === 'fromId' ? t('起点 A') : t('终点 B')}
          <select
            required
            className={selectClass}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          >
            <option value=''>{t('请选择节点')}</option>
            {graph.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} · {node.domain}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className='block text-sm'>
        {t('关系类型')}
        <select
          className={selectClass}
          value={form.relation}
          onChange={(e) =>
            setForm({ ...form, relation: e.target.value as Relation })
          }
        >
          {Object.entries(relationLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <label className='block text-sm'>
        {t('关系原因')}
        <Textarea
          required
          maxLength={512}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder={t('说明为什么需要这条关系')}
        />
      </label>
      <div className='flex gap-2'>
        <Button type='submit' disabled={mutation.isPending}>
          {t('保存关系')}
        </Button>
        {edge && (
          <Button type='button' variant='ghost' onClick={onSaved}>
            {t('取消编辑')}
          </Button>
        )}
      </div>
    </form>
  )
}

export function KnowledgeManagement() {
  useLocale((state) => state.locale)

  const user = useAuthStore((state) => state.auth.user)
  const allowed = Boolean(user?.role.includes('admin'))
  const query = useManagedGraph(allowed)
  const changes = useGraphChanges(allowed)
  const mutation = useGraphMutation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Relation | 'all'>('all')
  const [editingNode, setEditingNode] = useState<'new' | 'edit' | null>(null)
  const [editingEdge, setEditingEdge] = useState<GraphEdge | undefined>()
  const [removing, setRemoving] = useState<{
    path: string
    label: string
  } | null>(null)
  const graph = query.data
  const selected = graph?.nodes.find((node) => node.id === selectedId)
  const visibleEdges =
    graph?.edges.filter(
      (edge) =>
        (filter === 'all' || edge.relation === filter) &&
        (!selectedId || edge.fromId === selectedId || edge.toId === selectedId)
    ) ?? []
  const name = (id: string) =>
    graph?.nodes.find((node) => node.id === id)?.name ?? id
  return (
    <LearningPage
      title={t('知识星云管理')}
      description={t(
        '维护学科方向、课程与知识节点，以及整个星图的依赖关系。修改会同步影响学习导航和后续路径计算。'
      )}
      actions={
        allowed && (
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => void query.refetch()}>
              <RefreshCw className='mr-2 size-4' />
              {t('刷新')}
            </Button>
            <Button onClick={() => setEditingNode('new')}>
              <Plus className='mr-2 size-4' />
              {t('新建节点')}
            </Button>
          </div>
        )
      }
    >
      {!user ? (
        <p role='status'>{t('正在确认管理员身份…')}</p>
      ) : !allowed ? (
        <div role='alert' className={panelClass}>
          <ShieldCheck className='mb-3 size-6 text-amber-300' />
          {t(
            '仅管理员可访问知识星云管理。普通用户可以在学科星图中查看和学习。'
          )}
        </div>
      ) : query.isPending ? (
        <p role='status'>{t('正在加载知识星图…')}</p>
      ) : query.isError ? (
        <div role='alert' className={panelClass}>
          {t('加载失败，请确认管理员身份或刷新重试。')}
        </div>
      ) : (
        graph && (
          <>
            <div className='flex flex-wrap gap-4 text-sm text-slate-300'>
              <span>
                {graph.nodes.length}
                {t('个节点')}
              </span>
              <span>
                {graph.edges.length}
                {t('条关系')}
              </span>
              <span>
                {t('图谱版本')}
                {graph.revision}
              </span>
              <span className='text-sky-300'>{t('管理员专用')}</span>
            </div>
            <div className='grid items-start gap-5 xl:grid-cols-[1fr_360px]'>
              <div className='space-y-5'>
                <section className={panelClass}>
                  <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                    <h2 className='flex items-center gap-2 font-semibold'>
                      <Network className='size-4' />
                      {t('关系总览')}
                    </h2>
                    <select
                      aria-label={t('筛选关系类型')}
                      className={`${selectClass} max-w-44`}
                      value={filter}
                      onChange={(e) =>
                        setFilter(e.target.value as Relation | 'all')
                      }
                    >
                      <option value='all'>{t('全部关系')}</option>
                      {Object.entries(relationLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {t(label)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className='mb-3 text-xs leading-6 text-slate-400'>
                    {t(
                      '圆点是知识节点，连线是已保存的关系。位置远近不代表先修顺序。 点选节点会高亮它直接相连的关系，并在下方列出关系方向与原因；点击空白处恢复总览。 右上角筛选会同时影响图中的连线和下方关系列表。'
                    )}
                  </p>
                  <div className='mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs'>
                    <span className='text-sky-300'>
                      {t('A → B · 前置：先学 A，再学 B')}
                    </span>
                    <span className='text-violet-400'>
                      {t('A → B · 包含：A 下含 B')}
                    </span>
                    <span className='text-emerald-400'>
                      {t('A → B · 应用：A 应用于 B')}
                    </span>
                    <span className='text-amber-400'>
                      {t('A — B · 关联：A 与 B 有联系')}
                    </span>
                  </div>
                  <div className='relative h-[420px] overflow-hidden rounded-xl bg-slate-950'>
                    <StarMap2D
                      key={graph.revision}
                      nodes={graph.nodes.map((node) => ({
                        ...node,
                        status: 'unlearned' as const,
                        duration: t('{0} 分钟', node.minutes),
                        progress: 0,
                        prerequisites: graph.edges
                          .filter(
                            (edge) =>
                              edge.relation === 'prerequisite' &&
                              edge.toId === node.id
                          )
                          .map((edge) => edge.fromId),
                      }))}
                      edges={graph.edges
                        .filter(
                          (edge) => filter === 'all' || edge.relation === filter
                        )
                        .map((edge) => ({
                          id: edge.id,
                          relation: edge.relation,
                          reason: edge.reason,
                          from: edge.fromId,
                          to: edge.toId,
                        }))}
                      selectedNodeId={selectedId}
                      hoveredNodeId={hoveredId}
                      onSelectNode={setSelectedId}
                      onHoverNode={setHoveredId}
                    />
                  </div>
                  <p className='mt-2 text-xs text-slate-500'>
                    {t(
                      '图内滚轮只缩放，移出图外滚动页面；拖动空白处平移，拖动节点临时调整位置。 保存位置请编辑节点坐标；新增或修改关系请使用右侧表单。'
                    )}
                  </p>
                </section>
                <section className={panelClass}>
                  <Input
                    aria-label={t('搜索管理节点')}
                    placeholder={t('搜索节点或领域')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className='mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2'>
                    {graph.nodes
                      .filter((node) =>
                        `${node.name} ${node.domain}`
                          .toLowerCase()
                          .includes(search.toLowerCase())
                      )
                      .map((node) => (
                        <button
                          key={node.id}
                          onClick={() => {
                            setSelectedId(node.id)
                            setEditingNode(null)
                          }}
                          className={`rounded-lg border p-3 text-left text-sm ${selectedId === node.id ? 'border-sky-400 bg-sky-500/10' : 'border-white/10'}`}
                        >
                          {node.name}
                          <span className='mt-1 block text-xs text-slate-400'>
                            {t(kindLabels[node.kind])} · {node.domain}
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
                <section className={panelClass}>
                  <div className='flex items-center justify-between'>
                    <h2 className='font-semibold'>
                      {selected
                        ? t('{0} 的关系', selected.name)
                        : t('全部节点关系')}
                    </h2>
                    {selected && (
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => setSelectedId(null)}
                      >
                        {t('显示全部')}
                      </Button>
                    )}
                  </div>
                  <div className='mt-3 space-y-2'>
                    {visibleEdges.map((edge) => (
                      <div
                        key={edge.id}
                        className='rounded-lg border border-white/10 p-3'
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <p className='text-sm'>
                            {name(edge.fromId)}{' '}
                            <span className='text-sky-300'>
                              —{t(relationLabels[edge.relation])}→
                            </span>{' '}
                            {name(edge.toId)}
                          </p>
                          <div className='flex shrink-0 gap-1'>
                            <Button
                              aria-label={t(
                                '编辑关系 {0} 到 {1}',
                                name(edge.fromId),
                                name(edge.toId)
                              )}
                              size='icon'
                              variant='ghost'
                              onClick={() => setEditingEdge(edge)}
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              aria-label={t(
                                '删除关系 {0} 到 {1}',
                                name(edge.fromId),
                                name(edge.toId)
                              )}
                              size='icon'
                              variant='ghost'
                              onClick={() =>
                                setRemoving({
                                  path: `/edges/${edge.id}`,
                                  label: `${name(edge.fromId)} → ${name(edge.toId)}`,
                                })
                              }
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </div>
                        </div>
                        <p className='mt-1 text-xs text-slate-400'>
                          {edge.reason}
                        </p>
                      </div>
                    ))}
                    {!visibleEdges.length && (
                      <p className='py-4 text-sm text-slate-400'>
                        {t('当前筛选下没有关系。')}
                      </p>
                    )}
                  </div>
                </section>
                <section className={panelClass}>
                  <h2 className='mb-3 font-semibold'>{t('最近维护记录')}</h2>
                  <div className='space-y-2 text-xs text-slate-400'>
                    {changes.data?.slice(0, 10).map((change) => (
                      <p key={change.version}>
                        {t('版本')}
                        {change.version} · {change.action}
                        {t('· 管理员 #')}
                        {change.administratorId} ·{' '}
                        {new Date(change.createdAt).toLocaleString(
                          useLocale.getState().locale === 'zh'
                            ? 'zh-CN'
                            : 'en-US'
                        )}
                      </p>
                    ))}
                  </div>
                </section>
              </div>
              <div className='space-y-5'>
                {editingNode ? (
                  <NodeEditor
                    key={editingNode === 'new' ? 'new' : selected?.id}
                    node={editingNode === 'edit' ? selected : undefined}
                    revision={graph.revision}
                    onCancel={() => setEditingNode(null)}
                    onSaved={(id) => {
                      setEditingNode(null)
                      if (id) setSelectedId(id)
                    }}
                  />
                ) : (
                  selected && (
                    <section className={`${panelClass} space-y-3`}>
                      <h2 className='font-semibold'>{selected.name}</h2>
                      <p className='text-xs text-slate-400'>
                        {t(kindLabels[selected.kind])} · {selected.domain} ·{' '}
                        {selected.minutes}
                        {t('分钟')}
                      </p>
                      <p className='text-sm leading-6 whitespace-pre-wrap'>
                        {selected.description || t('尚无知识说明')}
                      </p>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() => setEditingNode('edit')}
                        >
                          {t('编辑节点')}
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() =>
                            setRemoving({
                              path: `/nodes/${encodeURIComponent(selected.id)}`,
                              label: selected.name,
                            })
                          }
                        >
                          {t('删除节点')}
                        </Button>
                      </div>
                    </section>
                  )
                )}
                <EdgeEditor
                  key={`${editingEdge?.id ?? `new-${graph.revision}`}-${selectedId ?? ''}`}
                  graph={graph}
                  edge={editingEdge}
                  selectedId={selectedId}
                  onSaved={() => setEditingEdge(undefined)}
                />
                {selected && (
                  <TaskEditor
                    key={selected.id}
                    nodeId={selected.id}
                    revision={graph.revision}
                  />
                )}
              </div>
            </div>
            <ConfirmDialog
              open={Boolean(removing)}
              onOpenChange={(open) => {
                if (!open) setRemoving(null)
              }}
              title={t('确认删除')}
              desc={t(
                '删除“{0}”会改变公共星图和后续路径。有依赖或学习记录的节点不能删除。',
                removing?.label ?? ''
              )}
              destructive
              cancelBtnText={t('取消')}
              confirmText={t('确认删除')}
              isLoading={mutation.isPending}
              handleConfirm={() => {
                if (removing)
                  mutation.mutate(
                    {
                      method: 'delete',
                      path: removing.path,
                      data: { expectedRevision: graph.revision },
                    },
                    {
                      onSuccess: () => {
                        setRemoving(null)
                        setSelectedId(null)
                        toast.success(t('已删除'))
                      },
                    }
                  )
              }}
            />
          </>
        )
      )}
    </LearningPage>
  )
}
