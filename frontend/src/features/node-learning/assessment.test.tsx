import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { NodeAssessment } from './assessment'

const mocks = vi.hoisted(() => ({
  blocked: false,
  record: vi.fn(),
  retry: vi.fn(),
}))
vi.mock('./assessment-api', () => ({
  useNodeTasks: () => ({
    data: {
      state: { mastery: 0, confidence: 0, evidenceCount: 0 },
      blockers: mocks.blocked ? ['a'] : [],
      blockerNames: mocks.blocked ? ['前置知识'] : [],
      tasks: [
        {
          id: 'quiz',
          nodeId: 'b',
          title: '概念测验',
          prompt: '请选择',
          kind: 'quiz',
          difficulty: 1,
          minutes: 5,
          options: ['选项甲', '选项乙'],
          source: '课程资料',
        },
      ],
    },
    isPending: false,
  }),
  useLearningEvents: () => ({
    data: [
      {
        id: 42,
        kind: 'answer',
        status: 'pending',
        taskTitle: '解释题',
        createdAt: '2026-09-14T10:00:00',
        feedback: '模型暂不可用，作答已保存',
      },
    ],
  }),
  useLearningEvent: () => ({ mutate: mocks.record, isPending: false }),
  useRetryEvaluation: () => ({ mutate: mocks.retry, isPending: false }),
}))

describe('node assessment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.blocked = false
  })
  it('submits answers and reuses the same request after a network failure', async () => {
    const screen = await render(<NodeAssessment nodeId='b' />)
    await userEvent.click(screen.getByRole('radio', { name: '选项甲' }))
    await userEvent.click(screen.getByRole('button', { name: '提交作答' }))
    await userEvent.click(screen.getByRole('button', { name: '提交作答' }))
    const first = mocks.record.mock.calls[0][0]
    expect(first).toMatchObject({
      nodeId: 'b',
      taskId: 'quiz',
      answer: '0',
      kind: 'answer',
    })
    expect(mocks.record.mock.calls[1][0]).toEqual(first)
    await userEvent.click(screen.getByRole('button', { name: '重试评价' }))
    expect(mocks.retry).toHaveBeenCalledWith(42, expect.anything())
  })
  it('blocks assessment when prerequisites are missing while retaining read evidence', async () => {
    mocks.blocked = true
    const screen = await render(<NodeAssessment nodeId='b' />)
    await expect
      .element(screen.getByRole('radio', { name: '选项甲' }))
      .toBeDisabled()
    await expect
      .element(screen.getByRole('button', { name: '提交作答' }))
      .toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '记录已阅读' }))
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'b', kind: 'read' }),
      expect.anything()
    )
  })
})
