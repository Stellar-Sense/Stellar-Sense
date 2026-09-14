import { useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { useAccount } from '@/features/settings/api'

export function AccountLanguageSync() {
  const { data } = useAccount()
  const setLocale = useLocale((state) => state.setLocale)
  useEffect(() => {
    if (data) setLocale(data.language)
  }, [data, setLocale])
  return null
}
