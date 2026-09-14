import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { PathPlanning } from './adaptive-path'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  update: vi.fn(),
  record: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@/components/learning-page', () => ({
  LearningPage: ({ children }: { children: ReactNode }) => children,
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
        entries,
        goal,
        nodes: entries.map((e) => ({
          id: e.nodeId,
          name: e.name,
          domain: e.domain,
        })),
        version: 2,
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
    mocks.record.mockImplementation((_data, options) => options.onSuccess())
  })

  it('saves selected targets and daily time, and keeps blocked nodes disabled', async () => {
    const screen = await render(<PathPlanning />)
    await userEvent.click(screen.getByRole('checkbox', { name: /节点 a/ }))
    await userEvent.fill(screen.getByRole('spinbutton'), '30')
    await userEvent.click(screen.getByRole('button', { name: '保存目标' }))
    expect(mocks.update).toHaveBeenCalledWith(
      { nodeIds: ['b', 'a'], dailyMinutes: 30 },
      expect.anything()
    )
    const start = screen.getByRole('button', { name: '开始学习' })
    await expect.element(start.nth(1)).toBeDisabled()
    await userEvent.click(start.nth(0))
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
    await userEvent.click(screen.getByRole('button', { name: /第 1 版/ }))
    await expect
      .element(screen.getByText('历史路径 · 第 1 版'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: '暂时跳过' }))
      .not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '返回当前路径' }))
    await expect
      .element(screen.getByRole('button', { name: '开始学习' }).nth(0))
      .toBeEnabled()
    expect(mocks.record).not.toHaveBeenCalled()
  })
})
