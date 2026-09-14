import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { t, useLocale } from '@/lib/i18n'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLogout } from '@/features/auth/api'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()
  const logout = useLogout()

  const handleSignOut = () => {
    // 通知服务端（JWT 无状态，失败也不阻塞本地登出）
    logout.mutate(undefined, { onSettled: () => undefined })
    auth.reset()
    // Preserve current location for redirect after sign-in
    const currentPath = location.href
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Sign out')}
      desc={t(
        'Are you sure you want to sign out? You will need to sign in again to access your account.'
      )}
      confirmText={t('Sign out')}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
