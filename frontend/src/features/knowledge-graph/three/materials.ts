import * as THREE from 'three'
import type { DomainPattern } from '../graph-data'
import {
  createSeededRandom,
  getRadialGlowTexture,
  getSharedSphereGeometry,
} from './utils'

export type SurfacePalette = {
  accent: string
  deep: string
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

export const toRgbaCss = (color: THREE.Color, alpha: number) =>
  `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`

/**
 * 大气辉光壳：背面渲染 + 加法混合 + 不写深度。
 * 行星本体先写深度，会把壳的中央遮住，最终只在轮廓外圈留下光晕（demo 的同一手法）。
 * 强度用世界空间法线与视线夹角计算，无需每帧同步 uniform。
 */
export const createGlowShell = (
  radius: number,
  color: string,
  opacity: number,
  falloff = 0.72
) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      falloff: { value: falloff },
    },
    vertexShader: `
      uniform float falloff;
      varying float intensity;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
        float facing = dot(worldNormal, viewDirection);
        intensity = pow(max(falloff - facing, 0.0), 2.0);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float opacity;
      varying float intensity;
      void main() {
        gl_FragColor = vec4(glowColor * intensity, intensity * opacity);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(getSharedSphereGeometry(), material)
  mesh.scale.setScalar(radius)
  mesh.renderOrder = 2

  return mesh
}

export const createHaloSprite = (
  color: string,
  size: number,
  opacity: number
) => {
  const material = new THREE.SpriteMaterial({
    map: getRadialGlowTexture(color),
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity,
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.setScalar(size)
  sprite.renderOrder = 1

  return sprite
}

const fillBase = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  deep: THREE.Color,
  accent: THREE.Color
) => {
  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, toRgbaCss(deep.clone().lerp(accent, 0.18), 1))
  gradient.addColorStop(0.5, toRgbaCss(deep, 1))
  gradient.addColorStop(1, toRgbaCss(deep.clone().lerp(accent, 0.12), 1))
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
}

const scatterDots = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: THREE.Color,
  count: number,
  random: () => number,
  maxSize = 2.4
) => {
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = toRgbaCss(color, 0.1 + random() * 0.5)
    const size = 0.6 + random() * maxSize
    context.beginPath()
    context.arc(random() * width, random() * height, size, 0, Math.PI * 2)
    context.fill()
  }
}

const drawBands = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SurfacePalette,
  random: () => number
) => {
  const accent = new THREE.Color(palette.accent)
  const deep = new THREE.Color(palette.deep)

  for (let y = 0; y < height; y += 1) {
    const wave =
      Math.sin(y * 0.052 + random() * 1.6) * 0.1 + Math.sin(y * 0.014) * 0.16
    const tone = clamp01(0.3 + (Math.sin(y * 0.086) + 1) * 0.24 + wave)
    context.fillStyle = toRgbaCss(deep.clone().lerp(accent, tone), 1)
    context.fillRect(0, y, width, 1)
  }

  for (let index = 0; index < 6; index += 1) {
    context.fillStyle = toRgbaCss(accent, 0.16)
    context.beginPath()
    context.ellipse(
      random() * width,
      random() * height,
      40 + random() * 120,
      2 + random() * 4,
      0,
      0,
      Math.PI * 2
    )
    context.fill()
  }
}

const drawDataGrid = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SurfacePalette,
  random: () => number
) => {
  const accent = new THREE.Color(palette.accent)

  context.lineWidth = 1
  for (let x = 0; x < width; x += 32) {
    context.strokeStyle = toRgbaCss(accent, 0.12)
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = 0; y < height; y += 32) {
    context.strokeStyle = toRgbaCss(accent, 0.09)
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }

  for (let index = 0; index < 26; index += 1) {
    const x = Math.floor(random() * (width / 32 - 1)) * 32
    const y = Math.floor(random() * (height / 32 - 1)) * 32
    const size = 10 + Math.floor(random() * 3) * 8
    context.fillStyle = toRgbaCss(accent, 0.16 + random() * 0.4)
    context.fillRect(x + 4, y + 4, size, size)
  }

  scatterDots(context, width, height, accent, 120, random, 1.6)
}

const drawContinents = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SurfacePalette,
  random: () => number
) => {
  const accent = new THREE.Color(palette.accent)
  const deep = new THREE.Color(palette.deep)

  for (let index = 0; index < 9; index += 1) {
    const centerX = random() * width
    const centerY = height * 0.2 + random() * height * 0.6
    const radiusX = 26 + random() * 76
    const radiusY = 16 + random() * 34
    const rotation = random() * Math.PI

    context.fillStyle = toRgbaCss(accent, 0.34 + random() * 0.3)
    context.beginPath()
    context.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      rotation,
      0,
      Math.PI * 2
    )
    context.fill()

    context.strokeStyle = toRgbaCss(deep.clone().lerp(accent, 0.8), 0.5)
    context.lineWidth = 1.4
    context.stroke()
  }

  for (const pole of [0, height]) {
    context.fillStyle = toRgbaCss(new THREE.Color('#e2e8f0'), 0.34)
    context.beginPath()
    context.ellipse(
      width / 2,
      pole,
      width * 0.6,
      10 + random() * 8,
      0,
      0,
      Math.PI * 2
    )
    context.fill()
  }

  scatterDots(context, width, height, accent, 160, random, 1.4)
}

const drawNeural = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SurfacePalette,
  random: () => number
) => {
  const accent = new THREE.Color(palette.accent)
  const nodes = Array.from({ length: 28 }, () => ({
    x: random() * width,
    y: random() * height,
  }))

  context.lineWidth = 0.9
  for (let index = 0; index < nodes.length; index += 1) {
    const from = nodes[index]
    const target = nodes[Math.floor(random() * nodes.length)]
    if (from === target) continue

    context.strokeStyle = toRgbaCss(accent, 0.16)
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(target.x, target.y)
    context.stroke()
  }

  for (const node of nodes) {
    const glow = context.createRadialGradient(
      node.x,
      node.y,
      0,
      node.x,
      node.y,
      9
    )
    glow.addColorStop(0, toRgbaCss(accent, 0.95))
    glow.addColorStop(1, toRgbaCss(accent, 0))
    context.fillStyle = glow
    context.beginPath()
    context.arc(node.x, node.y, 9, 0, Math.PI * 2)
    context.fill()
  }

  scatterDots(context, width, height, accent, 90, random, 1.3)
}

const drawClouds = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SurfacePalette,
  random: () => number
) => {
  const accent = new THREE.Color(palette.accent)
  const deep = new THREE.Color(palette.deep)

  for (let index = 0; index < 70; index += 1) {
    const centerX = random() * width
    const centerY = (0.1 + random() * 0.8) * height
    const radius = 10 + random() * 44
    const cloud = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    )
    const tone = deep.clone().lerp(accent, 0.4 + random() * 0.6)
    cloud.addColorStop(0, toRgbaCss(tone, 0.5))
    cloud.addColorStop(0.6, toRgbaCss(tone, 0.2))
    cloud.addColorStop(1, toRgbaCss(tone, 0))
    context.fillStyle = cloud
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()
  }

  for (let index = 0; index < 5; index += 1) {
    context.fillStyle = toRgbaCss(accent, 0.2)
    context.beginPath()
    context.ellipse(
      random() * width,
      random() * height,
      70 + random() * 130,
      3 + random() * 5,
      0,
      0,
      Math.PI * 2
    )
    context.fill()
  }
}

const drawCraters = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SurfacePalette,
  random: () => number
) => {
  const accent = new THREE.Color(palette.accent)
  const deep = new THREE.Color(palette.deep)
  const surface = deep.clone().lerp(accent, 0.32)

  context.fillStyle = toRgbaCss(surface, 1)
  context.fillRect(0, 0, width, height)

  for (let index = 0; index < 38; index += 1) {
    const centerX = random() * width
    const centerY = random() * height
    const radius = 4 + random() * 22

    const crater = context.createRadialGradient(
      centerX,
      centerY,
      radius * 0.1,
      centerX,
      centerY,
      radius
    )
    crater.addColorStop(0, toRgbaCss(deep, 0.85))
    crater.addColorStop(0.72, toRgbaCss(surface, 0.5))
    crater.addColorStop(1, toRgbaCss(accent, 0.45))
    context.fillStyle = crater
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()
  }

  scatterDots(context, width, height, accent, 150, random, 1.6)
}

const patternPainters: Record<
  DomainPattern,
  (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: SurfacePalette,
    random: () => number
  ) => void
> = {
  bands: drawBands,
  noise: drawDataGrid,
  continents: drawContinents,
  vortex: drawNeural,
  clouds: drawClouds,
  craters: drawCraters,
}

/** 程序化行星表面贴图：512×256 球面展开，同一 seed 结果完全一致 */
export const createSurfaceTexture = (
  pattern: DomainPattern,
  palette: SurfacePalette,
  seed: string
) => {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  const random = createSeededRandom(`${seed}:${pattern}`)

  if (context) {
    fillBase(
      context,
      width,
      height,
      new THREE.Color(palette.deep),
      new THREE.Color(palette.accent)
    )
    patternPainters[pattern](context, width, height, palette, random)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.wrapS = THREE.RepeatWrapping

  return texture
}

/** 中心恒星表面贴图：亮核 + 湍流颗粒，配合 Bloom 呈现恒星质感 */
export const createCoreTexture = () => {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  const random = createSeededRandom('knowledge-core')

  if (context) {
    const base = context.createLinearGradient(0, 0, 0, height)
    base.addColorStop(0, '#fff1c4')
    base.addColorStop(0.5, '#ffd479')
    base.addColorStop(1, '#ffb457')
    context.fillStyle = base
    context.fillRect(0, 0, width, height)

    for (let index = 0; index < 320; index += 1) {
      const centerX = random() * width
      const centerY = random() * height
      const radius = 3 + random() * 20
      const granule = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      )
      const tone = random() > 0.45 ? '255, 246, 214' : '255, 176, 82'
      granule.addColorStop(0, `rgba(${tone}, ${0.12 + random() * 0.32})`)
      granule.addColorStop(1, `rgba(${tone}, 0)`)
      context.fillStyle = granule
      context.beginPath()
      context.arc(centerX, centerY, radius, 0, Math.PI * 2)
      context.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  return texture
}
