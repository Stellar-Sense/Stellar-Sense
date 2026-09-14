import '@/styles/index.css'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { StarMap2D } from './star-map-2d'

function Map() {
  return (
    <div style={{ width: 600, height: 400 }}>
      <StarMap2D
        nodes={[]}
        edges={[]}
        selectedNodeId={null}
        hoveredNodeId={null}
        onSelectNode={() => {}}
        onHoverNode={() => {}}
      />
    </div>
  )
}

function wheel(target: Element, deltaY: number) {
  const rect = target.getBoundingClientRect()
  const event = new WheelEvent('wheel', {
    deltaY,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

describe('star map wheel interaction', () => {
  afterEach(() => document.documentElement.classList.remove('light', 'dark'))
  it.each(['dark'])(
    'renders visible connections in %s mode with the actual background layers',
    async (theme) => {
      document.documentElement.classList.add(theme)
      await page.viewport(1000, 700)
      const nodes = [
        { id: 'a', name: '遥感概论', x: 12, y: 24 },
        { id: 'b', name: '电磁波', x: 22, y: 28 },
        { id: 'c', name: '传感器', x: 40, y: 35 },
        { id: 'd', name: '影像应用', x: 70, y: 50 },
      ].map((node) => ({
        ...node,
        domain: '遥感基础',
        status: 'unlearned' as const,
        prerequisites: [],
        duration: '30 分钟',
      }))
      const screen = await render(
        <div style={{ width: 900, height: 420 }}>
          <StarMap2D
            nodes={nodes}
            edges={[
              { from: 'a', to: 'b', relation: 'prerequisite' },
              { from: 'b', to: 'c', relation: 'contains' },
              { from: 'c', to: 'd', relation: 'applies' },
              { from: 'a', to: 'd', relation: 'related' },
            ]}
            selectedNodeId={null}
            hoveredNodeId={null}
            onSelectNode={() => {}}
            onHoverNode={() => {}}
          />
        </div>
      )
      const canvas = screen
        .getByRole('region', { name: '知识星图画布' })
        .element()
      const svg = canvas.querySelector('svg')!
      await expect
        .poll(() => svg.querySelectorAll('path[data-relation]').length)
        .toBe(4)
      const line = svg.querySelector<SVGPathElement>(
        'path[data-relation="prerequisite"]'
      )!
      for (const relation of ['prerequisite', 'contains', 'applies']) {
        const arrow = svg.querySelector(`path[data-relation="${relation}"]`)!
        expect(arrow.getAttribute('marker-end')).toContain(`-${relation})`)
        expect(arrow.hasAttribute('marker-start')).toBe(false)
      }
      expect(
        svg
          .querySelector('path[data-relation="related"]')!
          .hasAttribute('marker-end')
      ).toBe(false)
      expect(line.getBoundingClientRect().width).toBeGreaterThan(0)
      expect(
        Number.parseFloat(getComputedStyle(line).strokeWidth)
      ).toBeGreaterThanOrEqual(2)
      // 在线段中点验证最上层元素：连线必须在背景之上，不能被星云背景遮挡。
      const point = line.getPointAtLength(line.getTotalLength() / 2)
      const midpoint = new DOMPoint(point.x, point.y).matrixTransform(
        line.getScreenCTM()!
      )
      expect(document.elementFromPoint(midpoint.x, midpoint.y)).toBe(line)
      await screen
        .getByRole('region', { name: '知识星图画布' })
        .screenshot({ path: `node_modules/.cache/star-map-${theme}.png` })
    }
  )
  it('zooms inside the canvas and cancels page scrolling, including at zoom limits', async () => {
    const screen = await render(<Map />)
    const canvas = screen
      .getByRole('region', { name: '知识星图画布' })
      .element()
    const parent = canvas.parentElement!
    const parentWheel = vi.fn()
    parent.addEventListener('wheel', parentWheel)
    try {
      expect(wheel(canvas, -120).defaultPrevented).toBe(true)
      await expect
        .element(screen.getByLabelText('缩放比例'))
        .toHaveTextContent('112%')
      for (let i = 0; i < 20; i++)
        expect(wheel(canvas, -120).defaultPrevented).toBe(true)
      await expect
        .element(screen.getByLabelText('缩放比例'))
        .toHaveTextContent('160%')
      for (let i = 0; i < 20; i++)
        expect(wheel(canvas, 120).defaultPrevented).toBe(true)
      await expect
        .element(screen.getByLabelText('缩放比例'))
        .toHaveTextContent('70%')
      expect(parentWheel).not.toHaveBeenCalled()
      // 鼠标移出画布后，不拦截父页面的正常滚轮事件。
      expect(wheel(parent, 120).defaultPrevented).toBe(false)
      expect(parentWheel).toHaveBeenCalledOnce()
    } finally {
      parent.removeEventListener('wheel', parentWheel)
    }
  })
})
