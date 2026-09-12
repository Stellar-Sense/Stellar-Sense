import {
  domainOrder,
  getNodeDetail,
  type KnowledgeEdge,
  type KnowledgeNode,
} from './graph-data'
import { hashString } from './hash'

/**
 * 知识星系布局：把 2D 星图的节点/边映射到 3D 极坐标。
 * - 前置层级（拓扑深度）→ 轨道半径：没有前置的在内圈，先修链越深越靠外
 * - 领域 → 扇区角度 + 由调用方选用的领域配色
 * - 节点 id 哈希 → 确定性的角度与高度微抖动（同层同领域节点不重叠，且每次结果一致）
 * 纯函数、无 three 依赖，便于单测与在 2D/3D 视图之间共享。
 */

export type StarMapLayoutOptions = {
  innerRadius?: number
  ringGap?: number
  sectorGapDegrees?: number
  yJitter?: number
  minPlanetRadius?: number
  maxPlanetRadius?: number
}

export type StarMapVector3 = {
  x: number
  y: number
  z: number
}

export type StarMapPlanet = {
  nodeId: string
  domain: string
  domainIndex: number
  depth: number
  /** 扇区内的最终角度（弧度） */
  angle: number
  /** 轨道半径（场景单位） */
  radius: number
  position: StarMapVector3
  planetRadius: number
  hasRing: boolean
}

export type StarMapLayout = {
  planets: StarMapPlanet[]
  planetMap: Record<string, StarMapPlanet>
  maxDepth: number
  ringRadii: number[]
  sectorSpan: number
}

const defaultOptions: Required<StarMapLayoutOptions> = {
  innerRadius: 7,
  ringGap: 3.8,
  sectorGapDegrees: 4,
  yJitter: 0.45,
  minPlanetRadius: 0.9,
  maxPlanetRadius: 1.6,
}

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

const round = (value: number) => Math.round(value * 1000) / 1000

/**
 * 计算拓扑深度：无前置 = 0，其余 = 前置深度最大值 + 1。
 * 使用 Kahn 松弛，遇到环时对未定层节点做兜底处理，保证一定终止。
 */
export const computeNodeDepths = (
  nodes: readonly KnowledgeNode[],
  edges: readonly KnowledgeEdge[]
): Map<string, number> => {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>()

  for (const node of nodes) {
    outgoing.set(node.id, [])
    indegree.set(node.id, 0)
  }

  for (const edge of edges) {
    if (
      edge.from === edge.to ||
      !nodeIds.has(edge.from) ||
      !nodeIds.has(edge.to)
    ) {
      continue
    }
    outgoing.get(edge.from)?.push(edge.to)
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1)
  }

  const depths = new Map<string, number>()
  const queue: string[] = []

  for (const node of nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      depths.set(node.id, 0)
      queue.push(node.id)
    }
  }

  let cursor = 0
  while (cursor < queue.length) {
    const current = queue[cursor]
    cursor += 1
    const currentDepth = depths.get(current) ?? 0

    for (const next of outgoing.get(current) ?? []) {
      depths.set(next, Math.max(depths.get(next) ?? 0, currentDepth + 1))
      const left = (indegree.get(next) ?? 0) - 1
      indegree.set(next, left)
      if (left === 0) {
        queue.push(next)
      }
    }
  }

  // 环兜底：仍未有层级的节点按"已定层前置"向下顺延，无前置则落在 0 层
  for (const node of nodes) {
    if (depths.has(node.id)) continue

    let depth = 0
    for (const edge of edges) {
      if (edge.to !== node.id) continue
      const sourceDepth = depths.get(edge.from)
      if (sourceDepth === undefined) continue
      depth = Math.max(depth, sourceDepth + 1)
    }
    depths.set(node.id, depth)
  }

  return depths
}

/**
 * 选中节点时用于高亮的关联集合：自身 + 递归前置链 + 直接后继。
 * 与 2D 星图的 relatedNodeIds 语义一致，但前置关系沿依赖链递归展开。
 */
