import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const isAdministrator = useAuthStore((state) =>
    state.auth.user?.role.includes('admin')
  )
  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className='border-r border-white/10 bg-[#0b1020]/95 text-slate-100 backdrop-blur-xl'
    >
      <SidebarHeader className='border-b border-white/10 bg-transparent px-3 py-3'>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent className='px-2 py-3'>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
        {isAdministrator && (
          <NavGroup
            title='管理员'
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
      <SidebarFooter className='border-t border-white/10 bg-transparent px-2 py-3'>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
