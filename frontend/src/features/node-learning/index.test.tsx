import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { ChatStreamBody, ChatStreamHandlers } from '@/lib/chat-stream'
import { NodeLearning } from './index'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  streamChat: vi.fn(),
  completeNode: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => ({ nodeId: '遥感概论' }),
}))
vi.mock('@/lib/chat-stream', () => ({ streamChat: mocks.streamChat }))
vi.mock('./api', () => ({
  useLearningNodes: () => ({
    data: {
      currentNodeId: '遥感概论',
      sequence: ['遥感概论', '电磁波与遥感'],
      groups: [
        {
          group: '基础',
          items: [
            { id: '遥感概论', label: '遥感概论', status: 'current' },
            { id: '电磁波与遥感', label: '电磁波与遥感', status: 'todo' },
          ],
        },
      ],
    },
  }),
  useLearningNode: (nodeId: string) => ({
    data: {
      id: nodeId,
      title: nodeId,
      breadcrumb: `基础 / ${nodeId}`,
      summary: '学习摘要',
      progress: 0,
      duration: '20 分钟',
      objectives: [],
      methods: [],
      concept: '基本概念',
      caseTitle: '遥感案例',
      caseSummary: '案例说明',
    },
  }),
  useExplainNode: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteNode: () => ({ mutate: mocks.completeNode }),
}))
vi.mock('./assessment', () => ({
  NodeAssessment: ({ nodeId }: { nodeId: string }) => (
    <section aria-label={`学习评价：${nodeId}`}>评价任务</section>
  ),
}))
vi.mock('@/components/layout/header', () => ({ Header: () => null }))
vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/search', () => ({ Search: () => null }))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => null,
}))
vi.mock('@/components/theme-switch', () => ({ ThemeSwitch: () => null }))

describe('node learning integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.streamChat.mockImplementation(
      async (_body: ChatStreamBody, handlers: ChatStreamHandlers) => {
        handlers.onDelta('本次回答来自课程摘要。')
        handlers.onDone?.({
          messageId: 101,
          conversationId: 'conversation-1',
          title: '遥感概论',
          metadata: {
            mode: 'generated',
            references: [
              {
                chunkId: 'KP_0.1',
                text: '遥感定义',
                sourceDocument: '课程大纲',
                locator: '0.1 遥感定义',
                evidenceKind: 'summary',
              },
            ],
          },
        })
      }
    )
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps assessment navigation, source evidence and conversation continuation together', async () => {
    const scroll = vi
      .spyOn(Element.prototype, 'scrollIntoView')
      .mockImplementation(() => {})
    const screen = await render(<NodeLearning />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '讲解深度' }),
      'advanced'
    )
    await userEvent.click(
      screen.getByRole('button', { name: '这个我没懂，能简单解释一下吗？' })
    )
    expect(mocks.streamChat).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          nodeId: '遥感概论',
          learnerLevel: 'advanced',
        }),
      }),
      expect.any(Object)
    )
    await expect
      .element(screen.getByText('小遇 · 依据资料生成'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('资料：0.1 遥感定义'))
      .toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '进入学习评价' }))
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    const target = scroll.mock.contexts[
      scroll.mock.contexts.length - 1
    ] as Element
    expect(
      target.querySelector('[aria-label="学习评价：遥感概论"]')
    ).not.toBeNull()
    expect(mocks.completeNode).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', { name: '在完整助手中继续' })
    )
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/ai-assistant',
      search: { conversationId: 'conversation-1' },
    })
    await userEvent.click(screen.getByRole('button', { name: '下一个节点' }))
    await expect
      .element(screen.getByRole('region', { name: '学习评价：电磁波与遥感' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: '在完整助手中继续' }))
      .not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: '这个我没懂，能简单解释一下吗？' })
    )
    expect(mocks.streamChat).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conversationId: undefined,
        context: expect.objectContaining({ nodeId: '电磁波与遥感' }),
      }),
      expect.any(Object)
    )
  })
})
