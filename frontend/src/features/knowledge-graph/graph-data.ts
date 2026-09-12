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

export const knowledgeNodeDetails: Record<string, NodeDetail> = {
  Transformer: {
    description: 'Transformer 是基于注意力机制的深度学习架构。',
    progress: 0,
  },
  Attention: {
    description: 'Attention 机制使模型能够关注关键信息并提升表达能力。',
    progress: 0,
  },
  'Self-Attention': {
    description: 'Self-Attention 能让模型在序列中自动建立上下文关系。',
    progress: 0,
  },
  CNN: {
    description: 'CNN 通过卷积核提取局部特征，适合图像分析任务。',
    progress: 45,
  },
  神经网络基础: {
    description: '神经网络基础涵盖感知机、反向传播和多层结构。',
    progress: 55,
  },
  遥感大模型应用: {
    description: '遥感大模型应用将基础模型迁移到地表分析和业务场景。',
    progress: 0,
  },
}

export const knowledgeNodesSeed: KnowledgeNode[] = [
  {
    id: '遥感概论',
    name: '遥感概论',
    domain: '遥感基础',
    status: 'mastered',
    x: 12,
    y: 24,
    prerequisites: [],
    duration: '30 分钟',
  },
  {
    id: '电磁波与遥感',
    name: '电磁波与遥感',
    domain: '遥感基础',
    status: 'mastered',
    x: 19,
    y: 12,
    prerequisites: ['遥感概论'],
    duration: '35 分钟',
  },
  {
    id: '遥感传感器',
    name: '遥感传感器',
    domain: '遥感基础',
    status: 'mastered',
    x: 24,
    y: 34,
    prerequisites: ['遥感概论'],
    duration: '40 分钟',
  },
  {
    id: '遥感成像原理',
    name: '遥感成像原理',
    domain: '遥感基础',
    status: 'mastered',
    x: 8,
    y: 38,
    prerequisites: ['电磁波与遥感'],
    duration: '45 分钟',
  },
  {
    id: 'Python 基础',
    name: 'Python 基础',
    domain: 'Python 数据处理',
    status: 'mastered',
    x: 29,
    y: 12,
    prerequisites: [],
    duration: '25 分钟',
  },
  {
    id: 'NumPy',
    name: 'NumPy',
    domain: 'Python 数据处理',
    status: 'mastered',
    x: 38,
    y: 8,
    prerequisites: ['Python 基础'],
    duration: '35 分钟',
  },
  {
    id: 'Pandas',
    name: 'Pandas',
    domain: 'Python 数据处理',
    status: 'mastered',
    x: 44,
    y: 20,
    prerequisites: ['Python 基础'],
    duration: '40 分钟',
  },
  {
    id: 'GDAL',
    name: 'GDAL',
    domain: 'Python 数据处理',
    status: 'mastered',
    x: 28,
    y: 30,
    prerequisites: ['NumPy'],
    duration: '50 分钟',
  },
  {
    id: 'Rasterio',
    name: 'Rasterio',
    domain: 'Python 数据处理',
    status: 'mastered',
    x: 42,
    y: 34,
    prerequisites: ['GDAL'],
    duration: '45 分钟',
  },
  {
    id: '影像预处理',
    name: '影像预处理',
    domain: '遥感影像处理',
    status: 'mastered',
    x: 53,
    y: 14,
    prerequisites: ['遥感成像原理'],
    duration: '35 分钟',
  },
  {
    id: '几何校正',
    name: '几何校正',
    domain: '遥感影像处理',
    status: 'mastered',
    x: 66,
    y: 12,
    prerequisites: ['影像预处理'],
    duration: '45 分钟',
  },
  {
    id: '辐射校正',
    name: '辐射校正',
    domain: '遥感影像处理',
    status: 'mastered',
    x: 72,
    y: 24,
    prerequisites: ['影像预处理'],
    duration: '40 分钟',
  },
  {
    id: '图像增强',
    name: '图像增强',
    domain: '遥感影像处理',
    status: 'mastered',
    x: 58,
    y: 34,
    prerequisites: ['几何校正'],
    duration: '30 分钟',
  },
  {
    id: '特征提取',
    name: '特征提取',
    domain: '遥感影像处理',
    status: 'mastered',
    x: 71,
    y: 37,
    prerequisites: ['图像增强'],
    duration: '35 分钟',
  },
  {
    id: '神经网络基础',
    name: '神经网络基础',
    domain: '深度学习',
    status: 'learning',
    x: 18,
    y: 66,
    prerequisites: ['Python 基础'],
    duration: '50 分钟',
  },
  {
    id: 'CNN',
    name: 'CNN',
    domain: '深度学习',
    status: 'learning',
    x: 28,
    y: 78,
    prerequisites: ['神经网络基础'],
    duration: '45 分钟',
  },
  {
    id: '目标检测',
    name: '目标检测',
    domain: '深度学习',
    status: 'unlearned',
    x: 34,
    y: 63,
    prerequisites: ['CNN'],
    duration: '55 分钟',
  },
  {
    id: '图像分类',
    name: '图像分类',
    domain: '深度学习',
    status: 'unlearned',
    x: 20,
    y: 82,
    prerequisites: ['CNN'],
    duration: '40 分钟',
  },
  {
    id: '语义分割',
    name: '语义分割',
    domain: '深度学习',
    status: 'unlearned',
    x: 32,
    y: 89,
    prerequisites: ['目标检测'],
    duration: '60 分钟',
  },
  {
    id: 'Attention',
    name: 'Attention',
    domain: 'Transformer',
    status: 'unlearned',
    x: 50,
    y: 59,
    prerequisites: ['神经网络基础'],
    duration: '35 分钟',
  },
  {
    id: 'Self-Attention',
    name: 'Self-Attention',
    domain: 'Transformer',
    status: 'unlearned',
    x: 58,
    y: 72,
    prerequisites: ['Attention'],
    duration: '40 分钟',
  },
  {
    id: 'Transformer',
    name: 'Transformer',
    domain: 'Transformer',
    status: 'unlearned',
    x: 64,
    y: 61,
    prerequisites: ['Self-Attention', 'CNN'],
    duration: '45 分钟',
  },
  {
    id: 'Vision Transformer',
    name: 'Vision Transformer',
    domain: 'Transformer',
    status: 'unlearned',
    x: 51,
    y: 82,
    prerequisites: ['Transformer'],
    duration: '50 分钟',
  },
  {
    id: 'Swin Transformer',
    name: 'Swin Transformer',
    domain: 'Transformer',
    status: 'unlearned',
    x: 68,
    y: 83,
    prerequisites: ['Vision Transformer'],
    duration: '55 分钟',
  },
  {
    id: '多模态模型',
    name: '多模态模型',
    domain: '遥感大模型',
    status: 'unlearned',
    x: 78,
    y: 48,
    prerequisites: ['Transformer'],
    duration: '60 分钟',
  },
  {
    id: '遥感视觉语言模型',
    name: '遥感视觉语言模型',
    domain: '遥感大模型',
    status: 'unlearned',
    x: 89,
    y: 58,
    prerequisites: ['多模态模型'],
    duration: '70 分钟',
  },
  {
    id: '遥感基础模型',
    name: '遥感基础模型',
    domain: '遥感大模型',
    status: 'unlearned',
    x: 82,
    y: 70,
    prerequisites: ['Transformer'],
    duration: '65 分钟',
  },
  {
    id: '遥感大模型应用',
    name: '遥感大模型应用',
    domain: '遥感大模型',
    status: 'unlearned',
    x: 92,
    y: 74,
    prerequisites: ['遥感视觉语言模型'],
    duration: '50 分钟',
  },
]

