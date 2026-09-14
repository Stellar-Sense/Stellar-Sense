import { QueryClientProvider } from '@tanstack/react-query'
import '@/styles/index.css'
import { createTestQueryClient } from '@/test-utils/query-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import type { ChatStreamBody, ChatStreamHandlers } from '@/lib/chat-stream'
import { NodeLearning } from './index'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  streamChat: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => ({ nodeId: '遥感概论', stage: 'feedback' }),
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
  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.classList.remove('light', 'dark')
  })

  it.each(['dark'])(
    'keeps assessment, companion, and V2 stage interactions working in %s mode',
    async (theme) => {
      document.documentElement.classList.add(theme)
      await page.viewport(1440, 1100)
      const scroll = vi
        .spyOn(Element.prototype, 'scrollIntoView')
        .mockImplementation(() => {})
      const queryClient = createTestQueryClient()
      queryClient.setDefaultOptions({
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      })
      queryClient.setQueryData(['learning', 'nodes'], {
        currentNodeId: '遥感概论',
        sequence: ['遥感概论', '电磁波与遥感'],
        groups: [
          {
            group: '基础',
            items: [
              { id: '遥感概论', label: '遥感概论', status: 'current' },
              {
                id: '电磁波与遥感',
                label: '电磁波与遥感',
                status: 'todo',
              },
            ],
          },
        ],
      })
      queryClient.setQueryData(['learning', 'node', '遥感概论'], {
        id: '遥感概论',
        title: '遥感概论',
        breadcrumb: '基础 / 遥感概论',
        summary: '学习摘要',
        progress: 0,
        duration: '20 分钟',
        objectives: [],
        methods: [],
        concept: '基本概念',
        caseTitle: '遥感案例',
        caseSummary: '案例说明',
        explanation: '节点讲解',
        status: 'current',
      })
      queryClient.setQueryData(['learning', 'tasks', '遥感概论'], {
        tasks: [],
        state: { mastery: 0, confidence: 0, evidenceCount: 0 },
        blockers: [],
        blockerNames: [],
      })
      queryClient.setQueryData(['learning', 'events', '遥感概论'], [])
      const screen = await render(
        <QueryClientProvider client={queryClient}>
          <NodeLearning />
        </QueryClientProvider>
      )
      await userEvent.selectOptions(
        screen.getByRole('combobox', { name: '讲解深度' }),
        'advanced'
      )
      await userEvent.click(
        screen.getByRole('button', { name: '帮我总结这节课学了什么' })
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

      await page.screenshot({
        path: `node_modules/.cache/node-learning-${theme}.png`,
      })

      await userEvent.click(
        screen.getByRole('button', { name: '查看真实评价与掌握证据' })
      )
      expect(scroll).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
      const target = scroll.mock.contexts[
        scroll.mock.contexts.length - 1
      ] as Element
      expect(target.querySelector('[aria-label="节点学习评价"]')).not.toBeNull()

      await userEvent.click(
        screen.getByRole('button', { name: '在完整助手中继续' })
      )
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/ai-assistant',
        search: { conversationId: 'conversation-1' },
      })
      await userEvent.click(screen.getByRole('button', { name: '下一个节点' }))
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/node-learning',
        search: { nodeId: '电磁波与遥感', stage: 'material' },
      })
    }
  )
})
