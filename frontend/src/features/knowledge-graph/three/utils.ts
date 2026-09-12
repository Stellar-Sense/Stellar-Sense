import * as THREE from 'three'
import { hashString } from '../hash'

/**
 * 确定性伪随机（xorshift32）：同一 seed 永远产出同一序列。
 * 程序化纹理与星尘分布都依赖它，避免每次挂载场景纹理都不一样。
 */
export const createSeededRandom = (seed: string): (() => number) => {
  let state = Math.floor(hashString(seed) * 0xffffffff) || 0x9e3779b9

  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0xffffffff
  }
}

const sharedGeometries = new Set<THREE.BufferGeometry>()
const sharedTextures = new Set<THREE.Texture>()

let sphereGeometry: THREE.SphereGeometry | null = null

/** 所有球体（行星、恒星、大气壳）复用一个单位球，靠 scale 变形，节省显存与 CPU */
export const getSharedSphereGeometry = (): THREE.SphereGeometry => {
  if (!sphereGeometry) {
    sphereGeometry = new THREE.SphereGeometry(1, 48, 32)
    sharedGeometries.add(sphereGeometry)
  }

  return sphereGeometry
}

const radialTextureCache = new Map<string, THREE.CanvasTexture>()

const toRgba = (color: THREE.Color, alpha: number) =>
  `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`

/** 径向渐变贴图（光晕/星尘精灵用），按颜色缓存；白色用更高分辨率避免近看发虚 */
export const getRadialGlowTexture = (color: string): THREE.CanvasTexture => {
  const cached = radialTextureCache.get(color)
  if (cached) return cached

  const resolution = color === '#ffffff' ? 1024 : 512
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution

  const context = canvas.getContext('2d')
  const tint = new THREE.Color(color)

  if (context) {
    const center = resolution / 2
    const gradient = context.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      center
    )
    gradient.addColorStop(0, toRgba(tint, 1))
    gradient.addColorStop(0.18, toRgba(tint, 0.72))
    gradient.addColorStop(0.45, toRgba(tint, 0.22))
    gradient.addColorStop(1, toRgba(tint, 0))
    context.fillStyle = gradient
    context.fillRect(0, 0, resolution, resolution)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  radialTextureCache.set(color, texture)
  sharedTextures.add(texture)

  return texture
}

export const isSharedResource = (resource: unknown) =>
  sharedGeometries.has(resource as THREE.BufferGeometry) ||
  sharedTextures.has(resource as THREE.Texture)

const disposeMaterial = (material: THREE.Material) => {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture && !isSharedResource(value)) {
      value.dispose()
    }
  }

  material.dispose()
}

/** 递归释放场景资源；共享的球几何与光晕贴图会跳过，避免影响其他实例 */
export const disposeObject3D = (root: THREE.Object3D) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh

    if (mesh.geometry && !isSharedResource(mesh.geometry)) {
      mesh.geometry.dispose()
    }

    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial)
    } else if (material) {
      disposeMaterial(material)
    }
  })
}
