import type {
  DemoReference,
  LearningResource,
  LearningStage,
  QuizMode,
  QuizQuestion,
} from './types'

// 当前仅用于前端原型，后续替换为真实 API。禁止将此处数据伪装为模型检索结果。
const imageEnhancementResources: LearningResource[] = [
  {
    id: 'illustrated-guide',
    type: 'text',
    title: '图文讲解',
    shortTitle: '图文讲解',
    description: '从灰度分布、对比度与应用场景理解图像增强。',
    primary: true,
  },
  {
    id: 'image-demo',
    type: 'image_demo',
    title: '影像演示',
    shortTitle: '影像演示',
    description: '通过增强前后遥感影像对比观察地物差异。',
  },
  {
    id: 'course-notes',
    type: 'document',
    title: '课程讲义',
    shortTitle: '课程讲义',
    description: '遥感图像增强方法速查与课后复习提纲。',
  },
]

const defaultLearningResources: LearningResource[] = [
  {
    id: 'node-overview',
    type: 'text',
    title: '节点图文讲解',
    shortTitle: '图文讲解',
    description: '根据当前节点信息生成的前端原型学习概览。',
    primary: true,
  },
]

export function getLearningResources(nodeId: string): LearningResource[] {
  return nodeId === '图像增强'
    ? imageEnhancementResources
    : defaultLearningResources
}

export const demoReferences: DemoReference[] = [
  {
    id: 'demo-ref-1',
    title: '遥感图像处理方法综述',
    detail: '前端原型占位资料 · 后续替换为课程资源 API',
    source: 'demo',
  },
  {
    id: 'demo-ref-2',
    title: 'Sentinel-2 数据处理指南',
    detail: '前端原型占位资料 · ESA 示例条目',
    source: 'demo',
  },
  {
    id: 'demo-ref-3',
    title: '图像增强的原理与应用',
    detail: '前端原型占位资料 · 非模型检索结果',
    source: 'demo',
  },
]

export const caseDemo = {
  title: '低对比度 Sentinel-2 影像增强',
  background:
    '该区域为河流与城市交错的典型场景。原始影像受低对比度影响，河道、植被和建成区边界不够清晰，需要通过增强改善目视判读效果。',
  objective: '观察变化、判断方法，并解释增强结果与潜在副作用。',
  source: 'Sentinel-2',
  region: '某河流流域',
  date: '2022-06-15',
  questions: [
    '增强后哪些地物信息变得更明显？',
    '为什么这种增强方式适合当前影像？',
    '这种处理可能带来哪些副作用？',
  ],
  hints: [
    '先比较河流边界、植被纹理和城市建成区的层次变化。',
    '结合“灰度集中、整体对比度低”判断方法适配性。',
  ],
  observationPoints: ['地物边界', '对比度变化', '细节提升', '方法适配性'],
} as const

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'single_choice',
    category: '基本概念',
    prompt: '遥感图像增强最主要的目标是什么？',
    options: [
      { id: 'A', label: '改变影像空间参考' },
      { id: 'B', label: '改善视觉效果并突出有用信息' },
      { id: 'C', label: '消除所有传感器误差' },
      { id: 'D', label: '提高影像空间分辨率' },
    ],
    correctAnswer: 'B',
    hints: [
      '区分“改善可解释性”和“修正空间位置”。',
      '关注题干中的“增强”而不是“校正”。',
    ],
    focus: ['增强目标', '预处理边界'],
    explanation: '图像增强重点是改善视觉质量、突出感兴趣信息，不改变空间参考。',
  },
  {
    id: 'q2',
    type: 'single_choice',
    category: '应用判断',
    prompt:
      '某幅遥感影像整体灰度集中、对比度较低，希望增强地物之间的灰度差异。你更推荐哪种处理方式？',
    options: [
      { id: 'A', label: '几何校正' },
      { id: 'B', label: '直方图均衡化' },
      { id: 'C', label: '波段配准' },
      { id: 'D', label: '大气校正' },
    ],
    correctAnswer: 'B',
    hints: [
      '先判断当前问题属于空间位置问题还是灰度分布问题。',
      '关注题干中的“灰度集中、对比度低”。',
    ],
    focus: ['灰度分布', '对比度提升', '方法适配性'],
    explanation:
      '直方图均衡化通过重新分配灰度值扩展动态范围，适合整体灰度集中、对比度较低的影像。',
  },
  {
    id: 'q3',
    type: 'single_choice',
    category: '方法选择',
    prompt: '当只希望提升局部区域的细节时，哪项策略更合适？',
    options: [
      { id: 'A', label: '局部对比度增强' },
      { id: 'B', label: '统一降低亮度' },
      { id: 'C', label: '删除低灰度像元' },
      { id: 'D', label: '重新投影' },
    ],
    correctAnswer: 'A',
    hints: ['关注“局部区域”这一限制条件。', '选择能适应邻域差异的方法。'],
    focus: ['局部增强', '应用场景'],
    explanation: '局部增强根据邻域统计特征调整对比度，更适合突出局部细节。',
  },
  {
    id: 'q4',
    type: 'single_choice',
    category: '风险意识',
    prompt: '过强的图像增强最可能带来什么问题？',
    options: [
      { id: 'A', label: '自动提高定位精度' },
      { id: 'B', label: '噪声放大和色彩失真' },
      { id: 'C', label: '自动补全缺失波段' },
      { id: 'D', label: '消除云层遮挡' },
    ],
    correctAnswer: 'B',
    hints: [
      '增强会同时作用于有效信号与干扰。',
      '思考对比度被过度拉伸后的视觉结果。',
    ],
    focus: ['增强副作用', '参数控制'],
    explanation: '增强强度过大可能同时放大噪声，并造成局部饱和或色彩失真。',
  },
  {
    id: 'q5',
    type: 'single_choice',
    category: '综合分析',
    prompt: '评价一次增强处理是否合理，最可靠的做法是什么？',
    options: [
      { id: 'A', label: '只看画面是否更亮' },
      { id: 'B', label: '只比较文件大小' },
      { id: 'C', label: '结合任务目标、地物可辨性与失真情况综合判断' },
      { id: 'D', label: '使用最大参数即可' },
    ],
    correctAnswer: 'C',
    hints: ['单一视觉指标不足以判断处理质量。', '同时考虑收益、目标和副作用。'],
    focus: ['结果评价', '综合判断'],
    explanation:
      '增强效果需要围绕任务目标，从可辨性、对比度和失真等多个维度综合评价。',
  },
]

