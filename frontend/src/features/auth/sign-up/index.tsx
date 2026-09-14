import { Link } from '@tanstack/react-router'
import { t, useLocale } from '@/lib/i18n'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  useLocale((state) => state.locale)

  return (
    <AuthLayout>
      <Card className='w-full max-w-xl gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('Create an account')}
          </CardTitle>
          <CardDescription>
            {t('设置账号并选择学习标签，开启个性化学习。')}
            <br />
            {t('Already have an account?')}{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('Sign In')}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            {t('By creating an account, you agree to our')}{' '}
            <a
              href='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('Terms of Service')}
            </a>{' '}
            {t('and')}{' '}
            <a
              href='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              {t('Privacy Policy')}
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
