import type { CompanionMetadata } from '@/lib/chat-stream'

export const LEARNING_STAGES = [
  'material',
  'case',
  'quiz',
  'practice',
  'feedback',
] as const

export type LearningStage = (typeof LEARNING_STAGES)[number]
export type QuizMode = 'answering' | 'summary' | 'review'
export type LearnerLevel = 'beginner' | 'advanced'

export type ResourceType =
  | 'text'
  | 'video'
  | 'document'
  | 'code'
  | 'image_demo'
  | 'interactive'

export type LearningResource = {
  id: string
  type: ResourceType
  title: string
  shortTitle: string
  description: string
  primary?: boolean
}

export type QuizQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'image_choice'
  | 'ordering'
  | 'short_answer'

export type QuizOption = {
  id: string
  label: string
}

export type QuizQuestion = {
  id: string
  type: QuizQuestionType
  category: string
  prompt: string
  options: QuizOption[]
  correctAnswer: string
  hints: string[]
  focus: string[]
  explanation: string
}

export type ChatMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  metadata?: CompanionMetadata
}

export type DemoReference = {
  id: string
  title: string
  detail: string
  source: 'demo'
}

export type StageChangeHandler = (stage: LearningStage) => void
