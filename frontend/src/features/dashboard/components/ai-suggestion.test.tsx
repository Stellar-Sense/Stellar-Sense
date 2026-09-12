import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { AiSuggestion } from './ai-suggestion'

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

describe('AiSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('jumps to node learning when 开始学习 is clicked', async () => {
    const screen = await render(
      <AiSuggestion
        suggestion={{ topic: 'Transformer 注意力机制', estimate: '预计 40 分钟' }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /开始学习/ }))

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/node-learning' })
  })
})
