import { t, useLocale } from '@/lib/i18n'
import { Separator } from '@/components/ui/separator'
import { LearnerProfileEditor } from '@/features/learner-profile/profile-editor'
import { ProfileForm } from '../profile/profile-form'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  useLocale((state) => state.locale)

  return (
    <div className='faded-bottom min-h-0 flex-1 overflow-y-auto scroll-smooth pe-4 pb-12'>
      <div className='space-y-8 lg:max-w-xl'>
        <section
          aria-labelledby='account-profile-heading'
          className='space-y-4'
        >
          <h4 id='account-profile-heading' className='font-medium'>
            {t('个人资料与头像')}
          </h4>
          <ProfileForm />
        </section>
        <Separator />
        <LearnerProfileEditor />
        <Separator />
        <section
          aria-labelledby='account-settings-heading'
          className='space-y-4'
        >
          <h4 id='account-settings-heading' className='font-medium'>
            {t('账号设置')}
          </h4>
          <AccountForm />
        </section>
      </div>
    </div>
  )
}
