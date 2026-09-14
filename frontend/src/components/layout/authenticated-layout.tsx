import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AccountLanguageSync } from '@/components/account-language-sync'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { CompanionPet } from '@/components/companion-pet'
import { SkipToMain } from '@/components/skip-to-main'
import { useAuthHydration } from '@/features/auth/api'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  // 刷新后依据 cookie 中的 token 恢复当前用户（401 会被全局拦截并跳转登录页）
  useAuthHydration()
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <SearchProvider>
      <AccountLanguageSync />
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              '@container/content',
              'min-h-svh flex-1 bg-transparent text-slate-50',
              'has-data-[layout=fixed]:h-svh',
              'md:peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh_-_1rem)]!',
              'md:peer-data-[variant=inset]:has-data-[layout=fixed]:min-h-0!'
            )}
          >
            {children ?? <Outlet />}
          </SidebarInset>
          <CompanionPet />
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
