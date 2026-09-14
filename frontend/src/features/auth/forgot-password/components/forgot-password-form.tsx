import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
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
import { useForgotPassword } from '@/features/auth/api'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email.' : undefined),
  }),
})

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  useLocale((state) => state.locale)

  const navigate = useNavigate()
  const forgotPassword = useForgotPassword()
  const isLoading = forgotPassword.isPending

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    forgotPassword.mutate(data.email, {
      onSuccess: (result) => {
        form.reset()
        if (result.devCode) {
          toast.success(t('验证码（开发模式）：{0}', result.devCode))
        } else {
          toast.success(t('重置验证码已发送至 {0}', data.email))
        }
        navigate({ to: '/otp', search: { email: data.email } })
      },
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
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
        <Button className='mt-2' disabled={isLoading}>
          {t('Continue')}
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
