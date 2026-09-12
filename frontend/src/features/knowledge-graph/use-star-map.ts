import { useCallback, useEffect, useRef } from 'react'
import type { KnowledgeEdge, KnowledgeNode } from './graph-data'
import { collectRelatedIds, type StarMapLayout } from './star-map-layout'
import { createInteraction, type InteractionHandle } from './three/interaction'
import { createLabels, type LabelsHandle } from './three/labels'
import { createOrbits, type OrbitsHandle } from './three/orbits'
import { createPlanets, type PlanetsHandle } from './three/planets'
import { createStarScene, type StarScene } from './three/scene'

const CORE_RADIUS = 2.6
const MAX_FRAME_DELTA = 0.08

type StarMapApp = {
  scene: StarScene
  planets: PlanetsHandle
  orbits: OrbitsHandle
  labels: LabelsHandle
  interaction: InteractionHandle
}

type UseStarMapArgs = {
  layout: StarMapLayout
  nodeMap: Record<string, KnowledgeNode>
  edges: readonly KnowledgeEdge[]
  selectedNodeId: string | null
  onSelectNode: (nodeId: string | null) => void
  onHoverNode: (nodeId: string | null) => void
  /** WebGL 初始化失败或上下文丢失时回调，页面据此回退到 2D 视图 */
  onUnsupported: () => void
}

/**
 * 3D 知识星系的 React 生命周期。
 * 渲染循环、resize、可见性暂停、减少动态效果偏好都在这里统一管理；
 * three 的场景对象保持命令式，React 只负责挂载/卸载与选中状态同步。
 */
export const useStarMap = ({
  layout,
  nodeMap,
  edges,
  selectedNodeId,
  onSelectNode,
  onHoverNode,
  onUnsupported,
}: UseStarMapArgs) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const labelLayerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<StarMapApp | null>(null)
  const selectionRef = useRef<string | null>(selectedNodeId)
  const hoverRef = useRef<string | null>(null)
  const callbacksRef = useRef({ onSelectNode, onHoverNode, onUnsupported })

  useEffect(() => {
    callbacksRef.current = { onSelectNode, onHoverNode, onUnsupported }
  })

  useEffect(() => {
    const container = containerRef.current
    const labelLayer = labelLayerRef.current
    if (!container || !labelLayer) return

    let scene: StarScene
    try {
      scene = createStarScene(container, { bloom: true })
    } catch {
      callbacksRef.current.onUnsupported()
      return
    }

    const planets = createPlanets(layout, nodeMap)
    const orbits = createOrbits(layout, edges)
    const labels = createLabels(labelLayer, layout, nodeMap, CORE_RADIUS)
    scene.scene.add(orbits.group, planets.group)

    const interaction = createInteraction({
      camera: scene.camera,
      domElement: scene.renderer.domElement,
      pickables: planets.pickables,
      layout,
      callbacks: {
        onHover: (nodeId) => {
          hoverRef.current = nodeId
          callbacksRef.current.onHoverNode(nodeId)
        },
        onSelect: (nodeId) => {
          selectionRef.current = nodeId
          callbacksRef.current.onSelectNode(nodeId)

          // 由 3D 画布发起的选中：相机飞近该行星；点击空白只取消选中、不动相机
          if (nodeId) {
            appRef.current?.interaction.focusNode(nodeId)
          }
        },
      },
    })

    appRef.current = { scene, planets, orbits, labels, interaction }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let motionEnabled = !motionQuery.matches
    const handleMotionChange = (event: MediaQueryListEvent) => {
      motionEnabled = !event.matches
    }
    motionQuery.addEventListener('change', handleMotionChange)

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      callbacksRef.current.onUnsupported()
    }
    const canvas = scene.renderer.domElement
    canvas.addEventListener('webglcontextlost', handleContextLost)

    const sizeCanvas = () => {
      scene.resize()
      labels.setSize(container.clientWidth, container.clientHeight)
    }

    const resizeObserver = new ResizeObserver(() => {
      sizeCanvas()
      scene.render()
    })
    resizeObserver.observe(container)
    sizeCanvas()

    let frame = 0
    let elapsed = 0
    let lastTime = performance.now()

    const loop = () => {
      frame = requestAnimationFrame(loop)

      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA)
      lastTime = now
      elapsed += delta

      interaction.update(delta)
      planets.update(delta, elapsed, motionEnabled)
      orbits.update(elapsed, motionEnabled)
      scene.updateAmbience(delta, elapsed, motionEnabled)
      labels.update(scene.camera, selectionRef.current, hoverRef.current)
      scene.render()
    }

    frame = requestAnimationFrame(loop)

    // 标签页切到后台时停掉渲染循环，回来再续上（delta 会被钳制，不会跳帧）
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame) {
        lastTime = performance.now()
        frame = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery.removeEventListener('change', handleMotionChange)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      resizeObserver.disconnect()
      interaction.dispose()
      labels.dispose()
      orbits.dispose()
      planets.dispose()
      scene.dispose()
      appRef.current = null
    }
  }, [layout, nodeMap, edges])

  useEffect(() => {
    selectionRef.current = selectedNodeId

    const app = appRef.current
    if (!app) return

    const related = selectedNodeId
      ? collectRelatedIds(selectedNodeId, edges)
      : new Set<string>()

    app.planets.setFocus(selectedNodeId, related)
    app.orbits.setFocus(selectedNodeId, related)
  }, [selectedNodeId, edges])

  const focusNode = useCallback((nodeId: string) => {
    appRef.current?.interaction.focusNode(nodeId)
  }, [])

  const resetView = useCallback(() => {
    appRef.current?.interaction.resetView()
  }, [])

  return { containerRef, labelLayerRef, focusNode, resetView }
}
