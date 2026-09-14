import { renderWithQueryClient } from '@/test-utils/query-client'
import { beforeEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { apiClient } from '@/lib/api-client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { SidebarProvider } from '@/components/ui/sidebar'
import { NavUser } from '@/components/layout/nav-user'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { AvatarUpload } from './avatar-upload'

let savedAvatar: string | null = null

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(async (url: string) => ({
      data:
        url === '/user/avatar'
          ? { dataUrl: savedAvatar }
          : { name: '林遥', dob: null, language: 'zh' },
    })),
    put: vi.fn(),
    delete: vi.fn(async () => {
      savedAvatar = null
      return { data: { dataUrl: null } }
    }),
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: { email: 'user1@example.test' },
        accessToken: 'avatar-test',
      },
    }),
}))

vi.mock('@/components/sign-out-dialog', () => ({ SignOutDialog: () => null }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

function Harness() {
  const user = useCurrentUser()
  return (
    <SidebarProvider>
      <NavUser user={user} />
      <ProfileDropdown />
      <AvatarUpload />
    </SidebarProvider>
  )
}

function pngDataUrl() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 4
  const context = canvas.getContext('2d')!
  context.fillStyle = 'blue'
  context.fillRect(0, 0, 4, 4)
  return canvas.toDataURL('image/png')
}

beforeEach(() => {
  vi.clearAllMocks()
  savedAvatar = null
  vi.mocked(apiClient.put).mockImplementation(async () => {
    savedAvatar = pngDataUrl()
    return { data: { dataUrl: savedAvatar } }
  })
})

it('syncs uploaded and removed avatars across the card, open menu and settings, including a fresh load', async () => {
  let screen = await render(renderWithQueryClient(<Harness />))
  await expect
    .poll(
      () => screen.getByRole('img', { name: '林遥的默认头像' }).all().length
    )
    .toBe(3)
  await screen.getByRole('button', { name: /user1@example.test/ }).click()
  await expect
    .poll(
      () =>
        screen
          .getByRole('img', { name: '林遥的默认头像', includeHidden: true })
          .all().length
    )
    .toBe(4)
  await expect
    .element(screen.getByRole('menuitem', { name: '账号', exact: true }))
    .toHaveAttribute('href', '/settings/account')
  await userEvent.keyboard('{Escape}')

  const file = new File(
    [await (await fetch(pngDataUrl())).blob()],
    'avatar.png',
    { type: 'image/png' }
  )
  await screen.getByLabelText('头像', { exact: true }).upload(file)
  await expect
    .poll(
      () =>
        screen.getByRole('img', { name: '林遥的头像', exact: true }).all()
          .length
    )
    .toBe(3)
  expect(apiClient.put).toHaveBeenCalledWith('/user/avatar', expect.any(File), {
    headers: { 'Content-Type': 'image/png' },
  })
  await screen.getByRole('button', { name: /user1@example.test/ }).click()
  const images = screen.getByRole('img', {
    name: '林遥的头像',
    exact: true,
    includeHidden: true,
  })
  await expect.poll(() => images.all().length).toBe(4)
  for (const image of images.all()) {
    await expect.element(image).toHaveAttribute('src', savedAvatar!)
  }
  await userEvent.keyboard('{Escape}')
  await screen.unmount()

  screen = await render(renderWithQueryClient(<Harness />))
  await expect
    .poll(
      () =>
        screen.getByRole('img', { name: '林遥的头像', exact: true }).all()
          .length
    )
    .toBe(3)
  await screen.getByRole('button', { name: '移除头像' }).click()
  await expect
    .poll(
      () => screen.getByRole('img', { name: '林遥的默认头像' }).all().length
    )
    .toBe(3)
  expect(apiClient.delete).toHaveBeenCalledWith('/user/avatar')
})

it('keeps the existing avatar when the upload fails', async () => {
  savedAvatar = pngDataUrl()
  vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Upload failed'))
  const screen = await render(renderWithQueryClient(<Harness />))
  await expect
    .element(screen.getByRole('button', { name: '上传头像' }))
    .toBeEnabled()
  await screen
    .getByLabelText('头像', { exact: true })
    .upload(new File(['invalid'], 'broken.png', { type: 'image/png' }))
  await expect.poll(() => vi.mocked(apiClient.put).mock.calls.length).toBe(1)
  await expect
    .element(screen.getByRole('button', { name: '上传头像' }))
    .toBeEnabled()
  expect(
    screen.getByRole('img', { name: '林遥的头像', exact: true }).all()
  ).toHaveLength(3)
})

it('rejects files above 2 MB before sending an upload', async () => {
  const screen = await render(renderWithQueryClient(<Harness />))
  await expect
    .element(screen.getByRole('button', { name: '上传头像' }))
    .toBeEnabled()
  const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
    type: 'image/png',
  })
  await screen.getByLabelText('头像', { exact: true }).upload(file)
  expect(apiClient.put).not.toHaveBeenCalled()
  expect(
    screen.getByRole('img', { name: '林遥的默认头像' }).all()
  ).toHaveLength(3)
})
