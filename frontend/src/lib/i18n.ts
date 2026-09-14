import { create } from 'zustand'
import { messages } from './messages'

export type Locale = 'zh' | 'en'
const storageKey = 'stellar-interface-language'

export function normalizeLocale(value?: string | null): Locale {
  return value?.toLowerCase().split(/[-_]/)[0] === 'en' ? 'en' : 'zh'
}

function readLocale(): Locale {
  try {
    return normalizeLocale(localStorage.getItem(storageKey))
  } catch {
    return 'zh'
  }
}

export const useLocale = create<{
  locale: Locale
  setLocale: (value: string) => void
}>()((set) => ({
  locale: readLocale(),
  setLocale: (value) => {
    const locale = normalizeLocale(value)
    set({ locale })
    if (typeof document !== 'undefined')
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    try {
      localStorage.setItem(storageKey, locale)
    } catch {
      /* Storage can be disabled. */
    }
  },
}))

const chinese = new Map(messages.map(([zh, en]) => [en, zh]))
const english = new Map(messages.map(([zh, en]) => [zh, en]))

export function translate(
  text: string,
  locale: Locale,
  ...values: (string | number)[]
) {
  const key = text.replace(/\s+/g, ' ').trim()
  const translated = (locale === 'zh' ? chinese : english).get(key) ?? text
  return translated.replace(/\{(\d+)\}/g, (match, index: string) =>
    String(values[Number(index)] ?? match)
  )
}

/** Use inside subscribed components, callbacks and request error handlers. */
export function t(text: string, ...values: (string | number)[]) {
  return translate(text, useLocale.getState().locale, ...values)
}
