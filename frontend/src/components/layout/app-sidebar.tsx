import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { t, useLocale } from '@/lib/i18n'
import { useLayout } from '@/context/layout-provider'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  useLocale((state) => state.locale)

  const { collapsible, variant } = useLayout()
  const authUser = useAuthStore((state) => state.auth.user)
  const user = useCurrentUser()
  const isAdministrator = authUser?.role.includes('admin')
  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className='border-r border-white/10 bg-[#0b1020]/95 text-slate-100 backdrop-blur-xl'
    >
      <SidebarContent className='px-2 py-3 group-data-[collapsible=icon]:px-0'>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
        {isAdministrator && (
          <NavGroup
            title={t('管理员')}
            items={[
              {
                title: '知识星云管理',
                url: '/knowledge-management',
                icon: ShieldCheck,
              },
            ]}
          />
        )}
      </SidebarContent>
      <SidebarFooter className='border-t border-white/10 bg-transparent px-2 py-3 group-data-[collapsible=icon]:px-1'>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
