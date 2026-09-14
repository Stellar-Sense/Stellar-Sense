import '@/styles/index.css'
import { expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { useLocale } from '@/lib/i18n'
import type { PathEntry } from './adaptive-api'
import { PathConstellation } from './path-constellation'

const entries: PathEntry[] = [
  '遥感概论',
  '电磁波与遥感',
  'Python 基础',
  '影像预处理',
  '特征提取',
  '神经网络基础',
  '遥感目标检测',
  'Transformer',
].map((name, index) => ({
  nodeId: `n${index}`,
  name,
  domain: index > 4 ? '深度学习' : index === 2 ? 'Python 数据处理' : '遥感基础',
  kind: 'concept',
  status: index < 3 ? 'ready' : 'blocked',
  mastery: 0,
  confidence: 0,
  prerequisites: [
    [],
    [],
    [],
    ['n0', 'n1'],
    ['n1', 'n2'],
    ['n2'],
    ['n3', 'n4', 'n5'],
    ['n5'],
  ][index],
  isGoal: index === 7,
  isReview: false,
  difficulty: 1,
  taskId: null,
  taskTitle: null,
  minutes: 25,
  sessions: [{ day: index + 1, minutes: 25 }],
  reasons: [],
  priority: index,
}))

it('draws real branches and merges without chaining independent nodes on desktop and mobile', async () => {
  useLocale.getState().setLocale('zh')
  document.documentElement.classList.add('dark')
  await page.viewport(1280, 900)
  const select = vi.fn()
  const screen = await render(
    <div style={{ padding: 20 }}>
      <PathConstellation entries={entries} nextNodeId='n0' onSelect={select} />
    </div>
  )
  const buttons = screen.getByRole('button', { name: /^查看 / })
  expect(
    buttons.all().map((button) => button.element().getAttribute('data-node-id'))
  ).toEqual(entries.map((entry) => entry.nodeId))
  const edges = () =>
    Array.from(document.querySelectorAll('[data-route-edge]')).map((edge) =>
      edge.getAttribute('data-route-edge')
    )
  const expectedEdges = [
    'n0:n3',
    'n1:n3',
    'n1:n4',
    'n2:n4',
    'n2:n5',
    'n3:n6',
    'n4:n6',
    'n5:n6',
    'n5:n7',
  ]
  expect(edges()).toEqual(expectedEdges)
  expect(document.querySelectorAll('path[marker-end]').length).toBe(9)
  const layer = (id: string) =>
    document.querySelector(`[data-node-id="${id}"]`)?.getAttribute('data-layer')
  expect(layer('n0')).toBe(layer('n1'))
  expect(layer('n1')).toBe(layer('n2'))
  expect(Number(layer('n6'))).toBeGreaterThan(Number(layer('n3')))
  await screen.rerender(
    <PathConstellation
      entries={[...entries].reverse()}
      nextNodeId='n0'
      onSelect={select}
    />
  )
  expect(edges().sort()).toEqual([...expectedEdges].sort())
  await screen.rerender(
    <PathConstellation entries={entries} nextNodeId='n0' onSelect={select} />
  )
  await page.screenshot({ path: 'node_modules/.cache/path-desktop.png' })
  await page.viewport(390, 844)
  await expect
    .poll(() => document.documentElement.scrollWidth <= window.innerWidth)
    .toBe(true)
  await buttons.nth(2).click()
  expect(select).toHaveBeenCalledWith('n2')
  expect(edges()).toHaveLength(9)
  await page.screenshot({ path: 'node_modules/.cache/path-mobile.png' })
  await screen.rerender(
    <PathConstellation
      entries={[entries[2], entries[0]]}
      nextNodeId='n2'
      onSelect={select}
    />
  )
  expect(edges()).toEqual([])
  await expect
    .element(screen.getByRole('button', { name: '查看 Python 基础' }))
    .toHaveAttribute('aria-current', 'step')
})
