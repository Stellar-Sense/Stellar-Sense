import { useId, useRef } from 'react'
import { toast } from 'sonner'
import { t, useLocale } from '@/lib/i18n'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { useAvatar, useUpdateAvatar } from '../api'

export function AvatarUpload() {
  useLocale((state) => state.locale)

  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const user = useCurrentUser()
  const avatar = useAvatar()
  const updateAvatar = useUpdateAvatar()
  const busy = updateAvatar.isPending || avatar.isPending

  function upload(file: File | undefined) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error(t('请选择 PNG、JPG 或 WebP 图片'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('头像图片不能超过 2 MB'))
      return
    }
    updateAvatar.mutate(file, {
      onSuccess: () => toast.success(t('头像已更新')),
    })
  }

  return (
    <section className='space-y-3' aria-label={t('个人头像')}>
      <label htmlFor={inputId} className='text-sm font-medium'>
        {t('头像')}
      </label>
      <div className='flex items-center gap-4'>
        <UserAvatar user={user} className='size-16 text-xl' />
        <div className='flex flex-wrap gap-2'>
          <input
            ref={input}
            id={inputId}
            type='file'
            accept='image/png,image/jpeg,image/webp'
            className='sr-only'
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              upload(file)
            }}
          />
          <Button
            type='button'
            variant='outline'
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {updateAvatar.isPending ? t('保存中…') : t('上传头像')}
          </Button>
          {user.avatar && (
            <Button
              type='button'
              variant='ghost'
              disabled={busy}
              onClick={() =>
                updateAvatar.mutate(null, {
                  onSuccess: () => toast.success(t('已恢复默认头像')),
                })
              }
            >
              {t('移除头像')}
            </Button>
          )}
        </div>
      </div>
      <p className='text-sm text-muted-foreground'>
        {t(
          '支持 PNG、JPG、WebP，最大 2 MB。头像将居中裁剪，以圆形显示，上传后自动保存。'
        )}
      </p>
    </section>
  )
}
