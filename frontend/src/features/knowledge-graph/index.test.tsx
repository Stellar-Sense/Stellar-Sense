import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { KnowledgeGraph } from './index'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('./api', () => ({
  useKnowledgeGraph: () => ({
    data: {
      nodes: [
        {
          id: 'Transformer',
          name: 'Transformer',
          domain: 'Transformer',
          status: 'unlearned',
          x: 80,
          y: 40,
          prerequisites: [],
          duration: '35 分钟',
          description: 'Transformer 是基于注意力机制的深度学习架构。',
          progress: 0,
        },
      ],
      edges: [],
      domainOrder: ['Transformer'],
    },
    isPending: false,
  }),
}))

// 三维星系依赖 WebGL，测试中替换为可点击的占位组件
vi.mock('./star-map-3d', async () => {
  const { createElement } = await import('react')
  return {
    default: ({ onSelectNode }: { onSelectNode: (nodeId: string) => void }) =>
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => onSelectNode('Transformer'),
        },
        'mock-planet'
      ),
  }
})

// 布局组件依赖侧边栏 / 搜索 / 主题 Provider，测试中替换为占位组件
vi.mock('@/components/layout/header', () => ({ Header: () => null }))
vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/search', () => ({ Search: () => null }))
vi.mock('@/components/profile-dropdown', () => ({ ProfileDropdown: () => null }))
vi.mock('@/components/theme-switch', () => ({ ThemeSwitch: () => null }))

describe('KnowledgeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('jumps to node learning with the selected node id when 开始学习 is clicked', async () => {
    const screen = await render(<KnowledgeGraph />)

    const planet = screen.getByRole('button', { name: 'mock-planet' })
    await expect.element(planet).toBeInTheDocument()
    await userEvent.click(planet)

    const startButton = screen.getByRole('button', { name: /开始学习/ })
    await expect.element(startButton).toBeInTheDocument()
    await userEvent.click(startButton)

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/node-learning',
      search: { nodeId: 'Transformer' },
    })
  })
})
