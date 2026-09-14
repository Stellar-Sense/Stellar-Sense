/**
 * 知识图谱的类型与主题工具。
 * 节点数据（含状态 / 掌握度 / 简介）由后端 /api/knowledge/graph 提供。
 */

export type NodeStatus = 'mastered' | 'learning' | 'unlearned'

export type KnowledgeNode = {
  id: string
  name: string
  domain: string
  status: NodeStatus
  x: number
  y: number
  prerequisites: string[]
  duration: string
  /** 后端返回的节点简介；局部构造的节点可省略 */
  description?: string
  /** 后端返回的掌握度 0-100；局部构造的节点可省略 */
  progress?: number
}

export type KnowledgeEdge = {
  id?: number
  relation?: 'prerequisite' | 'contains' | 'applies' | 'related'
  reason?: string
  from: string
  to: string
}

export type NodeDetail = {
  description: string
  progress: number
}

export type DomainPattern =
  | 'bands'
  | 'noise'
  | 'continents'
  | 'vortex'
  | 'clouds'
  | 'craters'

export type DomainTheme = {
  accent: string
  deep: string
  pattern: DomainPattern
}

export const domainOrder = [
  '遥感基础',
  'Python 数据处理',
  '遥感影像处理',
  '深度学习',
  'Transformer',
  '遥感大模型',
] as const

const fallbackDomainTheme: DomainTheme = {
  accent: '#94a3b8',
  deep: '#1e293b',
  pattern: 'noise',
}

const domainThemes: Record<string, DomainTheme> = {
  遥感基础: { accent: '#38bdf8', deep: '#0c4a6e', pattern: 'bands' },
  'Python 数据处理': { accent: '#34d399', deep: '#065f46', pattern: 'noise' },
  遥感影像处理: { accent: '#fbbf24', deep: '#78350f', pattern: 'continents' },
  深度学习: { accent: '#a78bfa', deep: '#4c1d95', pattern: 'vortex' },
  Transformer: { accent: '#f472b6', deep: '#831843', pattern: 'clouds' },
  遥感大模型: { accent: '#f87171', deep: '#7f1d1d', pattern: 'craters' },
}

export const getDomainTheme = (domain: string): DomainTheme =>
  domainThemes[domain] ?? fallbackDomainTheme

export const statusLabel: Record<NodeStatus, string> = {
  mastered: '已掌握',
  learning: '当前学习',
  unlearned: '未学习',
}

export const getNodeStatusColors = (status: NodeStatus) => {
  switch (status) {
    case 'mastered':
      return {
        gradient:
          'linear-gradient(135deg, rgba(59,130,246,0.92) 0%, rgba(56,189,248,0.9) 100%)',
        border: 'rgba(125,211,252,0.9)',
        ring: 'rgba(96,165,250,0.45)',
        glow: 'rgba(59,130,246,0.26)',
      }
    case 'learning':
      return {
        gradient:
          'linear-gradient(135deg, rgba(168,85,247,0.96) 0%, rgba(59,130,246,0.92) 100%)',
        border: 'rgba(196,181,253,0.95)',
        ring: 'rgba(168,85,247,0.45)',
        glow: 'rgba(139,92,246,0.32)',
      }
    default:
      return {
        gradient: 'var(--planet-unlearned-fill)',
        border: 'rgba(148,163,184,0.72)',
        ring: 'rgba(71,85,105,0.2)',
        glow: 'rgba(15,23,42,0.12)',
      }
  }
}

/** 节点详情：优先使用后端数据，缺失时按状态生成兜底文案 */
export const getNodeDetail = (node: KnowledgeNode): NodeDetail => {
  if (node.description) {
    return { description: node.description, progress: node.progress ?? 0 }
  }

  if (node.status === 'mastered') {
    return {
      description: `${node.name} 是当前学习路径中已经建立的关键知识点。`,
      progress: node.progress ?? 100,
    }
  }

  if (node.status === 'learning') {
    return {
      description: `${node.name} 正处于学习阶段，适合深入理解与持续实践。`,
      progress: node.progress ?? 55,
    }
  }

  return {
    description: `${node.name} 是 ${node.domain} 中尚未开始学习的核心知识节点。`,
    progress: node.progress ?? 0,
  }
}
