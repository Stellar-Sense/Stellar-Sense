import { useAuthStore } from '@/stores/auth-store'
import { useAccount, useAvatar } from '@/features/settings/api'

export function useCurrentUser() {
  const authUser = useAuthStore((state) => state.auth.user)
  const { data: account } = useAccount()
  const { data: avatar } = useAvatar()

  return {
    name: account?.name || authUser?.email.split('@')[0] || '遥感学习者',
    email: authUser?.email ?? '',
    avatar: avatar?.dataUrl ?? '',
  }
}
