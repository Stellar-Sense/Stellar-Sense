import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fonts } from '@/config/fonts'
import { toast } from 'sonner'
import { normalizeLocale, t, useLocale } from '@/lib/i18n'
import { useFont } from '@/context/font-provider'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccount, useUpdateAccount } from '../api'

const languages = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
] as const

const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Please enter your name.')
    .min(2, 'Name must be at least 2 characters.')
    .max(30, 'Name must not be longer than 30 characters.'),
  language: z.enum(['zh', 'en'], { error: 'Please select a language.' }),
  font: z.enum(fonts),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

const emptyValues: Partial<AccountFormValues> = {
  name: '',
  language: 'zh',
}

export function AccountForm() {
  useLocale((state) => state.locale)

  const { data } = useAccount()
  const updateAccount = useUpdateAccount()
  const { font, setFont } = useFont()

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { ...emptyValues, font },
  })

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        language: normalizeLocale(data.language),
        font: form.getValues('font'),
      })
    }
  }, [data, form])

  function onSubmit(values: AccountFormValues) {
    updateAccount.mutate(
      {
        name: values.name,
        dob: data?.dob ?? null,
        language: values.language,
      },
      {
        onSuccess: () => {
          setFont(values.font)
          toast.success(t('账号信息已更新'))
        },
      }
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('Your name')} {...field} />
              </FormControl>
              <FormDescription>
                {t(
                  'This is the name that will be displayed on your profile and in emails.'
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='language'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>{t('Language')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className='w-50'>
                    <SelectValue placeholder={t('Select language')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t('保存后切换界面语言。课程内容和 AI 回答保留原文。')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='font'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Font')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className='w-50 capitalize'>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fonts.map((fontName) => (
                    <SelectItem
                      key={fontName}
                      value={fontName}
                      className='capitalize'
                    >
                      {fontName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t('保存后应用界面字体，并在当前浏览器中记住选择。')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>{t('Update account')}</Button>
      </form>
    </Form>
  )
}
