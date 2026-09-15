import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react'
import type { CompanionMetadata } from '@/lib/chat-stream'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CompanionEvidence } from '@/components/companion-evidence'
import { demoReferences } from '../demo-data'
import type { ChatMessage, LearnerLevel } from '../types'

type NodeLearningAIPanelProps = {
  title: string
  description: string
  quickQuestions: readonly string[]
  hintOnly: boolean
  collapsed: boolean
  level: LearnerLevel
  conversationId?: string
  messages: ChatMessage[]
  streamingText: string
  chatInput: string
  isAiReplying: boolean
  additionalMetadata?: CompanionMetadata
  localHint?: string
  onToggle: () => void
  onLevelChange: (level: LearnerLevel) => void
  onChatInputChange: (value: string) => void
  onSend: (question?: string) => void
  onRequestHint?: () => void
  onContinueConversation: () => void
}

export function NodeLearningAIPanel({
  title,
  description,
  quickQuestions,
  hintOnly,
  collapsed,
  level,
  conversationId,
  messages,
  streamingText,
  chatInput,
  isAiReplying,
  additionalMetadata,
  localHint,
  onToggle,
  onLevelChange,
  onChatInputChange,
  onSend,
  onRequestHint,
  onContinueConversation,
}: NodeLearningAIPanelProps) {
  const answerListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = answerListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, streamingText, isAiReplying])

  const realReferences = useMemo(() => {
    const seen = new Set<string>()
    return [additionalMetadata, ...messages.map((message) => message.metadata)]
      .flatMap((metadata) => metadata?.references ?? [])
      .filter((reference) => {
        if (seen.has(reference.chunkId)) return false
        seen.add(reference.chunkId)
        return true
      })
  }, [additionalMetadata, messages])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  if (collapsed) {
    return (
      <aside className='flex min-h-14 items-start justify-center rounded-2xl border border-violet-400/15 bg-slate-950/65 p-2 backdrop-blur-sm'>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          aria-label='展开 AI 助手'
          onClick={onToggle}
          className='rounded-xl text-violet-200 hover:bg-violet-500/10'
        >
          <ChevronLeft className='size-4' />
        </Button>
      </aside>
    )
  }

  return (
    <aside className='flex min-h-0 flex-col overflow-hidden rounded-2xl border border-violet-400/15 bg-slate-950/70 shadow-[0_12px_30px_rgba(15,23,42,.42)] backdrop-blur-sm'>
      <div className='flex items-center justify-between border-b border-slate-800 px-3 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/12 text-violet-200'>
            <Bot className='size-4' />
          </span>
          <div className='min-w-0'>
            <h2 className='truncate text-sm font-semibold text-white'>
              {title}
            </h2>
            <p className='text-[10px] text-emerald-300'>● 在线</p>
          </div>
        </div>
        <Button
          type='button'
          size='icon'
          variant='ghost'
          aria-label='收起 AI 助手'
          onClick={onToggle}
          className='size-7 text-slate-400 hover:bg-slate-800 hover:text-white'
        >
          <ChevronRight className='size-4' />
        </Button>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-3'>
        <div className='rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-5 text-slate-300'>
          {description}
          {!hintOnly && (
            <label className='mt-2 flex items-center justify-between gap-2'>
              <span>讲解深度</span>
              <select
                aria-label='讲解深度'
                value={level}
                disabled={isAiReplying}
                onChange={(event) =>
                  onLevelChange(event.target.value as LearnerLevel)
                }
                className='rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200'
              >
                <option value='beginner'>入门</option>
                <option value='advanced'>进阶</option>
              </select>
            </label>
          )}
          {conversationId && !hintOnly && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={isAiReplying}
              onClick={onContinueConversation}
              className='mt-2 h-7 border-slate-700 bg-slate-950 text-[11px] text-slate-200'
            >
              在完整助手中继续
              <ExternalLink className='ml-1 size-3' />
            </Button>
          )}
        </div>

        {hintOnly ? (
          <div className='mt-3 rounded-xl border border-amber-400/20 bg-amber-500/8 p-3'>
            <div className='flex items-center gap-2 text-xs font-semibold text-amber-100'>
              <Lightbulb className='size-4 text-amber-300' />
              渐进式 Hint
            </div>
            <p className='mt-2 text-xs leading-5 text-slate-300'>
              {localHint ?? '先独立思考；需要时可逐级查看提示。'}
            </p>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={onRequestHint}
              className='mt-3 w-full border-amber-400/25 bg-amber-500/8 text-amber-100 hover:bg-amber-500/15'
            >
              <Lightbulb className='mr-2 size-3.5' />
              需要提示
            </Button>
            <p className='mt-2 text-[10px] text-slate-500'>
              前端本地提示，不调用 AI，不直接给出答案。
            </p>
          </div>
        ) : (
          <>
            <div className='mt-3 space-y-1.5'>
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type='button'
                  disabled={isAiReplying}
                  onClick={() => onSend(question)}
                  className='flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-sky-500/35 hover:bg-slate-900 disabled:opacity-50'
                >
                  <span>{question}</span>
                  <ChevronRight className='size-3.5 shrink-0 text-slate-500' />
                </button>
              ))}
            </div>

            <div className='mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5'>
              <div
                ref={answerListRef}
                role='log'
                aria-label='小遇的回答'
                className='max-h-64 min-h-28 space-y-2 overflow-y-auto pr-1'
              >
                {messages.length === 0 && !isAiReplying && (
                  <div className='flex items-start gap-2 text-xs leading-5 text-slate-400'>
                    <Sparkles className='mt-0.5 size-3.5 shrink-0 text-violet-300' />
                    你好，我是小遇。可以从上方问题开始，也可以输入你自己的问题。
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[92%] rounded-xl px-2.5 py-2 text-xs leading-5',
                      message.role === 'assistant'
                        ? 'border border-slate-700 bg-slate-900/80 text-slate-200'
                        : 'ml-auto border border-sky-500/25 bg-sky-500/10 text-sky-50'
                    )}
                  >
                    {message.content}
                    <CompanionEvidence metadata={message.metadata} />
                  </div>
                ))}
                {isAiReplying && (
                  <div className='flex max-w-[92%] items-start gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-xs leading-5 text-slate-200'>
                    {!streamingText && (
                      <Loader2 className='mt-0.5 size-3.5 animate-spin text-sky-300' />
                    )}
                    {streamingText || '小遇正在思考…'}
                  </div>
                )}
              </div>
              <div className='mt-2 flex items-end gap-2'>
                <Textarea
                  aria-label='向小遇提问'
                  value={chatInput}
                  disabled={isAiReplying}
                  onChange={(event) => onChatInputChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='输入你的问题…'
                  className='min-h-16 resize-none border-slate-700 bg-slate-950/70 text-xs text-white placeholder:text-slate-500'
                />
                <Button
                  type='button'
                  size='icon'
                  aria-label='发送问题'
                  disabled={isAiReplying || !chatInput.trim()}
                  onClick={() => onSend()}
                  className='size-9 shrink-0 rounded-xl bg-violet-500 text-white hover:bg-violet-400'
                >
                  <Send className='size-4' />
                </Button>
              </div>
              <p className='mt-1 text-[10px] text-slate-500'>
                Enter 发送，Shift + Enter 换行
              </p>
            </div>
          </>
        )}

        <section className='mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/45'>
          <div className='flex items-center justify-between border-b border-slate-800 px-3 py-2'>
            <span className='text-xs font-semibold text-white'>参考资料</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px]',
                realReferences.length
                  ? 'bg-emerald-500/12 text-emerald-200'
                  : 'bg-amber-500/10 text-amber-200'
              )}
            >
              {realReferences.length ? '小遇真实引用' : '前端 Demo 占位'}
            </span>
          </div>
          <div className='space-y-2 p-3'>
            {realReferences.length
              ? realReferences.slice(0, 4).map((reference, index) => (
                  <div key={reference.chunkId} className='flex gap-2 text-xs'>
                    <span className='flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/12 text-[10px] text-emerald-200'>
                      {index + 1}
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-slate-200'>
                        {reference.locator}
                      </p>
                      <p className='truncate text-[10px] text-slate-500'>
                        {reference.sourceDocument}
                      </p>
                    </div>
                  </div>
                ))
              : demoReferences.map((reference, index) => (
                  <div key={reference.id} className='flex gap-2 text-xs'>
                    <span className='flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-500/12 text-[10px] text-sky-200'>
                      {index + 1}
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-slate-300'>
                        {reference.title}
                      </p>
                      <p className='text-[10px] leading-4 text-amber-200/65'>
                        {reference.detail}
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
