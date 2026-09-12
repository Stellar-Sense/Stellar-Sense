import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { StarMapLayout } from '../star-map-layout'
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from './scene'

export type InteractionCallbacks = {
  onHover: (nodeId: string | null) => void
  onSelect: (nodeId: string | null) => void
}

export type InteractionHandle = {
  controls: OrbitControls
  update: (delta: number) => void
  focusNode: (nodeId: string) => void
  resetView: () => void
  dispose: () => void
}

const DEFAULT_MIN_DISTANCE = 6
const DEFAULT_MAX_DISTANCE = 180
const FOCUS_MIN_DISTANCE = 2.2
const FOCUS_MAX_DISTANCE = 60
const CLICK_TOLERANCE_PX = 6

type FlightState = {
  startPosition: THREE.Vector3
  endPosition: THREE.Vector3
  startTarget: THREE.Vector3
  endTarget: THREE.Vector3
  elapsed: number
  duration: number
}

export const createInteraction = (args: {
  camera: THREE.PerspectiveCamera
  domElement: HTMLElement
  pickables: THREE.Object3D[]
  layout: StarMapLayout
  callbacks: InteractionCallbacks
}): InteractionHandle => {
  const { camera, domElement, pickables, layout, callbacks } = args

  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.rotateSpeed = 0.45
  controls.zoomSpeed = 0.9
  controls.minDistance = DEFAULT_MIN_DISTANCE
  controls.maxDistance = DEFAULT_MAX_DISTANCE
  controls.minPolarAngle = 0.12
  controls.maxPolarAngle = 1.45
  controls.target.copy(DEFAULT_CAMERA_TARGET)
  controls.update()

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const pointerDown = { x: 0, y: 0, id: -1 }
  const proximityPoint = new THREE.Vector3()
  const proximityOffset = new THREE.Vector3()
  const PICK_TOLERANCE = 2.4
  let hoveredId: string | null = null
  let flight: FlightState | null = null

  const pick = (event: PointerEvent): string | null => {
    const rect = domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    const hits = raycaster.intersectObjects(pickables, false)
    const nodeId = hits[0]?.object.userData.nodeId

    if (typeof nodeId === 'string') return nodeId

    // 远景中行星只有十几像素，精确命中太难：退化为"射线到行星中心的距离"判定，
    // 容差取 2.4 倍行星半径，保证悬停与点击手感
    let closestId: string | null = null
    let closestDistance = Infinity

    for (const planet of layout.planets) {
      proximityPoint.set(
        planet.position.x,
        planet.position.y,
        planet.position.z
      )
      proximityOffset.copy(proximityPoint).sub(raycaster.ray.origin)

      // 行星必须在相机前方
      if (proximityOffset.dot(raycaster.ray.direction) <= 0) continue

      const distance = raycaster.ray.distanceToPoint(proximityPoint)
      if (
        distance < planet.planetRadius * PICK_TOLERANCE &&
        distance < closestDistance
      ) {
        closestDistance = distance
        closestId = planet.nodeId
      }
    }

    return closestId
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (flight) return

    const nodeId = pick(event)
    if (nodeId !== hoveredId) {
      hoveredId = nodeId
      domElement.style.cursor = nodeId ? 'pointer' : 'grab'
      callbacks.onHover(nodeId)
    }
  }

  const handlePointerLeave = () => {
    if (hoveredId !== null) {
      hoveredId = null
      domElement.style.cursor = 'grab'
      callbacks.onHover(null)
    }
  }

  const handlePointerDown = (event: PointerEvent) => {
    pointerDown.x = event.clientX
    pointerDown.y = event.clientY
    pointerDown.id = event.pointerId
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerDown.id) return

    const travelled = Math.hypot(
      event.clientX - pointerDown.x,
      event.clientY - pointerDown.y
    )
    pointerDown.id = -1

    // 拖拽旋转视角后不触发选中
    if (travelled > CLICK_TOLERANCE_PX) return

    callbacks.onSelect(pick(event))
  }

  domElement.addEventListener('pointermove', handlePointerMove)
  domElement.addEventListener('pointerleave', handlePointerLeave)
  domElement.addEventListener('pointerdown', handlePointerDown)
  domElement.addEventListener('pointerup', handlePointerUp)
  domElement.style.cursor = 'grab'

  const startFlight = (
    endPosition: THREE.Vector3,
    endTarget: THREE.Vector3,
    minDistance: number,
    maxDistance: number
  ) => {
    const distance = camera.position.distanceTo(endPosition)
    flight = {
      startPosition: camera.position.clone(),
      endPosition,
      startTarget: controls.target.clone(),
      endTarget,
      elapsed: 0,
      duration: THREE.MathUtils.clamp(distance * 0.012, 0.6, 1.8),
    }
    controls.enabled = false
    controls.minDistance = minDistance
    controls.maxDistance = maxDistance
  }

  return {
    controls,
    update: (delta) => {
      if (!flight) {
        controls.update()
        return
      }

      flight.elapsed += delta
      const raw = THREE.MathUtils.clamp(flight.elapsed / flight.duration, 0, 1)
      const smooth = raw * raw * (3 - 2 * raw)
      // 轻微过冲（3%）让飞入更有"行星航拍"的推进感
      const overshoot = 1 + 0.03 * Math.sin(smooth * Math.PI) * (1 - smooth)
      const t = Math.min(1, smooth * overshoot)

      camera.position.lerpVectors(flight.startPosition, flight.endPosition, t)
      controls.target.lerpVectors(flight.startTarget, flight.endTarget, t)

      if (raw >= 1) {
        flight = null
        controls.enabled = true
        controls.update()
      }
    },
    focusNode: (nodeId) => {
      const planet = layout.planetMap[nodeId]
      if (!planet) return

      const target = new THREE.Vector3(
        planet.position.x,
        planet.position.y,
        planet.position.z
      )
      const approach = new THREE.Vector3()
        .subVectors(camera.position, target)
        .normalize()
      const distance = planet.planetRadius * 5 + 3
      const endPosition = target
        .clone()
        .add(approach.multiplyScalar(distance))
        .setY(target.y + distance * 0.32)

      startFlight(endPosition, target, FOCUS_MIN_DISTANCE, FOCUS_MAX_DISTANCE)
      hoveredId = null
      callbacks.onHover(null)
    },
    resetView: () => {
      startFlight(
        DEFAULT_CAMERA_POSITION.clone(),
        DEFAULT_CAMERA_TARGET.clone(),
        DEFAULT_MIN_DISTANCE,
        DEFAULT_MAX_DISTANCE
      )
    },
    dispose: () => {
      domElement.removeEventListener('pointermove', handlePointerMove)
      domElement.removeEventListener('pointerleave', handlePointerLeave)
      domElement.removeEventListener('pointerdown', handlePointerDown)
      domElement.removeEventListener('pointerup', handlePointerUp)
      domElement.style.cursor = ''
      controls.dispose()
    },
  }
}
