import type { PathEntry } from './adaptive-api'

// The server's order is a recommendation. Only prerequisites define graph edges.
export function layoutPath(entries: PathEntry[], viewportWidth: number) {
  const byId = new Map(entries.map((entry) => [entry.nodeId, entry]))
  const parents = new Map(
    entries.map((entry) => [
      entry.nodeId,
      [...new Set(entry.prerequisites)].filter(
        (id) => byId.has(id) && id !== entry.nodeId
      ),
    ])
  )
  const ranks = new Map<string, number>()
  const pending = new Set(byId.keys())
  while (pending.size) {
    const ready = [...pending].filter((id) =>
      parents.get(id)!.every((parent) => ranks.has(parent))
    )
    // Invalid historical data must not hang rendering. The API validates DAGs.
    if (!ready.length) {
      for (const id of pending) ranks.set(id, 0)
      break
    }
    for (const id of ready) {
      ranks.set(
        id,
        Math.max(-1, ...parents.get(id)!.map((p) => ranks.get(p)!)) + 1
      )
      pending.delete(id)
    }
  }
  const layers: PathEntry[][] = []
  for (const entry of entries) {
    const rank = ranks.get(entry.nodeId)!
    ;(layers[rank] ??= []).push(entry)
  }
  const width = Math.max(
    viewportWidth,
    Math.max(1, ...layers.map((l) => l.length)) * 200 + 64
  )
  const placed = new Map<
    string,
    { entry: PathEntry; x: number; y: number; rank: number }
  >()
  layers.forEach((layer, rank) => {
    // Bring children towards their parents to reduce crossings within each layer.
    const center = (entry: PathEntry) => {
      const points = parents
        .get(entry.nodeId)!
        .map((id) => placed.get(id))
        .filter((p) => p !== undefined)
      return points.length
        ? points.reduce((sum, p) => sum + p.x, 0) / points.length
        : width / 2
    }
    layer.sort((a, b) => center(a) - center(b))
    layer.forEach((entry, index) => {
      placed.set(entry.nodeId, {
        entry,
        x: (width / layer.length) * (index + 0.5),
        y: 90 + rank * 270,
        rank,
      })
    })
  })
  return {
    width,
    height: Math.max(1, layers.length) * 270,
    layers,
    positions: entries.map((entry) => placed.get(entry.nodeId)!),
    edges: entries.flatMap((entry) =>
      parents.get(entry.nodeId)!.map((id) => ({
        source: placed.get(id)!,
        target: placed.get(entry.nodeId)!,
      }))
    ),
  }
}
