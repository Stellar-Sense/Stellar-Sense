import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { KnowledgeManagement } from './index'

const mocks = vi.hoisted(() => ({
  admin: false,
  mutate: vi.fn(),
  query: vi.fn(),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ role: mocks.admin ? ['admin'] : ['user'] }),
}))
vi.mock('@/components/learning-page', () => ({
  LearningPage: ({
    children,
    actions,
  }: {
    children: ReactNode
    actions: ReactNode
  }) => (
    <>
      {actions}
      {children}
    </>
  ),
  panelClass: '',
  selectClass: '',
}))
vi.mock('@/features/knowledge-graph/star-map-2d', () => ({
  StarMap2D: () => null,
}))
vi.mock('./node-editor', () => ({
  NodeEditor: () => null,
  TaskEditor: () => null,
}))
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  useManagedGraph: (enabled: boolean) => {
    mocks.query(enabled)
    return {
      data: {
        revision: 7,
        nodes: ['a', 'b'].map((id) => ({
          id,
          name: `节点 ${id}`,
          domain: '遥感',
          kind: 'concept',
          difficulty: 1,
          minutes: 20,
          x: 50,
          y: 50,
        })),
        edges: [],
      },
      isPending: false,
    }
  },
  useGraphChanges: () => ({ data: [] }),
  useGraphMutation: () => ({ mutate: mocks.mutate, isPending: false }),
}))

describe('knowledge management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin = false
  })
  it('hides management controls and disables fetching for ordinary users', async () => {
    const screen = await render(<KnowledgeManagement />)
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('仅管理员')
    await expect
      .element(screen.getByRole('button', { name: '新建节点' }))
      .not.toBeInTheDocument()
    expect(mocks.query).toHaveBeenCalledWith(false)
  })
  it('submits directed relationships with their reason and the displayed revision', async () => {
    mocks.admin = true
    const screen = await render(<KnowledgeManagement />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '终点 B' }),
      'b'
    )
    await userEvent.fill(
      screen.getByRole('textbox', { name: '关系原因' }),
      '先掌握 A 才能理解 B'
    )
    await userEvent.click(screen.getByRole('button', { name: '保存关系' }))
    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        method: 'post',
        path: '/edges',
        data: {
          fromId: 'a',
          toId: 'b',
          relation: 'prerequisite',
          reason: '先掌握 A 才能理解 B',
          expectedRevision: 7,
        },
      },
      expect.anything()
    )
  })
})
