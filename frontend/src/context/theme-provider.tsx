import { useEffect, type ReactNode } from 'react'
import { removeCookie } from '@/lib/cookies'

/** 统一使用深色模式，同时清理旧版本保存的主题偏好。 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light')
    root.classList.add('dark')
    removeCookie('vite-ui-theme')
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute('content', '#050816')
  }, [])

  return <>{children}</>
}
