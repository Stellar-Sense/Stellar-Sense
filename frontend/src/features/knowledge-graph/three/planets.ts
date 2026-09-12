import * as THREE from 'three'
import {
  getDomainTheme,
  type KnowledgeNode,
  type NodeStatus,
} from '../graph-data'
import { hashString } from '../hash'
import type { StarMapLayout } from '../star-map-layout'
import { createGlowShell, createSurfaceTexture } from './materials'
import { disposeObject3D, getSharedSphereGeometry } from './utils'

type StatusLook = {
  color: string
  emissiveIntensity: number
  glowOpacity: number
  glowScale: number
  pulse: boolean
}

const statusLooks: Record<NodeStatus, StatusLook> = {
  mastered: {
    color: '#ffffff',
    emissiveIntensity: 0.42,
    glowOpacity: 0.85,
    glowScale: 1.16,
    pulse: false,
  },
  learning: {
    color: '#efe8ff',
    emissiveIntensity: 0.5,
    glowOpacity: 1,
    glowScale: 1.22,
    pulse: true,
  },
  unlearned: {
    color: '#8d97a9',
    emissiveIntensity: 0.12,
    glowOpacity: 0.26,
    glowScale: 1.08,
    pulse: false,
  },
}

type PlanetRecord = {
  nodeId: string
  node: KnowledgeNode
  look: StatusLook
  planetRadius: number
  tiltGroup: THREE.Group
  spinGroup: THREE.Group
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  glow: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  ring?: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  spinSpeed: number
  phase: number
  scaleTarget: number
  scaleCurrent: number
  glowTarget: number
  glowCurrent: number
}

export type PlanetsHandle = {
  group: THREE.Group
  pickables: THREE.Object3D[]
  update: (delta: number, elapsed: number, motionEnabled: boolean) => void
  setFocus: (nodeId: string | null, relatedIds: ReadonlySet<string>) => void
  dispose: () => void
}

const buildPlanet = (
  node: KnowledgeNode,
  planetRadius: number,
  hasRing: boolean
): PlanetRecord => {
  const theme = getDomainTheme(node.domain)
  const look = statusLooks[node.status]
  const randomSeed = hashString(node.id)
  const texture = createSurfaceTexture(
    theme.pattern,
    { accent: theme.accent, deep: theme.deep },
    node.id
  )

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: new THREE.Color(look.color),
    roughness: 0.82,
    metalness: 0.05,
    emissive: new THREE.Color(theme.accent),
    emissiveIntensity: look.emissiveIntensity,
  })

  const mesh = new THREE.Mesh(getSharedSphereGeometry(), material)

  const glow = createGlowShell(1, theme.accent, look.glowOpacity) as THREE.Mesh<
    THREE.SphereGeometry,
    THREE.ShaderMaterial
  >
  glow.scale.setScalar(look.glowScale)

  const spinGroup = new THREE.Group()
  spinGroup.add(mesh, glow)

  const tiltGroup = new THREE.Group()
  tiltGroup.rotation.z = THREE.MathUtils.degToRad(4 + randomSeed * 34)
  tiltGroup.scale.setScalar(planetRadius)
  tiltGroup.add(spinGroup)

  if (hasRing) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.accent),
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 2.35, 128),
      ringMaterial
    )
    ring.rotation.x = -Math.PI / 2
    tiltGroup.add(ring)

    return {
      nodeId: node.id,
      node,
      look,
      planetRadius,
      tiltGroup,
      spinGroup,
      mesh,
      glow,
      ring,
      spinSpeed: 0.16 + randomSeed * 0.22,
      phase: randomSeed * Math.PI * 2,
      scaleTarget: 1,
      scaleCurrent: 1,
      glowTarget: look.glowOpacity,
      glowCurrent: look.glowOpacity,
    }
  }

  return {
    nodeId: node.id,
    node,
    look,
    planetRadius,
    tiltGroup,
    spinGroup,
    mesh,
    glow,
    spinSpeed: 0.16 + randomSeed * 0.22,
    phase: randomSeed * Math.PI * 2,
    scaleTarget: 1,
    scaleCurrent: 1,
    glowTarget: look.glowOpacity,
    glowCurrent: look.glowOpacity,
  }
}

export const createPlanets = (
  layout: StarMapLayout,
  nodeMap: Record<string, KnowledgeNode>
): PlanetsHandle => {
  const group = new THREE.Group()
  const records: PlanetRecord[] = []

  for (const planet of layout.planets) {
    const node = nodeMap[planet.nodeId]
    if (!node) continue

    const record = buildPlanet(node, planet.planetRadius, planet.hasRing)
    record.mesh.userData.nodeId = planet.nodeId
    record.tiltGroup.position.set(
      planet.position.x,
      planet.position.y,
      planet.position.z
    )
    group.add(record.tiltGroup)
    records.push(record)
  }

  let focusedId: string | null = null
  let related: ReadonlySet<string> = new Set()

  const applyFocusLook = (record: PlanetRecord) => {
    const isFocused = record.nodeId === focusedId
    const isRelated = related.has(record.nodeId)
    const isDimmed = Boolean(focusedId) && !isFocused && !isRelated
    const boost = isFocused ? 1.14 : isRelated ? 1.05 : isDimmed ? 0.88 : 1

    record.scaleTarget = boost
    record.glowTarget =
      record.look.glowOpacity * (isFocused ? 1.45 : isDimmed ? 0.45 : 1)
    record.mesh.material.emissiveIntensity = isFocused
      ? record.look.emissiveIntensity + 0.3
      : isDimmed
        ? record.look.emissiveIntensity * 0.5
        : record.look.emissiveIntensity

    if (record.ring) {
      record.ring.material.opacity = isFocused ? 0.62 : isDimmed ? 0.16 : 0.38
    }
  }

  return {
    group,
    pickables: records.map((record) => record.mesh),
    update: (delta, elapsed, motionEnabled) => {
      for (const record of records) {
        const easing = 1 - Math.exp(-delta * 6)
        record.scaleCurrent +=
          (record.scaleTarget - record.scaleCurrent) * easing
        record.glowCurrent += (record.glowTarget - record.glowCurrent) * easing

        record.tiltGroup.scale.setScalar(
          record.planetRadius * record.scaleCurrent
        )

        const pulse =
          record.look.pulse && motionEnabled
            ? 0.86 + Math.sin(elapsed * 1.9 + record.phase) * 0.14
            : 1
        record.glow.material.uniforms.opacity.value = record.glowCurrent * pulse

        if (motionEnabled) {
          record.spinGroup.rotation.y += delta * record.spinSpeed
          if (record.ring) {
            record.ring.rotation.z += delta * record.spinSpeed * 0.35
          }
        }
      }
    },
    setFocus: (nodeId, relatedIds) => {
      focusedId = nodeId
      related = relatedIds
      records.forEach(applyFocusLook)
    },
    dispose: () => {
      disposeObject3D(group)
      group.clear()
      records.length = 0
    },
  }
}
