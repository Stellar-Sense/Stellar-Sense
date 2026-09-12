import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import {
  createCoreTexture,
  createGlowShell,
  createHaloSprite,
} from './materials'
import {
  createSeededRandom,
  disposeObject3D,
  getSharedSphereGeometry,
} from './utils'

export const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 40, 96)
export const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0)

export type StarScene = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  resize: () => void
  render: () => void
  /** 星空缓慢自转与中心恒星脉动；motionEnabled=false（减少动态效果）时保持静止 */
  updateAmbience: (
    delta: number,
    elapsed: number,
    motionEnabled: boolean
  ) => void
  dispose: () => void
}

const createStarfield = () => {
  const count = 15000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const random = createSeededRandom('starfield')

  for (let index = 0; index < count; index += 1) {
    const radius = 900 + random() * 1500
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

    const warmth = random()
    if (warmth < 0.68) {
      colors[index * 3] = 0.92
      colors[index * 3 + 1] = 0.95
      colors[index * 3 + 2] = 1
    } else if (warmth < 0.86) {
      colors[index * 3] = 0.72
      colors[index * 3 + 1] = 0.82
      colors[index * 3 + 2] = 1
    } else {
      colors[index * 3] = 1
      colors[index * 3 + 1] = 0.87
      colors[index * 3 + 2] = 0.66
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 1.7,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  })

  return new THREE.Points(geometry, material)
}

const createMilkyWayBand = () => {
  const count = 7000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const random = createSeededRandom('milky-way')

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2
    const radius = 1000 + random() * 1400
    const thickness = (random() - 0.5) * 2 * (90 + random() * 110)

    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = thickness
    positions[index * 3 + 2] = Math.sin(angle) * radius

    const tone = 0.55 + random() * 0.4
    colors[index * 3] = tone * 0.86
    colors[index * 3 + 1] = tone * 0.9
    colors[index * 3 + 2] = tone
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 2.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.22,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const band = new THREE.Points(geometry, material)
  band.rotation.set(
    THREE.MathUtils.degToRad(28),
    0,
    THREE.MathUtils.degToRad(62)
  )

  return band
}

export const createStarScene = (
  container: HTMLElement,
  options: { bloom?: boolean } = {}
): StarScene => {
  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#02040c')

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 4000)
  camera.position.copy(DEFAULT_CAMERA_POSITION)
  camera.lookAt(DEFAULT_CAMERA_TARGET)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.domElement.style.display = 'block'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  container.appendChild(renderer.domElement)

  // 中心光源 decay=0：不按距离衰减，保证外圈行星与内圈亮度一致
  const coreLight = new THREE.PointLight('#fff1cf', 2.8, 0, 0)
  scene.add(coreLight)
  scene.add(new THREE.AmbientLight('#243356', 0.55))
  scene.add(new THREE.HemisphereLight('#2b3f7a', '#050810', 0.4))

  const starfield = createStarfield()
  const milkyWay = createMilkyWayBand()
  scene.add(starfield)
  scene.add(milkyWay)

  const coreGroup = new THREE.Group()
  const coreRadius = 2.6
  const core = new THREE.Mesh(
    getSharedSphereGeometry(),
    new THREE.MeshBasicMaterial({ map: createCoreTexture() })
  )
  core.scale.setScalar(coreRadius)
  const coreGlow = createGlowShell(coreRadius * 1.7, '#ffd27d', 0.55, 0.52)
  const coreHalo = createHaloSprite('#ffcf7a', 30, 0.45)
  coreGroup.add(core, coreGlow, coreHalo)
  scene.add(coreGroup)

  const composer = options.bloom
    ? (() => {
        const instance = new EffectComposer(renderer)
        instance.addPass(new RenderPass(scene, camera))
        instance.addPass(
          new UnrealBloomPass(new THREE.Vector2(width, height), 0.85, 0.5, 0.3)
        )
        instance.addPass(new OutputPass())
        instance.setSize(width, height)
        return instance
      })()
    : null

  return {
    renderer,
    scene,
    camera,
    resize: () => {
      const nextWidth = Math.max(container.clientWidth, 1)
      const nextHeight = Math.max(container.clientHeight, 1)

      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight)
      composer?.setSize(nextWidth, nextHeight)
    },
    render: () => {
      if (composer) {
        composer.render()
      } else {
        renderer.render(scene, camera)
      }
    },
    updateAmbience: (delta, elapsed, motionEnabled) => {
      if (!motionEnabled) return

      starfield.rotation.y += delta * 0.004
      milkyWay.rotation.y += delta * 0.0016

      const pulse = 1 + Math.sin(elapsed * 0.9) * 0.022
      core.scale.setScalar(coreRadius * pulse)
      coreGlow.scale.setScalar(coreRadius * 1.7 * (2 - pulse))
      coreHalo.material.opacity = 0.4 + Math.sin(elapsed * 0.9) * 0.08
      core.rotation.y += delta * 0.06
    },
    dispose: () => {
      disposeObject3D(scene)
      composer?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
