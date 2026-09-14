import { renderWithQueryClient } from '@/test-utils/query-client'
import { beforeEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { apiClient } from '@/lib/api-client'
import { useLocale } from '@/lib/i18n'
import { type Profile } from './catalog'
import { LearnerProfileEditor } from './profile-editor'

const initial: Profile = {
  version: 1,
  selections: {
    backgrounds: ['gis'],
    remoteSensing: ['practice'],
    python: ['concepts'],
    machineLearning: ['none'],
    goals: ['intro'],
    interests: ['imagery'],
    styles: ['steps'],
    time: ['30'],
  },
}
let stored: Profile | null = null
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ auth: { accessToken: 'profile-test' } }),
}))
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(async () => ({ data: { profile: stored } })),
    put: vi.fn(async (_url: string, value: Profile) => {
      stored = structuredClone(value)
      return { data: { profile: stored } }
    }),
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
  stored = structuredClone(initial)
  useLocale.getState().setLocale('zh')
})

it('edits one group, cancels without saving, enforces exclusivity, and restores saved choices on reload', async () => {
  let screen = await render(renderWithQueryClient(<LearnerProfileEditor />))
  await screen.getByRole('button', { name: '修改第 1 组' }).click()
  await screen
    .getByRole('button', { name: '计算机与人工智能', exact: true })
    .click()
  await expect
    .element(screen.getByRole('button', { name: '测绘工程', exact: true }))
    .toBeDisabled()
  await screen
    .getByRole('button', { name: '暂时没有相关背景', exact: true })
    .click()
  await expect
    .element(screen.getByRole('button', { name: '地理信息 GIS', exact: true }))
    .toHaveAttribute('aria-pressed', 'false')
  await screen.getByRole('button', { name: '取消', exact: true }).click()
  expect(apiClient.put).not.toHaveBeenCalled()
  await screen.getByRole('button', { name: '修改第 5 组' }).click()
  await screen
    .getByRole('button', { name: '结合代码实践', exact: true })
    .click()
  await screen.getByRole('button', { name: '保存画像', exact: true }).click()
  await expect
    .element(screen.getByRole('button', { name: '修改第 5 组' }))
    .toBeVisible()
  expect(stored?.selections.styles).toEqual(['steps', 'code'])
  expect(stored?.selections.backgrounds).toEqual(['gis'])
  await screen.unmount()
  screen = await render(renderWithQueryClient(<LearnerProfileEditor />))
  await expect
    .element(screen.getByText('结合代码实践', { exact: true }))
    .toBeVisible()
})

it('retains tag selections after a failed save and lets the user retry', async () => {
  vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Offline'))
  const screen = await render(renderWithQueryClient(<LearnerProfileEditor />))
  await screen.getByRole('button', { name: '修改第 6 组' }).click()
  await screen.getByRole('button', { name: '60 分钟', exact: true }).click()
  await screen.getByRole('button', { name: '保存画像', exact: true }).click()
  await expect.element(screen.getByRole('alert')).toHaveTextContent('保存失败')
  await expect
    .element(screen.getByRole('button', { name: '60 分钟', exact: true }))
    .toHaveAttribute('aria-pressed', 'true')
  expect(stored?.selections.time).toEqual(['30'])
  await screen.getByRole('button', { name: '保存画像', exact: true }).click()
  await expect
    .element(screen.getByRole('button', { name: '修改第 6 组' }))
    .toBeVisible()
  expect(stored?.selections.time).toEqual(['60'])
})

it('lets an existing account complete the six-round wizard with choices preserved when going back', async () => {
  stored = null
  const screen = await render(renderWithQueryClient(<LearnerProfileEditor />))
  const click = async (name: string) =>
    screen.getByRole('button', { name, exact: true }).click()
  await click('完善个人画像')
  await expect
    .element(screen.getByRole('button', { name: '下一步', exact: true }))
    .toBeDisabled()
  await click('其他专业')
  await click('下一步')
  await click('上一步')
  await expect
    .element(screen.getByRole('button', { name: '其他专业', exact: true }))
    .toHaveAttribute('aria-pressed', 'true')
  await click('下一步')
  for (const name of ['遥感基础', 'Python 基础', '机器学习基础']) {
    await screen
      .getByRole('group', { name, exact: true })
      .getByRole('button', { name: '不确定', exact: true })
      .click()
  }
  await click('下一步')
  await click('探索兴趣')
  await click('下一步')
  await click('还没想好')
  await click('下一步')
  await click('暂时没有偏好')
  await click('下一步')
  await click('暂不确定')
  await click('下一步')
  await click('保存画像')
  await expect
    .element(screen.getByRole('button', { name: '修改第 1 组' }))
    .toBeVisible()
  expect(stored).toEqual(
    expect.objectContaining({
      version: 1,
      selections: expect.objectContaining({
        backgrounds: ['other'],
        time: ['unsure'],
      }),
    })
  )
})
