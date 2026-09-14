import '@/styles/index.css'
import type { Color } from 'three'
import { expect, it } from 'vitest'
import { page } from 'vitest/browser'
import type { KnowledgeNode } from '../graph-data'
import { buildStarMapLayout } from '../star-map-layout'
import { createLabels } from './labels'
import { createOrbits } from './orbits'
import { createPlanets } from './planets'
import { createStarScene } from './scene'

it('keeps the universe dark and preserves the camera in the fixed dark theme', async () => {
  await page.viewport(1100, 760)
  const container = document.createElement('div')
  container.style.cssText = 'width:1000px;height:650px;position:relative'
  container.className = 'dark'
  container.setAttribute('role', 'img')
  container.setAttribute('aria-label', '三维星图预览')
  document.body.appendChild(container)
  const layer = document.createElement('div')
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none'
  const nodes: KnowledgeNode[] = [
    '遥感概论',
    '电磁波',
    '传感器',
    '影像处理',
  ].map((name, i) => ({
    id: name,
    name,
    domain: '遥感基础',
    status: i ? 'unlearned' : 'mastered',
    x: 20 * i,
    y: 30,
    prerequisites: [],
    duration: '20 分钟',
  }))
  const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }))
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const layout = buildStarMapLayout(nodes, edges)
  const scene = createStarScene(container, { bloom: true })
  container.appendChild(layer)
  const planets = createPlanets(layout, nodeMap)
  const orbits = createOrbits(layout, edges)
  const labels = createLabels(layer, layout, nodeMap, 2.6)
  scene.scene.add(planets.group, orbits.group)
  scene.camera.position.set(12, 48, 100)
  scene.camera.lookAt(0, 0, 0)
  const position = scene.camera.position.clone()
  const canvas = scene.renderer.domElement
  try {
    for (const theme of ['dark']) {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
      scene.camera.updateMatrixWorld()
      labels.update(scene.camera, null, null)
      scene.render()
      expect((scene.scene.background as Color).getHexString()).toBe('02040c')
      expect(
        getComputedStyle(layer).getPropertyValue('--graph-label').trim()
      ).toBe('#dbe6f7')
      expect(scene.camera.position.equals(position)).toBe(true)
      expect(container.querySelector('canvas')).toBe(canvas)
      expect(scene.scene.children).toContain(planets.group)
      await page
        .getByRole('img', { name: '三维星图预览' })
        .screenshot({ path: `node_modules/.cache/star-map-3d-${theme}.png` })
    }
  } finally {
    labels.dispose()
    scene.scene.remove(planets.group, orbits.group)
    planets.dispose()
    orbits.dispose()
    scene.dispose()
    container.remove()
    document.documentElement.classList.remove('light', 'dark')
  }
})
