import { useEffect } from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'

export interface AuthUser {
  accountNo: string
  email: string
  role: string[]
  exp: number
}

export interface AuthResponse extends AuthUser {
  accessToken: string
}

/** 登录：成功后写入全局 auth store（token 持久化在 cookie） */
export function useLogin() {
  const setUser = useAuthStore((state) => state.auth.setUser)
  const setAccessToken = useAuthStore((state) => state.auth.setAccessToken)
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
      return data
    },
    onSuccess: (data) => {
      setUser({
        accountNo: data.accountNo,
        email: data.email,
        role: data.role,
        exp: data.exp,
      })
      setAccessToken(data.accessToken)
    },
  })
}

/** 注册：注册成功即自动登录 */
export function useRegister() {
  const setUser = useAuthStore((state) => state.auth.setUser)
  const setAccessToken = useAuthStore((state) => state.auth.setAccessToken)
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
      return data
    },
    onSuccess: (data) => {
      setUser({
        accountNo: data.accountNo,
        email: data.email,
        role: data.role,
        exp: data.exp,
      })
      setAccessToken(data.accessToken)
    },
  })
}

/** 找回密码：请求验证码（开发模式下后端会返回 devCode 便于联调） */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await apiClient.post<{ ok: boolean; devCode?: string | null }>(
        '/auth/forgot-password',
        { email }
      )
      return data
    },
  })
}

/** 校验 OTP 验证码 */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: { email?: string; code: string }) => {
      const { data } = await apiClient.post<{ ok: boolean }>('/auth/verify-otp', payload)
      return data
    },
  })
}

/** 登出（JWT 无状态，主要清理本地会话） */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
  })
}

/** 刷新页面后依据本地 token 恢复用户信息；401 由全局拦截统一处理 */
export function useAuthHydration() {
  const token = useAuthStore((state) => state.auth.accessToken)
  const user = useAuthStore((state) => state.auth.user)
  const setUser = useAuthStore((state) => state.auth.setUser)
  const { data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await apiClient.get<AuthUser>('/auth/me')).data,
    enabled: Boolean(token),
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    // 注意：依赖里不能放整个 store 对象（setUser 会改变其引用导致无限循环）
    if (data && !user) {
      setUser(data)
    }
  }, [data, user, setUser])
}
