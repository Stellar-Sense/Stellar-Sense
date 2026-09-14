import { renderWithQueryClient } from '@/test-utils/query-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { useLocale } from '@/lib/i18n'
import { SignUpForm } from './sign-up-form'

beforeEach(() => useLocale.getState().setLocale('en'))

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  confirmPasswordEmpty: 'Please confirm your password.',
  passwordMismatch: "Passwords don't match.",
} as const

const navigate = vi.fn()

const mocks = vi.hoisted(() => {
  let resolveRegister: ((value: unknown) => void) | undefined
  const post = vi.fn(
    () =>
      new Promise((resolve) => {
        resolveRegister = resolve
      })
  )
  return {
    post,
    resolveRegister: (value: unknown) => resolveRegister?.(value),
  }
})

vi.mock('@/lib/api-client', () => ({ apiClient: { post: mocks.post } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/stores/auth-store', () => {
  const state = {
    auth: {
      user: null,
      setUser: vi.fn(),
      accessToken: '',
      setAccessToken: vi.fn(),
      resetAccessToken: vi.fn(),
      reset: vi.fn(),
    },
  }
  const useAuthStore = (selector?: (value: typeof state) => unknown) =>
    selector ? selector(state) : state
  return { useAuthStore }
})
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

describe('SignUpForm', () => {
  let screen: RenderResult
  let emailInput: Locator
  let passwordInput: Locator
  let confirmPasswordInput: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()

    screen = await render(renderWithQueryClient(<SignUpForm />))
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    passwordInput = screen.getByLabelText(/^Password$/i)
    confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i)
    submitButton = screen.getByRole('button', { name: /^Next$/i })
  })

  it('renders fields and submit button', async () => {
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(passwordInput).toBeInTheDocument()
    await expect.element(confirmPasswordInput).toBeInTheDocument()
    await expect.element(submitButton).toBeInTheDocument()
  })

  it('shows validation messages when submitting empty form', async () => {
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.emailEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.confirmPasswordEmpty))
      .toBeInTheDocument()
  })

  it('shows a mismatch error when passwords do not match', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '1234567')
    await userEvent.fill(confirmPasswordInput, '7654321')

    await userEvent.click(submitButton)
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordMismatch))
      .toBeInTheDocument()
  })

  it('disables submit while submitting and re-enables after success', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '1234567')
    await userEvent.fill(confirmPasswordInput, '1234567')

    await userEvent.click(submitButton)
    expect(mocks.post).not.toHaveBeenCalled()
    const choose = async (name: string) =>
      screen.getByRole('button', { name, exact: true }).click()
    await choose('Geographic information systems')
    await choose('Next')
    for (const title of [
      'Remote sensing foundation',
      'Python foundation',
      'Machine learning foundation',
    ]) {
      await screen
        .getByRole('group', { name: title, exact: true })
        .getByRole('button', { name: 'Know some concepts', exact: true })
        .click()
    }
    await choose('Next')
    await choose('Build a foundation')
    await choose('Next')
    await choose('Remote sensing image processing')
    await choose('Next')
    await choose('Explain step by step')
    await choose('Next')
    await choose('30 minutes')
    await choose('Next')
    expect(mocks.post).not.toHaveBeenCalled()
    submitButton = screen.getByRole('button', {
      name: 'Create Account',
      exact: true,
    })
    await userEvent.click(submitButton)
    await expect
      .element(screen.getByRole('button', { name: 'Saving…', exact: true }))
      .toBeDisabled()
    expect(mocks.post).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({
        learnerProfile: {
          version: 1,
          selections: {
            backgrounds: ['gis'],
            remoteSensing: ['concepts'],
            python: ['concepts'],
            machineLearning: ['concepts'],
            goals: ['intro'],
            interests: ['imagery'],
            styles: ['steps'],
            time: ['30'],
          },
        },
      })
    )

    mocks.resolveRegister({
      data: {
        accountNo: 'ACC0002',
        email: 'a@b.com',
        role: ['user'],
        exp: 1893456000000,
        accessToken: 'mock-access-token',
      },
    })

    await expect.element(submitButton).toBeEnabled()
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
    )
  })
})
