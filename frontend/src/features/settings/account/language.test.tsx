import { renderWithQueryClient } from '@/test-utils/query-client'
import { beforeEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { apiClient } from '@/lib/api-client'
import { getCookie, removeCookie } from '@/lib/cookies'
import { useLocale } from '@/lib/i18n'
import { FontProvider } from '@/context/font-provider'
import { AccountLanguageSync } from '@/components/account-language-sync'
import { SettingsAccount } from './index'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({
      auth: {
        user: { email: 'learner@example.test' },
        accessToken: 'language-test',
      },
    }),
}))

let account = { name: 'Learner', dob: null, language: 'zh' }
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(async (url: string) => ({
      data:
        url === '/user/account'
          ? account
          : url === '/user/avatar'
            ? { dataUrl: null }
            : {
                username: 'Learner',
                email: 'learner@example.test',
                bio: 'Original bio',
                urls: [],
              },
    })),
    put: vi.fn(async (_url: string, payload: typeof account) => {
      account = payload
      return { data: payload }
    }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  removeCookie('font')
  account = { name: 'Learner', dob: null, language: 'zh' }
  useLocale.getState().setLocale('zh')
})

function Screen() {
  return (
    <FontProvider>
      <AccountLanguageSync />
      <SettingsAccount />
    </FontProvider>
  )
}

it('offers only Chinese and English, switches after saving, preserves profile drafts and restores on reload', async () => {
  let screen = await render(renderWithQueryClient(<Screen />))
  await expect
    .element(screen.getByRole('combobox', { name: '语言', exact: true }))
    .toBeVisible()
  await screen
    .getByRole('textbox', { name: '用户名', exact: true })
    .fill('Unsaved nickname')
  await screen.getByRole('combobox', { name: '语言', exact: true }).click()
  expect(screen.getByRole('option').all()).toHaveLength(2)
  await screen.getByRole('option', { name: 'English', exact: true }).click()
  await screen.getByRole('combobox', { name: '字体', exact: true }).click()
  await screen.getByRole('option', { name: 'manrope', exact: true }).click()
  await screen.getByRole('button', { name: '保存账号设置' }).click()
  await expect
    .element(screen.getByRole('combobox', { name: 'Language', exact: true }))
    .toBeVisible()
  await expect
    .element(screen.getByRole('textbox', { name: 'Username', exact: true }))
    .toHaveValue('Unsaved nickname')
  expect(apiClient.put).toHaveBeenCalledWith('/user/account', {
    name: 'Learner',
    dob: null,
    language: 'en',
  })
  expect(document.documentElement.lang).toBe('en')
  await expect.poll(() => getCookie('font')).toBe('manrope')
  expect(document.documentElement.classList.contains('font-manrope')).toBe(true)
  await screen.unmount()
  useLocale.getState().setLocale('zh')
  screen = await render(renderWithQueryClient(<Screen />))
  await expect
    .element(screen.getByRole('combobox', { name: 'Font', exact: true }))
    .toHaveTextContent('manrope')
  await expect
    .element(screen.getByRole('combobox', { name: 'Language', exact: true }))
    .toBeVisible()
  await screen.getByRole('combobox', { name: 'Language', exact: true }).click()
  await screen.getByRole('option', { name: '中文', exact: true }).click()
  await screen.getByRole('button', { name: 'Update account' }).click()
  await expect
    .element(screen.getByRole('combobox', { name: '语言', exact: true }))
    .toBeVisible()
})

it('keeps the current language and entered values if saving fails', async () => {
  vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Save failed'))
  const screen = await render(renderWithQueryClient(<Screen />))
  await screen.getByRole('combobox', { name: '语言', exact: true }).click()
  await screen.getByRole('option', { name: 'English', exact: true }).click()
  await screen.getByRole('combobox', { name: '字体', exact: true }).click()
  await screen.getByRole('option', { name: 'manrope', exact: true }).click()
  await screen.getByRole('button', { name: '保存账号设置' }).click()
  await expect.poll(() => vi.mocked(apiClient.put).mock.calls.length).toBe(1)
  expect(useLocale.getState().locale).toBe('zh')
  expect(getCookie('font')).toBeUndefined()
  expect(document.documentElement.classList.contains('font-inter')).toBe(true)
  await expect
    .element(screen.getByRole('combobox', { name: '语言', exact: true }))
    .toBeVisible()
  await expect
    .element(screen.getByRole('combobox', { name: '语言', exact: true }))
    .toHaveTextContent('English')
})
