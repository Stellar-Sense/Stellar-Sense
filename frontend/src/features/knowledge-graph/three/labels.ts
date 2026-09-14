import * as THREE from 'three'
import type { KnowledgeNode } from '../graph-data'
import type { StarMapLayout } from '../star-map-layout'

type LabelKind = 'node' | 'domain' | 'core'

type LabelItem = {
  id: string
  kind: LabelKind
  element: HTMLDivElement
  position: THREE.Vector3
  fontSize: number
  textWidth: number
  priority: number
  opacity: number
  screenX: number
  screenY: number
  visible: boolean
}

export type LabelsHandle = {
  update: (
    camera: THREE.Camera,
    selectedId: string | null,
    hoveredId: string | null
  ) => void
  /** 画布尺寸变化后调用，用于把 NDC 映射到像素 */
  setSize: (width: number, height: number) => void
  dispose: () => void
}

const LABEL_INTERVAL_MS = 40
const MAX_LABEL_DISTANCE = 320
const LABEL_PADDING = 6

const domainLabels: Record<string, string> = {
  遥感基础: '遥感基础 · FOUNDATION',
  'Python 数据处理': 'PYTHON 数据处理',
  遥感影像处理: '影像处理 · IMAGERY',
  深度学习: '深度学习 · DEEP LEARNING',
  Transformer: 'TRANSFORMER',
  遥感大模型: '遥感大模型 · FOUNDATION MODEL',
}

const estimateWidth = (text: string, fontSize: number) => {
  let width = 0

  for (const character of text) {
    width += character.charCodeAt(0) > 255 ? fontSize : fontSize * 0.58
  }

  return width
}

const styleLabel = (
  element: HTMLDivElement,
  kind: LabelKind,
  fontSize: number
) => {
  element.style.position = 'absolute'
  element.style.left = '0'
  element.style.top = '0'
  element.style.whiteSpace = 'nowrap'
  element.style.pointerEvents = 'none'
  element.style.fontSize = `${fontSize}px`
  element.style.lineHeight = '1.25'
  element.style.willChange = 'transform'
  element.style.transition = 'opacity 160ms ease-out'

  if (kind === 'node') {
    element.style.color = 'var(--graph-label)'
    element.style.fontWeight = '500'
    element.style.letterSpacing = '0.02em'
    element.style.textShadow = 'var(--graph-label-shadow)'
  } else if (kind === 'domain') {
    element.style.color = 'var(--graph-domain-label)'
    element.style.letterSpacing = '0.16em'
    element.style.fontWeight = '600'
    element.style.textShadow = 'var(--graph-label-shadow)'
  } else {
    element.style.color = 'var(--graph-core-label)'
    element.style.fontWeight = '600'
    element.style.letterSpacing = '0.08em'
    element.style.textShadow = 'var(--graph-label-shadow)'
  }
}

