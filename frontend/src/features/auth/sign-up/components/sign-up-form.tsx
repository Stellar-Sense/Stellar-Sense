import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { t, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { useRegister } from '@/features/auth/api'
import {
  emptyProfile,
  completeProfile,
} from '@/features/learner-profile/catalog'
import { ProfileWizard } from '@/features/learner-profile/profile-picker'

const formSchema = z
  .object({
    email: z.email({
      error: (iss) =>
        iss.input === '' ? 'Please enter your email.' : undefined,
    }),
    password: z
      .string()
      .min(1, 'Please enter your password.')
      .min(7, 'Password must be at least 7 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  useLocale((state) => state.locale)

  const register = useRegister()
  const isLoading = register.isPending
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)
  const [profile, setProfile] = useState(emptyProfile)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (!completeProfile(profile)) return
    register.mutate(
      { email: data.email, password: data.password, learnerProfile: profile },
      {
        onSuccess: (result) => {
          toast.success(t('账号创建成功：{0}', result.email))
          navigate({ to: '/', replace: true })
        },
      }
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!choosing) void form.handleSubmit(() => setChoosing(true))(event)
        }}
        className={cn('grid gap-3', className)}
        {...props}
      >
        {!choosing && (
          <>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Email')}</FormLabel>
                  <FormControl>
                    <Input placeholder='name@example.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Password')}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Confirm Password')}</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='********' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className='mt-2' disabled={isLoading}>
              {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
              {t('下一步')}
            </Button>
          </>
        )}
        {choosing && (
          <ProfileWizard
            value={profile}
            onChange={setProfile}
            onBack={() => setChoosing(false)}
            onComplete={() => onSubmit(form.getValues())}
            pending={isLoading}
            submitLabel={t('Create Account')}
          />
        )}
        {register.isError && (
          <p role='alert' className='text-sm text-destructive'>
            {t('注册未完成，请检查邮箱或网络后重试。已保留你的标签选择。')}
          </p>
        )}
      </form>
    </Form>
  )
}