export const quizSummaryDemo = {
  correct: 4,
  total: 5,
  score: '4 / 5',
  accuracy: 80,
  dimensions: [
    { label: '概念理解', value: 100 },
    { label: '方法辨析', value: 75 },
    { label: '应用判断', value: 67 },
    { label: '综合分析', value: 80 },
  ],
  weaknesses: ['空间域增强方法选择', '增强方法适用场景判断'],
} as const

export const practiceDemo = {
  objective:
    '选择合适的影像增强方法，提高地物边界与区域对比度，并简要说明处理思路。',
  methods: ['直方图均衡化', '线性拉伸', '局部对比度增强'],
  defaultParameters: {
    strength: 70,
    contrast: 130,
    localEnhancement: true,
  },
  duration: '8–12 分钟',
  defaultDescription:
    '增强后河道与地物边界更清晰，整体对比度提升，城市建成区与植被区域的区分更加明显。',
} as const

export const feedbackDemo = {
  mastery: 76,
  status: '基本掌握',
  activities: [
    { label: '学习材料', value: '100%', tone: 'cyan' },
    { label: '案例理解', value: '85%', tone: 'violet' },
    { label: '知识检测', value: '4/5', tone: 'sky' },
    { label: '实践任务', value: '78%', tone: 'emerald' },
  ],
  dimensions: [
    { label: '概念理解', value: 88 },
    { label: '方法选择', value: 72 },
    { label: '案例分析', value: 81 },
    { label: '实践应用', value: 65 },
    { label: '综合表现', value: 76 },
  ],
  evidence: [
    '图文学习已完成',
    'AI 辅助 2 次',
    '知识检测正确率 80%',
    '实践任务已提交',
  ],
  weaknesses: [
    '空间域增强方法的适用场景区分不够清晰',
    '参数调整与结果说明仍需巩固',
  ],
  suggestions: [
    '巩固直方图均衡化的适用场景',
    '再完成一次增强实践',
    '满足条件后进入“特征提取”',
  ],
} as const

export const stageLabels: Record<LearningStage, string> = {
  material: '学习材料',
  case: '案例理解',
  quiz: '知识检测',
  practice: '实践任务',
  feedback: '学习结果反馈',
}

export function getAIConfig(
  stage: LearningStage,
  quizMode: QuizMode,
  nodeTitle: string
) {
  if (stage === 'quiz' && quizMode === 'answering') {
    return {
      title: '检测提示',
      description: '答题阶段仅提供渐进式提示，不会直接给出答案。',
      quickQuestions: [] as string[],
      hintOnly: true,
    }
  }
  if (stage === 'quiz' && quizMode === 'review') {
    return {
      title: 'AI 错题讲解助手',
      description: '当前：知识检测 / 错题解析。可以结合资料换一种方式解释。',
      quickQuestions: [
        '为什么不是几何校正？',
        '直方图均衡化适用哪些场景？',
        '给我一个类似例子',
      ],
      hintOnly: false,
    }
  }
  if (stage === 'quiz') {
    return {
      title: 'AI 学习诊断助手',
      description: '结合本次前端原型结果，帮助你梳理薄弱点与复习方向。',
      quickQuestions: [
        '分析我的薄弱点',
        '推荐相关学习资料',
        '生成一个复习计划',
      ],
      hintOnly: false,
    }
  }

  const configs = {
    material: {
      title: 'AI 伴学助手',
      description: '围绕当前节点讲解概念、方法与资料依据。',
      quickQuestions: [
        `解释一下${nodeTitle}的基本原理`,
        '对比直方图均衡化和线性拉伸',
        '推荐相关学习资料',
      ],
    },
    case: {
      title: 'AI 案例助手',
      description: '帮助分析案例、解释增强效果，但不会替你完成分析。',
      quickQuestions: [
        '帮我分析增强前后影像差异',
        '给我一点观察提示',
        '这个案例适合用什么增强方法？',
      ],
    },
    practice: {
      title: 'AI 实训助手',
      description: '分析操作结果、解释参数影响，不会直接代做任务。',
      quickQuestions: [
        '如何选择增强方法？',
        '帮我分析当前结果',
        '给我一点提示，不要直接代做',
        '结果说明怎么写？',
      ],
    },
    feedback: {
      title: 'AI 反馈助手',
      description: '解读本次前端原型学习结果，并给出后续学习建议。',
      quickQuestions: [
        '为什么实践应用得分较低？',
        '帮我总结这节课学了什么',
        '给我一个复习计划',
        '进入下一节点前还需要注意什么？',
      ],
    },
  } as const

  return { ...configs[stage], hintOnly: false }
}
