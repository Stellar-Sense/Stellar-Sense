import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { streamChat } from '@/lib/chat-stream'
import { stageLabels } from './demo-data'
import type {
  ChatMessage,
  LearnerLevel,
  LearningStage,
  QuizMode,
} from './types'

let localIdSeed = 1000
const nextLocalId = () => {
  localIdSeed += 1
  return localIdSeed
}

type UseNodeLearningChatOptions = {
  nodeId: string
  nodeTitle: string
  progress: number
  stage: LearningStage
  quizMode: QuizMode
}

export function useNodeLearningChat({
  nodeId,
  nodeTitle,
  progress,
  stage,
  quizMode,
}: UseNodeLearningChatOptions) {
  const [conversationId, setConversationId] = useState<string>()
  const [level, setLevel] = useState<LearnerLevel>('beginner')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isAiReplying, setIsAiReplying] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const streamedRef = useRef('')
  const requestGenerationRef = useRef(0)

  const resetConversation = useCallback(() => {
    requestGenerationRef.current += 1
    setConversationId(undefined)
    setMessages([])
    setChatInput('')
    setIsAiReplying(false)
    setStreamingText('')
    streamedRef.current = ''
  }, [])

  const sendMessage = useCallback(
    (customQuestion?: string) => {
      const nextQuestion = (customQuestion ?? chatInput).trim()
      if (!nextQuestion || isAiReplying) return

      const requestGeneration = requestGenerationRef.current + 1
      requestGenerationRef.current = requestGeneration
      setMessages((previous) => [
        ...previous,
        { id: nextLocalId(), role: 'user', content: nextQuestion },
      ])
      setChatInput('')
      setIsAiReplying(true)
      setStreamingText('')
      streamedRef.current = ''

      void streamChat(
        {
          conversationId,
          message: nextQuestion,
          context: {
            nodeId,
            learnerLevel: level,
            scene:
              stage === 'quiz' && quizMode === 'review'
                ? 'exam_review'
                : 'preview',
            node: nodeTitle,
            stage: stageLabels[stage],
            progress: `${progress}%`,
          },
        },
        {
          onDelta: (delta) => {
            if (requestGenerationRef.current !== requestGeneration) return
            streamedRef.current += delta
            setStreamingText(streamedRef.current)
          },
          onDone: ({
            messageId,
            conversationId: nextConversationId,
            metadata,
          }) => {
            if (requestGenerationRef.current !== requestGeneration) return
            setConversationId(nextConversationId)
            setMessages((previous) => [
              ...previous,
              {
                id: messageId,
                role: 'assistant',
                content: streamedRef.current,
                metadata,
              },
            ])
            setIsAiReplying(false)
            setStreamingText('')
          },
          onError: (message) => {
            if (requestGenerationRef.current !== requestGeneration) return
            toast.error(message)
            setIsAiReplying(false)
            setStreamingText('')
          },
        }
      )
    },
    [
      chatInput,
      conversationId,
      isAiReplying,
      level,
      nodeId,
      nodeTitle,
      progress,
      quizMode,
      stage,
    ]
  )

  return {
    conversationId,
    level,
    setLevel,
    messages,
    chatInput,
    setChatInput,
    isAiReplying,
    streamingText,
    sendMessage,
    resetConversation,
  }
}
