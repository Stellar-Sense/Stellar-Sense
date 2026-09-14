import { expect, it } from 'vitest'
import { normalizeLocale, translate } from './i18n'

it('normalizes saved language codes and falls back to Chinese', () => {
  expect(normalizeLocale('en-US')).toBe('en')
  expect(normalizeLocale('zh-CN')).toBe('zh')
  expect(normalizeLocale('fr')).toBe('zh')
  expect(normalizeLocale(null)).toBe('zh')
})

it('translates interface copy without changing user content', () => {
  expect(translate('Account', 'zh')).toBe('账号')
  expect(translate('学习路径', 'en')).toBe('Learning path')
  expect(translate('{0}的头像', 'en', '林遥')).toBe('Avatar of 林遥')
  expect(translate('My custom notes 自定义内容', 'en')).toBe(
    'My custom notes 自定义内容'
  )
})
