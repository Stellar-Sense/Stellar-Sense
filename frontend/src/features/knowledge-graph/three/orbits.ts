import * as THREE from 'three'
import type { KnowledgeEdge } from '../graph-data'
import type { StarMapLayout } from '../star-map-layout'
import { disposeObject3D } from './utils'

type EdgeRecord = {
  from: string
  to: string
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  baseMaterial: THREE.LineBasicMaterial
}

export type OrbitsHandle = {
  group: THREE.Group
  update: (elapsed: number, motionEnabled: boolean) => void
  setFocus: (nodeId: string | null, relatedIds: ReadonlySet<string>) => void
  dispose: () => void
}

const orbitColor = '#7dd3fc'
const edgeColor = '#60a5fa'

export const createOrbits = (
  layout: StarMapLayout,
  edges: readonly KnowledgeEdge[]
): OrbitsHandle => {
  const group = new THREE.Group()
  const ringMeshes: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] =
    []

  // 同层轨道圈：半径来自布局的拓扑层级
  for (const radius of layout.ringRadii) {
    const geometry = new THREE.RingGeometry(radius - 0.045, radius + 0.045, 220)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(orbitColor),
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = -Math.PI / 2
    ring.renderOrder = 0
    group.add(ring)
    ringMeshes.push(ring)
  }

  // 先修关系：抬升的贝塞尔弧线，高于盘面，避免与轨道圈混淆
  const edgeRecords: EdgeRecord[] = []
  const highlightMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color('#bae6fd'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  for (const edge of edges) {
    const source = layout.planetMap[edge.from]
    const target = layout.planetMap[edge.to]
    if (!source || !target) continue

    const start = new THREE.Vector3(
      source.position.x,
      source.position.y,
      source.position.z
    )
    const end = new THREE.Vector3(
      target.position.x,
      target.position.y,
      target.position.z
    )
    const distance = start.distanceTo(end)
    const lift = 1.4 + distance * 0.22
    const control = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .setY(Math.max(start.y, end.y) + lift)

    const curve = new THREE.QuadraticBezierCurve3(start, control, end)
    const geometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(36)
    )
    const baseMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(edgeColor),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
    const line = new THREE.Line(geometry, baseMaterial)
    line.renderOrder = 1
    group.add(line)
    edgeRecords.push({
      from: edge.from,
      to: edge.to,
      line,
      baseMaterial,
    })
  }

  let focusDepth: number | null = null
  const relatedDepths = new Set<number>()
  const highlighted: EdgeRecord[] = []

  return {
    group,
    update: (elapsed, motionEnabled) => {
      const pulse = motionEnabled ? 0.55 + Math.sin(elapsed * 2.4) * 0.4 : 0.85
      if (highlighted.length > 0) {
        highlightMaterial.opacity = pulse
      }
    },
    setFocus: (nodeId, relatedIds) => {
      highlighted.length = 0

      for (const record of edgeRecords) {
        const isRelated =
          Boolean(nodeId) &&
          relatedIds.has(record.from) &&
          relatedIds.has(record.to)
        record.line.material = isRelated
          ? highlightMaterial
          : record.baseMaterial

        if (isRelated) {
          highlighted.push(record)
        }
      }

      highlightMaterial.opacity = nodeId ? 0.9 : 0
      focusDepth = nodeId ? (layout.planetMap[nodeId]?.depth ?? null) : null
      relatedDepths.clear()
      for (const id of relatedIds) {
        const planet = layout.planetMap[id]
        if (planet) relatedDepths.add(planet.depth)
      }

      ringMeshes.forEach((ring, depth) => {
        const isFocusedRing = focusDepth !== null && depth === focusDepth
        const isRelatedRing = relatedDepths.has(depth)
        ring.material.opacity = isFocusedRing
          ? 0.26
          : isRelatedRing
            ? 0.16
            : 0.1
      })
    },
    dispose: () => {
      for (const record of edgeRecords) {
        record.line.material = record.baseMaterial
      }
      highlightMaterial.dispose()
      disposeObject3D(group)
      group.clear()
      ringMeshes.length = 0
      edgeRecords.length = 0
      highlighted.length = 0
    },
  }
}
