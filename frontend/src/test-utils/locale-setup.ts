import { beforeEach } from 'vitest'
import { useLocale } from '@/lib/i18n'

// Browser storage is shared across test files. Set the intended default explicitly.
beforeEach(() => useLocale.getState().setLocale('zh'))
