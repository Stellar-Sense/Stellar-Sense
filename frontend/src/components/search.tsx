import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

export function Search({
  className = '',
  placeholder = 'Search',
  ...props
}: React.ComponentProps<'button'> & { placeholder?: string }) {
  const { setOpen } = useSearch()
  return (
    <Button
      {...props}
      variant='outline'
      className={cn(
        'group relative h-9 w-full flex-1 justify-start rounded-xl border border-white/10 bg-slate-900/70 text-sm font-normal text-slate-300 shadow-none hover:border-sky-400/30 hover:bg-slate-800/80 sm:w-40 sm:pe-12 md:flex-none lg:w-52 xl:w-64',
        className
      )}
      aria-keyshortcuts='Meta+K Control+K'
      onClick={() => setOpen(true)}
    >
      <SearchIcon
        aria-hidden='true'
        className='absolute inset-s-1.5 top-1/2 -translate-y-1/2 text-slate-400'
        size={16}
      />
      <span className='ms-4'>{placeholder}</span>
      <kbd className='pointer-events-none absolute inset-e-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border border-white/10 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-300 opacity-100 select-none group-hover:border-sky-400/30 sm:flex'>
        <span className='text-xs'>⌘</span>K
      </kbd>
    </Button>
  )
}
