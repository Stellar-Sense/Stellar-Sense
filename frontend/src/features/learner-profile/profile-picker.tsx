import { useState } from 'react'
import { Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  catalog,
  validGroup,
  toggleTag,
  type Group,
  type Profile,
} from './catalog'

export function TagGroup({
  group,
  value,
  onChange,
  disabled = false,
}: {
  group: Group
  value: Profile
  onChange: (value: Profile) => void
  disabled?: boolean
}) {
  const en = useLocale((state) => state.locale) === 'en'
  const selected = value.selections[group.id] ?? []
  return (
    <fieldset disabled={disabled} className='space-y-3'>
      <legend className='mb-2 text-sm font-medium'>
        {en ? group.en : group.title}
      </legend>
      <p className='text-xs text-muted-foreground'>
        {group.max === 1
          ? en
            ? 'Choose one'
            : '单选'
          : en
            ? `Choose 1–${group.max}`
            : `选择 1～${group.max} 项`}
      </p>
      <div className='flex flex-wrap gap-2'>
        {group.options.map((option) => {
          const checked = selected.includes(option.id)
          const atLimit =
            !checked &&
            group.max > 1 &&
            selected.length >= group.max &&
            option.id !== group.exclusive
          return (
            <button
              key={option.id}
              type='button'
              aria-pressed={checked}
              disabled={disabled || atLimit}
              onClick={() => onChange(toggleTag(value, group, option.id))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'border-sky-400 bg-sky-400/15 text-sky-100' : 'border-white/15 bg-slate-900 text-slate-300 hover:border-sky-400/60'}`}
            >
              {checked && (
                <Check className='size-3.5 shrink-0' aria-hidden='true' />
              )}
              {en ? option.en : option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function ProfileSummary({
  value,
  onEdit,
  disabled = false,
}: {
  value: Profile
  onEdit?: (step: number) => void
  disabled?: boolean
}) {
  const en = useLocale((state) => state.locale) === 'en'
  return (
    <div className='space-y-4'>
      {catalog.steps.map((ids, step) => (
        <div key={step} className='rounded-xl border border-white/10 p-3'>
          {ids.map((id) => {
            const group = catalog.groups.find((item) => item.id === id)!
            return (
              <div key={id} className='mb-2 last:mb-0'>
                <p className='mb-2 text-xs text-muted-foreground'>
                  {en ? group.en : group.title}
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {group.options
                    .filter((option) =>
                      value.selections[id]?.includes(option.id)
                    )
                    .map((option) => (
                      <span
                        key={option.id}
                        className='rounded-full bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200'
                      >
                        {en ? option.en : option.label}
                      </span>
                    ))}
                </div>
              </div>
            )
          })}
          {onEdit && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              disabled={disabled}
              onClick={() => onEdit(step)}
              aria-label={
                en ? `Edit step ${step + 1}` : `修改第 ${step + 1} 组`
              }
            >
              {en ? 'Edit' : '修改'}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

export function ProfileWizard({
  value,
  onChange,
  onComplete,
  onBack,
  pending = false,
  submitLabel,
}: {
  value: Profile
  onChange: (value: Profile) => void
  onComplete: () => void
  onBack?: () => void
  pending?: boolean
  submitLabel?: string
}) {
  const en = useLocale((state) => state.locale) === 'en'
  const [step, setStep] = useState(0)
  const review = step === catalog.steps.length
  const groups = review
    ? []
    : catalog.steps[step].map(
        (id) => catalog.groups.find((group) => group.id === id)!
      )
  const valid = groups.every((group) => validGroup(value, group))
  return (
    <div className='space-y-5'>
      <div aria-live='polite'>
        <p className='text-xs text-sky-300'>
          {en ? 'Personal profile' : '个人画像'} ·{' '}
          {review ? (en ? 'Review' : '确认选择') : `${step + 1}/6`}
        </p>
        <p className='mt-2 font-medium'>
          {review
            ? en
              ? 'Ready to start learning?'
              : '确认你的学习画像'
            : en
              ? groups[0].promptEn
              : groups[0].prompt}
        </p>
      </div>
      <div className='flex gap-1.5' aria-hidden='true'>
        {catalog.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-sky-400' : 'bg-white/10'}`}
          />
        ))}
      </div>
      {review ? (
        <ProfileSummary value={value} onEdit={setStep} disabled={pending} />
      ) : (
        groups.map((group) => (
          <TagGroup
            key={group.id}
            group={group}
            value={value}
            onChange={onChange}
            disabled={pending}
          />
        ))
      )}
      <div className='flex items-center justify-between gap-3'>
        <Button
          type='button'
          variant='outline'
          disabled={pending || (step === 0 && !onBack)}
          onClick={() => (step === 0 ? onBack?.() : setStep(step - 1))}
        >
          <ArrowLeft className='size-4' />
          {en ? 'Back' : '上一步'}
        </Button>
        {review ? (
          <Button type='button' disabled={pending} onClick={onComplete}>
            {pending
              ? en
                ? 'Saving…'
                : '保存中…'
              : (submitLabel ?? (en ? 'Save profile' : '保存画像'))}
          </Button>
        ) : (
          <Button
            type='button'
            disabled={!valid || pending}
            onClick={() => setStep(step + 1)}
          >
            {en ? 'Next' : '下一步'}
            <ArrowRight className='size-4' />
          </Button>
        )}
      </div>
    </div>
  )
}