export const createLabels = (
  layer: HTMLElement,
  layout: StarMapLayout,
  nodeMap: Record<string, KnowledgeNode>,
  coreRadius: number
): LabelsHandle => {
  const items: LabelItem[] = []
  let width = Math.max(layer.clientWidth, 1)
  let height = Math.max(layer.clientHeight, 1)
  let lastUpdate = 0

  const addItem = (
    id: string,
    kind: LabelKind,
    text: string,
    position: THREE.Vector3,
    fontSize: number
  ) => {
    const element = document.createElement('div')
    element.textContent = text
    styleLabel(element, kind, fontSize)
    element.style.opacity = '0'
    layer.appendChild(element)

    items.push({
      id,
      kind,
      element,
      position,
      fontSize,
      textWidth: estimateWidth(text, fontSize),
      priority: 1,
      opacity: 0,
      screenX: 0,
      screenY: 0,
      visible: false,
    })
  }

  // 领域扇区标签：位于扇区中位角、最外圈之外
  const outerRadius = layout.ringRadii[layout.ringRadii.length - 1] ?? 40
  const domainIndexes = new Map<string, number[]>()
  for (const planet of layout.planets) {
    const angles = domainIndexes.get(planet.domain) ?? []
    angles.push(planet.angle)
    domainIndexes.set(planet.domain, angles)
  }

  for (const [domain, angles] of domainIndexes) {
    const middle =
      angles.reduce((sum, angle) => sum + angle, 0) / Math.max(angles.length, 1)
    const radius = outerRadius + 4.4
    addItem(
      `domain:${domain}`,
      'domain',
      domainLabels[domain] ?? domain,
      new THREE.Vector3(
        Math.cos(middle) * radius,
        1.6,
        Math.sin(middle) * radius
      ),
      11
    )
  }

  addItem(
    'core',
    'core',
    '学科核心',
    new THREE.Vector3(0, coreRadius + 3.4, 0),
    12
  )

  for (const planet of layout.planets) {
    const node = nodeMap[planet.nodeId]
    if (!node) continue

    addItem(
      planet.nodeId,
      'node',
      node.name,
      new THREE.Vector3(
        planet.position.x,
        planet.position.y + planet.planetRadius + 1.15,
        planet.position.z
      ),
      10
    )
  }

  const frustum = new THREE.Frustum()
  const projectionMatrix = new THREE.Matrix4()
  const viewDirection = new THREE.Vector3()
  const surfaceNormal = new THREE.Vector3()
  const occupied: {
    left: number
    right: number
    top: number
    bottom: number
  }[] = []

  return {
    setSize: (nextWidth, nextHeight) => {
      width = Math.max(nextWidth, 1)
      height = Math.max(nextHeight, 1)
      lastUpdate = 0
    },
    update: (camera, selectedId, hoveredId) => {
      const now = performance.now()
      if (now - lastUpdate < LABEL_INTERVAL_MS) return
      lastUpdate = now

      camera.updateMatrixWorld()
      projectionMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
      frustum.setFromProjectionMatrix(projectionMatrix)

      for (const item of items) {
        const isSelected = item.id === selectedId
        const isHovered = item.id === hoveredId
        item.priority = isSelected
          ? 4
          : isHovered
            ? 3.5
            : item.kind === 'core'
              ? 2.4
              : item.kind === 'domain'
                ? 1.6
                : 1

        const distance = camera.position.distanceTo(item.position)

        if (
          distance > MAX_LABEL_DISTANCE ||
          !frustum.containsPoint(item.position)
        ) {
          item.visible = false
          continue
        }

        surfaceNormal.copy(item.position).normalize()
        viewDirection.copy(camera.position).sub(item.position).normalize()
        const facing = surfaceNormal.dot(viewDirection)

        // 位于星系背面（被中心遮挡）的标签淡化，避免视觉噪音
        const baseOpacity =
          item.kind === 'node' ? (facing < -0.1 ? 0.24 : 0.92) : 0.95
        item.opacity = isSelected || isHovered ? 1 : baseOpacity
        item.visible = true

        const projected = item.position.clone().project(camera)
        item.screenX = (projected.x * 0.5 + 0.5) * width
        item.screenY = (-projected.y * 0.5 + 0.5) * height
      }

      // 重叠抑制：优先级高的先占位，低优先级标签重叠时整帧隐藏
      occupied.length = 0
      const sorted = [...items].sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority
        }
        return left.position.distanceToSquared(camera.position) <
          right.position.distanceToSquared(camera.position)
          ? -1
          : 1
      })

      for (const item of sorted) {
        if (!item.visible) {
          item.element.style.opacity = '0'
          continue
        }

        const screenX = item.screenX
        const screenY = item.screenY
        const labelWidth = item.textWidth
        const labelHeight = item.fontSize * 1.25
        const left = screenX - labelWidth / 2 - LABEL_PADDING
        const right = screenX + labelWidth / 2 + LABEL_PADDING
        const top = screenY - labelHeight / 2
        const bottom = screenY + labelHeight / 2
        const collides = occupied.some(
          (rect) =>
            left < rect.right &&
            right > rect.left &&
            top < rect.bottom &&
            bottom > rect.top
        )

        if (collides && item.priority < 3) {
          item.element.style.opacity = '0'
          continue
        }

        occupied.push({ left, right, top, bottom })
        item.element.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`
        item.element.style.opacity = String(item.opacity)
      }
    },
    dispose: () => {
      for (const item of items) {
        item.element.remove()
      }
      items.length = 0
    },
  }
}
