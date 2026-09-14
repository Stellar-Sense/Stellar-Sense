import { useState } from 'react'
import { toast } from 'sonner'
import { useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { useLearnerProfile, useSaveLearnerProfile } from './api'
import {
  catalog,
  completeProfile,
  copyProfile,
  emptyProfile,
  type Profile,
} from './catalog'
import { ProfileSummary, ProfileWizard, TagGroup } from './profile-picker'

export function LearnerProfileEditor() {
  const en = useLocale((state) => state.locale) === 'en'
  const query = useLearnerProfile()
  const save = useSaveLearnerProfile()
  const [draft, setDraft] = useState<Profile | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const profile = query.data?.profile
  const submit = () => {
    if (!draft || !completeProfile(draft)) return
    save.mutate(draft, {
      onSuccess: () => {
        setDraft(null)
        setEditing(null)
        toast.success(en ? 'Personal profile updated' : '个人画像已更新')
      },
    })
  }
  return (
    <section className='space-y-4' aria-labelledby='learner-profile-heading'>
      <div>
        <h4 id='learner-profile-heading' className='font-medium'>
          {en ? 'Personal profile' : '个人画像'}
        </h4>
        <p className='mt-2 text-sm text-muted-foreground'>
          {en
            ? 'Share your learning interests and background. The system will use your personal profile to provide personalized guidance.'
            : '简单介绍你的学习兴趣或专业背景，系统将会根据你的个人画像提供个性化指导'}
        </p>
      </div>
      {query.isPending ? (
        <p>{en ? 'Loading…' : '加载中…'}</p>
      ) : query.isError ? (
        <Button
          type='button'
          variant='outline'
          onClick={() => void query.refetch()}
        >
          {en ? 'Retry loading profile' : '重新加载画像'}
        </Button>
      ) : draft ? (
        <>
          {profile && editing !== null ? (
            <>
              {catalog.steps[editing].map((id) => (
                <TagGroup
                  key={id}
                  group={catalog.groups.find((group) => group.id === id)!}
                  value={draft}
                  onChange={setDraft}
                  disabled={save.isPending}
                />
              ))}
              <Button
                type='button'
                disabled={save.isPending || !completeProfile(draft)}
                onClick={submit}
              >
                {save.isPending
                  ? en
                    ? 'Saving…'
                    : '保存中…'
                  : en
                    ? 'Save profile'
                    : '保存画像'}
              </Button>
            </>
          ) : (
            <ProfileWizard
              value={draft}
              onChange={setDraft}
              onComplete={submit}
              pending={save.isPending}
            />
          )}
          <Button
            type='button'
            variant='ghost'
            disabled={save.isPending}
            onClick={() => {
              setDraft(null)
              setEditing(null)
              save.reset()
            }}
          >
            {en ? 'Cancel' : '取消'}
          </Button>
          {save.isError && (
            <p role='alert' className='text-sm text-destructive'>
              {en
                ? 'Save failed. Your choices are retained; please retry.'
                : '保存失败，已保留你的选择，请重试。'}
            </p>
          )}
        </>
      ) : profile ? (
        <ProfileSummary
          value={profile}
          onEdit={(step) => {
            setDraft(copyProfile(profile))
            setEditing(step)
            save.reset()
          }}
        />
      ) : (
        <Button
          type='button'
          variant='outline'
          onClick={() => setDraft(emptyProfile())}
        >
          {en ? 'Complete personal profile' : '完善个人画像'}
        </Button>
      )}
    </section>
  )
}
