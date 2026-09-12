import axios from 'axios'

import { useAuthStore } from '@/stores/auth-store'

/**
 * 全局 axios 实例。
 * 开发环境经 Vite 代理（/api → http://127.0.0.1:8000），生产环境可用 VITE_API_URL 覆盖。
 * 请求自动附带 Bearer Token；错误响应契约 { title } 由 handleServerError 统一 toast。
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
