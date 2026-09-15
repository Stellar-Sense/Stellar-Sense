import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { PathPlanning } from './adaptive-path'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  update: vi.fn(),
  record: vi.fn(),
  progressed: false,
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
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
}))
vi.mock('@/features/node-learning/assessment-api', () => ({
  useLearningEvent: () => ({ mutate: mocks.record, isPending: false }),
}))
vi.mock('./adaptive-api', () => {
  const entries = ['a', 'b'].map((nodeId, i) => ({
    nodeId,
    name: `节点 ${nodeId}`,
    domain: '遥感',
    kind: 'concept',
    status: i ? 'blocked' : 'ready',
    mastery: 0,
    confidence: 0,
    prerequisites: i ? ['a'] : [],
    isGoal: !!i,
    isReview: false,
    difficulty: 1,
    taskId: null,
    taskTitle: null,
    minutes: 20,
    sessions: [{ day: 1, minutes: 20 }],
    reasons: ['依据先修关系安排'],
    priority: 1,
  }))
  const goal = { nodeIds: ['b'], dailyMinutes: 45, version: 1 }
  return {
    usePathPlan: () => ({
      data: {
        entries: mocks.progressed
          ? [{ ...entries[1], status: 'ready', prerequisites: [] }]
          : entries,
        goal,
        nodes: entries.map((e) => ({
          id: e.nodeId,
          name: e.name,
          domain: e.domain,
        })),
        version: mocks.progressed ? 3 : 2,
        nextNodeId: mocks.progressed ? 'b' : 'a',
        completedNodeIds: [],
        totalMinutes: 40,
        estimatedDays: 1,
      },
      isPending: false,
      isError: false,
    }),
    useUpdateGoal: () => ({ mutate: mocks.update, isPending: false }),
    useRegeneratePath: () => ({ mutate: vi.fn(), isPending: false }),
    usePathHistory: () => ({
      data: [
        { version: 1, createdAt: '2026-09-14T10:00:00', trigger: '首次规划' },
      ],
    }),
    usePathReplay: () => ({
      data: {
        verified: true,
        graphRevision: 1,
        eventIds: [],
        evaluationIds: [],
        goal,
        changes: ['初始路径'],
        result: { entries },
      },
      isPending: false,
      isError: false,
    }),
  }
})

describe('adaptive learning path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.progressed = false
    mocks.record.mockImplementation((_data, options) => options.onSuccess())
    mocks.update.mockImplementation((_data, options) => options.onSuccess())
  })

  it('saves selected targets and daily time, and keeps blocked nodes disabled', async () => {
    const screen = await render(<PathPlanning />)
    await userEvent.click(
      screen.getByRole('button', { name: '调整目标', exact: true })
    )
    await userEvent.click(screen.getByRole('checkbox', { name: /节点 a/ }))
    await userEvent.fill(screen.getByRole('spinbutton'), '30')
    await userEvent.click(screen.getByRole('button', { name: '保存目标' }))
    expect(mocks.update).toHaveBeenCalledWith(
      { nodeIds: ['b', 'a'], dailyMinutes: 30 },
      expect.anything()
    )
    await userEvent.click(
      screen.getByRole('button', { name: '查看 节点 b', exact: true })
    )
    await expect
      .element(screen.getByRole('dialog'))
      .toHaveTextContent('请先学习这些内容')
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }))
      .toBeDisabled()
    await userEvent.keyboard('{Escape}')
    await expect
      .element(screen.getByText('路径已更新', { exact: true }))
      .not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: '查看 节点 a', exact: true })
    )
    await expect
      .element(screen.getByRole('dialog'))
      .not.toHaveTextContent('掌握度')
    await expect
      .element(screen.getByRole('dialog'))
      .not.toHaveTextContent('置信度')
    await userEvent.click(screen.getByRole('button', { name: '开始学习' }))
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'a', kind: 'accept' }),
      expect.anything()
    )
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/node-learning',
      search: { nodeId: 'a' },
    })
  })

  it('replays historical versions without allowing learning events from them', async () => {
    const screen = await render(<PathPlanning />)
    await userEvent.click(
      screen.getByRole('button', { name: '历史路线', exact: true })
    )
    await userEvent.click(screen.getByRole('button', { name: /第 1 版/ }))
    await expect
      .element(screen.getByText('历史路径 · 第 1 版'))
      .toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: '查看 节点 a', exact: true })
    )
    await expect
      .element(screen.getByRole('dialog'))
      .toHaveTextContent('历史路线 · 仅供查看')
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: '暂时跳过' }))
      .not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: '返回当前路径' }))
    await userEvent.click(
      screen.getByRole('button', { name: '查看 节点 a', exact: true })
    )
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }).nth(0))
      .toBeEnabled()
    expect(mocks.record).not.toHaveBeenCalled()
  })

  it('updates an open detail dialog from the latest route and removes stale learning actions', async () => {
    const screen = await render(<PathPlanning />)
    await userEvent.click(
      screen.getByRole('button', { name: '查看 节点 a', exact: true })
    )
    mocks.progressed = true
    await screen.rerender(<PathPlanning />)
    await expect
      .element(screen.getByRole('dialog'))
      .toHaveTextContent('该节点已不在当前待学路线中')
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }))
      .not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await expect
      .element(screen.getByRole('button', { name: '查看 节点 a', exact: true }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: '查看 节点 b', exact: true }))
      .toHaveAttribute('aria-current', 'step')
    await userEvent.click(
      screen.getByRole('button', { name: '查看 节点 b', exact: true })
    )
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }))
      .toBeEnabled()
  })
})
