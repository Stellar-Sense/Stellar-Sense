import { Outlet } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'

export function Settings() {
  return (
    <>
      <Header>
        <Search className='me-auto' />

        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='flex min-h-0 flex-1 overflow-y-hidden p-1'>
          <Outlet />
        </div>
      </Main>
    </>
  )
}