export const collectRelatedIds = (
  nodeId: string,
  edges: readonly KnowledgeEdge[]
): Set<string> => {
  const incoming = new Map<string, string[]>()

  for (const edge of edges) {
    const sources = incoming.get(edge.to) ?? []
    sources.push(edge.from)
    incoming.set(edge.to, sources)
  }

  const related = new Set<string>([nodeId])
  const queue: string[] = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift() as string

    for (const prerequisite of incoming.get(current) ?? []) {
      if (related.has(prerequisite)) continue
      related.add(prerequisite)
      queue.push(prerequisite)
    }
  }

  for (const edge of edges) {
    if (edge.from === nodeId) related.add(edge.to)
  }

  return related
}

export const buildStarMapLayout = (
  nodes: readonly KnowledgeNode[],
  edges: readonly KnowledgeEdge[],
  options: StarMapLayoutOptions = {}
): StarMapLayout => {
  const config = { ...defaultOptions, ...options }
  const depths = computeNodeDepths(nodes, edges)
  const incoming = new Map<string, number>()

  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
  }

  const domains: string[] = domainOrder.filter((domain) =>
    nodes.some((node) => node.domain === domain)
  )

  const unknownDomains = [...new Set(nodes.map((node) => node.domain))]
    .filter((domain) => !domains.includes(domain))
    .sort(compareText)

  domains.push(...unknownDomains)

  const domainCount = Math.max(domains.length, 1)
  const sectorSpan = (Math.PI * 2) / domainCount
  const sectorGap = (config.sectorGapDegrees * Math.PI) / 180
  const radiusSpan = config.maxPlanetRadius - config.minPlanetRadius
  const planets: StarMapPlanet[] = []

  domains.forEach((domain, domainIndex) => {
    const domainNodes = nodes
      .filter((node) => node.domain === domain)
      .sort(
        (left, right) =>
          (depths.get(left.id) ?? 0) - (depths.get(right.id) ?? 0) ||
          compareText(left.id, right.id)
      )

    const start = -Math.PI / 2 + domainIndex * sectorSpan + sectorGap / 2
    const end = -Math.PI / 2 + (domainIndex + 1) * sectorSpan - sectorGap / 2
    const slotSpan =
      domainNodes.length > 1
        ? (end - start) / (domainNodes.length - 1)
        : sectorSpan - sectorGap

    domainNodes.forEach((node, index) => {
      const slot =
        domainNodes.length > 1 ? start + slotSpan * index : (start + end) / 2
      const jitter = (hashString(node.id) - 0.5) * slotSpan * 0.3
      // 抖动后夹回扇区可用范围，保证节点始终落在所属领域扇区内
      const angle = Math.min(Math.max(slot + jitter, start), end)
      const depth = depths.get(node.id) ?? 0
      const radius = config.innerRadius + depth * config.ringGap
      const height =
        (hashString(`${node.id}:height`) - 0.5) * 2 * config.yJitter
      const dependencyCount = incoming.get(node.id) ?? 0
      const importance = Math.min(
        node.prerequisites.length + dependencyCount,
        4
      )
      const detail = getNodeDetail(node)

      planets.push({
        nodeId: node.id,
        domain,
        domainIndex,
        depth,
        angle: round(angle),
        radius: round(radius),
        position: {
          x: round(Math.cos(angle) * radius),
          y: round(height),
          z: round(Math.sin(angle) * radius),
        },
        planetRadius: round(
          config.minPlanetRadius + (importance / 4) * radiusSpan
        ),
        hasRing: detail.progress >= 50 || dependencyCount >= 2,
      })
    })
  })

  const maxDepth = planets.reduce(
    (accumulator, planet) => Math.max(accumulator, planet.depth),
    0
  )
  const ringRadii = Array.from({ length: maxDepth + 1 }, (_, depth) =>
    round(config.innerRadius + depth * config.ringGap)
  )

  return {
    planets,
    planetMap: Object.fromEntries(
      planets.map((planet) => [planet.nodeId, planet])
    ),
    maxDepth,
    ringRadii,
    sectorSpan,
  }
}
