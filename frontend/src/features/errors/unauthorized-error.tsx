import { useNavigate, useRouter } from '@tanstack/react-router'
import { t, useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export function UnauthorisedError() {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>401</h1>
        <span className='font-medium'>{t('Unauthorized Access')}</span>
        <p className='text-center text-muted-foreground'>
          {t('Please log in with the appropriate credentials')}
          <br />
          {t('to access this resource.')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('Go Back')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>
            {t('Back to Home')}
          </Button>
        </div>
      </div>
    </div>
  )
}
