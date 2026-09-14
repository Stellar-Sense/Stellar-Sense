import { useState } from 'react'
import { t, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type UserAvatarProps = {
  user: { name: string; avatar: string }
  className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  useLocale((state) => state.locale)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const fallback =
    Array.from(user.name.trim()).slice(0, 2).join('').toUpperCase() || '用户'

  return (
    <span
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium',
        className
      )}
    >
      {user.avatar && failedSource !== user.avatar ? (
        <img
          src={user.avatar}
          alt={t('{0}的头像', user.name)}
          className='size-full object-cover'
          onError={() => setFailedSource(user.avatar)}
        />
      ) : (
        <span role='img' aria-label={t('{0}的默认头像', user.name)}>
          {fallback}
        </span>
      )}
    </span>
  )
}