export type KnowledgeEdge = {
  from: string
  to: string
}

export const edges: KnowledgeEdge[] = [
  { from: '遥感概论', to: '电磁波与遥感' },
  { from: '电磁波与遥感', to: '遥感传感器' },
  { from: '遥感概论', to: '遥感成像原理' },
  { from: 'Python 基础', to: 'NumPy' },
  { from: 'Python 基础', to: 'Pandas' },
  { from: 'NumPy', to: 'GDAL' },
  { from: 'GDAL', to: 'Rasterio' },
  { from: '遥感成像原理', to: '影像预处理' },
  { from: '影像预处理', to: '几何校正' },
  { from: '几何校正', to: '图像增强' },
  { from: '图像增强', to: '特征提取' },
  { from: '遥感成像原理', to: '神经网络基础' },
  { from: '神经网络基础', to: 'CNN' },
  { from: 'CNN', to: '目标检测' },
  { from: 'CNN', to: '图像分类' },
  { from: '目标检测', to: '语义分割' },
  { from: '神经网络基础', to: 'Attention' },
  { from: 'Attention', to: 'Self-Attention' },
  { from: 'Self-Attention', to: 'Transformer' },
  { from: 'Transformer', to: 'Vision Transformer' },
  { from: 'Vision Transformer', to: 'Swin Transformer' },
  { from: 'Transformer', to: '多模态模型' },
  { from: '多模态模型', to: '遥感视觉语言模型' },
  { from: 'Transformer', to: '遥感基础模型' },
  { from: '遥感视觉语言模型', to: '遥感大模型应用' },
]

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
        gradient:
          'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(51,65,85,0.92) 100%)',
        border: 'rgba(148,163,184,0.72)',
        ring: 'rgba(71,85,105,0.2)',
        glow: 'rgba(15,23,42,0.12)',
      }
  }
}

export const getNodeDetail = (node: KnowledgeNode): NodeDetail => {
  const preset = knowledgeNodeDetails[node.id]

  if (preset) {
    return preset
  }

  if (node.status === 'mastered') {
    return {
      description: `${node.name} 是当前学习路径中已经建立的关键知识点。`,
      progress: 100,
    }
  }

  if (node.status === 'learning') {
    return {
      description: `${node.name} 正处于学习阶段，适合深入理解与持续实践。`,
      progress: 55,
    }
  }

  return {
    description: `${node.name} 是 ${node.domain} 中尚未开始学习的核心知识节点。`,
    progress: 0,
  }
}
