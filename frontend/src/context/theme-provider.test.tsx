import '@/styles/index.css'
import { afterEach, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'
import { panelClass, selectClass } from '@/components/learning-page'
import { ThemeProvider } from './theme-provider'

afterEach(() => {
  removeCookie('vite-ui-theme')
  document.documentElement.classList.remove('light')
  document.documentElement.classList.add('dark')
})

it.each(['light', 'system', 'dark'])(
  'replaces the saved %s preference with the original dark appearance',
  async (saved) => {
    setCookie('vite-ui-theme', saved)
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    const screen = await render(
      <ThemeProvider>
        <section aria-label='settings' className={panelClass}>
          <select aria-label='daily time' className={selectClass}>
            <option>30 minutes</option>
          </select>
        </section>
      </ThemeProvider>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(getCookie('vite-ui-theme')).toBeUndefined()
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark')
    expect(
      getComputedStyle(screen.getByRole('region').element()).backgroundColor
    ).not.toContain('255, 255, 255')
    await screen.unmount()
    await render(
      <ThemeProvider>
        <div>reloaded</div>
      </ThemeProvider>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  }
)
