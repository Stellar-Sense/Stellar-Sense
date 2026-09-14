import type { ReactNode } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'

export const panelClass =
  'rounded-2xl border border-white/10 bg-slate-950/65 p-5'
export const selectClass =
  'h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:ring-2 focus:ring-sky-500'
export function LearningPage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <Header>
        <Search className='me-auto' />

        <ProfileDropdown />
      </Header>
      <Main className='space-y-6 text-slate-100'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='mb-2 text-xs tracking-[0.25em] text-sky-300'>
              STELLAR SENSE
            </p>
            <h1 className='text-2xl font-semibold'>{title}</h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-400'>
              {description}
            </p>
          </div>
          {actions}
        </div>
        {children}
      </Main>
    </>
  )
}
