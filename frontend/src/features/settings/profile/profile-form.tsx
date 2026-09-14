import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { t, useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useProfile, useUpdateProfile } from '../api'
import { AvatarUpload } from './avatar-upload'

const profileFormSchema = z.object({
  username: z
    .string('Please enter your username.')
    .min(2, 'Username must be at least 2 characters.')
    .max(30, 'Username must not be longer than 30 characters.'),
  email: z.email({
    error: (iss) =>
      iss.input === undefined
        ? 'Please select an email to display.'
        : undefined,
  }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const emptyValues: Partial<ProfileFormValues> = {
  username: '',
  email: '',
}

export function ProfileForm() {
  useLocale((state) => state.locale)

  const { data } = useProfile()
  const updateProfile = useUpdateProfile()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: emptyValues,
    mode: 'onChange',
  })

  useEffect(() => {
    if (data) {
      form.reset({
        username: data.username,
        email: data.email,
      })
    }
  }, [data, form])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          updateProfile.mutate(
            { ...values, bio: data?.bio ?? '', urls: data?.urls ?? [] },
            {
              onSuccess: () => toast.success(t('个人资料已更新')),
            }
          )
        )}
        className='space-y-8'
      >
        <AvatarUpload />
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Username')}</FormLabel>
              <FormControl>
                <Input placeholder={t('Enter your username')} {...field} />
              </FormControl>
              <FormDescription>
                {t('用于个人资料展示，可以填写真实姓名或昵称。')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Email')}</FormLabel>
              <FormControl>
                <Input disabled {...field} />
              </FormControl>
              <FormDescription>
                {t('邮箱来自你的账号，当前暂不支持在个人资料中修改。')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>{t('Update profile')}</Button>
      </form>
    </Form>
  )
}
