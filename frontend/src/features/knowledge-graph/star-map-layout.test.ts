import { describe, expect, it } from 'vitest'
import {
  edges,
  knowledgeNodesSeed,
  type KnowledgeEdge,
  type KnowledgeNode,
} from './graph-data'
import { buildStarMapLayout, computeNodeDepths } from './star-map-layout'

const node = (id: string, domain = 'A', prerequisites: string[] = []) => ({
  id,
  name: id,
  domain,
  status: 'unlearned' as const,
  x: 0,
  y: 0,
  prerequisites,
  duration: '10 分钟',
})

describe('computeNodeDepths', () => {
  it('places roots at depth 0 and layers descendants by prerequisites', () => {
    const nodes: KnowledgeNode[] = [node('a'), node('b'), node('c')]
    const edgelist: KnowledgeEdge[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ]

    const depths = computeNodeDepths(nodes, edgelist)

    expect(depths.get('a')).toBe(0)
    expect(depths.get('b')).toBe(1)
    expect(depths.get('c')).toBe(2)
  })

  it('takes the longest prerequisite chain for multi-parent nodes', () => {
    const nodes: KnowledgeNode[] = [node('root'), node('mid'), node('leaf')]
    const edgelist: KnowledgeEdge[] = [
      { from: 'root', to: 'mid' },
      { from: 'mid', to: 'leaf' },
      { from: 'root', to: 'leaf' },
    ]

    const depths = computeNodeDepths(nodes, edgelist)

    expect(depths.get('leaf')).toBe(2)
  })

  it('stays finite on cyclic input and ignores unknown endpoints', () => {
    const nodes: KnowledgeNode[] = [node('a'), node('b')]
    const edgelist: KnowledgeEdge[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
      { from: 'a', to: 'missing' },
      { from: 'missing', to: 'b' },
      { from: 'a', to: 'a' },
    ]

    const depths = computeNodeDepths(nodes, edgelist)

    expect(depths.get('a')).toBe(0)
    expect(depths.get('b')).toBe(1)
  })

  it('keeps every edge pointing to a deeper layer on the seed data', () => {
    const depths = computeNodeDepths(knowledgeNodesSeed, edges)

    for (const edge of edges) {
      expect(depths.get(edge.to)).toBeGreaterThan(depths.get(edge.from) ?? 0)
    }
  })
})

describe('buildStarMapLayout', () => {
  const layout = buildStarMapLayout(knowledgeNodesSeed, edges)

  it('creates one planet per node with unique ids', () => {
    expect(layout.planets).toHaveLength(knowledgeNodesSeed.length)
    expect(new Set(layout.planets.map((planet) => planet.nodeId)).size).toBe(
      knowledgeNodesSeed.length
    )
  })

  it('derives the orbit radius from the topological depth only', () => {
    const radiusByDepth = new Map<number, Set<number>>()

    for (const planet of layout.planets) {
      const radii = radiusByDepth.get(planet.depth) ?? new Set<number>()
      radii.add(planet.radius)
      radiusByDepth.set(planet.depth, radii)
    }

    for (const radii of radiusByDepth.values()) {
      expect(radii.size).toBe(1)
    }

    expect(layout.ringRadii).toHaveLength(layout.maxDepth + 1)
    expect(layout.planets.every((planet) => planet.radius >= 7)).toBe(true)
  })

  it('keeps every planet inside its domain sector', () => {
    for (const planet of layout.planets) {
      const sectorStart = -Math.PI / 2 + planet.domainIndex * layout.sectorSpan
      const sectorEnd = sectorStart + layout.sectorSpan

      expect(planet.angle).toBeGreaterThanOrEqual(sectorStart)
      expect(planet.angle).toBeLessThanOrEqual(sectorEnd)
    }
  })

  it('spreads planets of one domain across distinct angles', () => {
    const anglesByDomain = new Map<string, number[]>()

    for (const planet of layout.planets) {
      const angles = anglesByDomain.get(planet.domain) ?? []
      angles.push(planet.angle)
      anglesByDomain.set(planet.domain, angles)
    }

    for (const angles of anglesByDomain.values()) {
      expect(new Set(angles).size).toBe(angles.length)
    }
  })

  it('is deterministic for identical input', () => {
    expect(buildStarMapLayout(knowledgeNodesSeed, edges)).toEqual(layout)
  })

  it('falls back to a usable layout when a domain is unknown', () => {
    const nodes = [node('x', '未知领域'), node('y', 'A')]
    const custom = buildStarMapLayout(nodes, [])

    expect(custom.planets).toHaveLength(2)
    expect(custom.sectorSpan).toBeCloseTo(Math.PI)
  })
})
