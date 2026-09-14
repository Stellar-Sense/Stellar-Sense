import { useState } from 'react'
import {
  BookOpen,
  FileText,
  Images,
  Lightbulb,
  Loader2,
  PlaySquare,
  Sparkles,
} from 'lucide-react'
import type { CompanionMetadata } from '@/lib/chat-stream'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CompanionEvidence } from '@/components/companion-evidence'
import type { LearningNodeDetail } from '../api'
import { DemoSatelliteImage } from '../components/demo-satellite-image'
import { getLearningResources } from '../demo-data'
import type { ResourceType } from '../types'

const resourceIcons: Record<ResourceType, typeof BookOpen> = {
  text: BookOpen,
  video: PlaySquare,
  document: FileText,
  code: FileText,
  image_demo: Images,
  interactive: Sparkles,
}

type MaterialViewProps = {
  node: LearningNodeDetail
  explanationText: string | null
  explanationMetadata?: CompanionMetadata
  explaining: boolean
  onExplain: () => void
}

export function MaterialView({
  node,
  explanationText,
  explanationMetadata,
  explaining,
  onExplain,
}: MaterialViewProps) {
  const learningResources = getLearningResources(node.id)
  const primaryResource =
    learningResources.find((resource) => resource.primary) ??
    learningResources[0]
  const [resourceId, setResourceId] = useState(primaryResource?.id ?? '')
  const visibleResources = learningResources.slice(0, 4)
  const overflowResources = learningResources.slice(4)
  const activeResource =
    learningResources.find((resource) => resource.id === resourceId) ??
    primaryResource

  return (
    <section className='space-y-4'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200'>
              <BookOpen className='size-5' />
            </span>
            <div>
              <h2 className='text-lg font-semibold text-white'>核心学习材料</h2>
              <p className='text-xs text-slate-400'>
                按当前知识节点动态提供可用学习资源
              </p>
            </div>
          </div>
        </div>
        <span className='rounded-full border border-amber-400/20 bg-amber-500/8 px-2.5 py-1 text-[10px] text-amber-200'>
          当前内容为前端原型 Demo
        </span>
      </header>

      {learningResources.length > 1 && (
        <div className='flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-950/55 p-1.5'>
          {visibleResources.map((resource) => {
            const Icon = resourceIcons[resource.type]
            return (
              <button
                key={resource.id}
                type='button'
                onClick={() => setResourceId(resource.id)}
                className={cn(
                  'flex min-w-32 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs transition',
                  activeResource?.id === resource.id
                    ? 'border-sky-400/50 bg-sky-500/15 text-white'
                    : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                )}
              >
                <Icon className='size-4' />
                {resource.shortTitle}
              </button>
            )
          })}
          {overflowResources.length > 0 && (
            <select
              aria-label='更多学习资源'
              value={
                overflowResources.some(
                  (resource) => resource.id === activeResource?.id
                )
                  ? activeResource?.id
                  : ''
              }
              onChange={(event) => setResourceId(event.target.value)}
              className='rounded-lg border border-transparent bg-slate-950 px-3 py-2 text-xs text-slate-400 hover:border-slate-700'
            >
              <option value='' disabled>
                更多资源 ({overflowResources.length})
              </option>
              {overflowResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.shortTitle}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {activeResource?.type === 'text' && (
        <article className='space-y-5 rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-5 sm:px-6'>
          <div>
            <p className='text-xs font-medium text-sky-300'>1. 核心概念</p>
            <h3 className='mt-1 text-xl font-semibold text-white'>
              {node.title}的基本原理
            </h3>
            <p className='mt-3 max-w-4xl text-sm leading-7 text-slate-300'>
              {node.concept}
            </p>
          </div>

          <div className='grid gap-4 lg:grid-cols-[1fr_1.1fr]'>
            <div className='space-y-3'>
              <p className='text-sm leading-7 text-slate-300'>{node.summary}</p>
              <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/8 p-3'>
                <div className='flex items-center gap-2 text-xs font-semibold text-cyan-100'>
                  <Lightbulb className='size-4 text-cyan-300' />
                  学习提示
                </div>
                <p className='mt-2 text-xs leading-6 text-slate-300'>
                  在遥感应用中，增强不改变地物的真实含义，而是改善信息的显示效果；使用时要关注噪声、边界和失真。
                </p>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <DemoSatelliteImage variant='before' className='min-h-52' />
              <DemoSatelliteImage variant='after' className='min-h-52' />
            </div>
          </div>

          <div>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-xs font-medium text-sky-300'>1.1 常见方法</p>
                <h3 className='mt-1 text-base font-semibold text-white'>
                  根据任务选择增强方法
                </h3>
              </div>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={explaining}
                onClick={onExplain}
                className='border-violet-400/25 bg-violet-500/8 text-violet-100 hover:bg-violet-500/15'
              >
                {explaining ? (
                  <Loader2 className='mr-2 size-3.5 animate-spin' />
                ) : (
                  <Sparkles className='mr-2 size-3.5' />
                )}
                让小遇解释
              </Button>
            </div>
            <div className='mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
              {node.methods.map((method, index) => (
                <div
                  key={method}
                  className='border-l-2 border-sky-400/55 bg-slate-900/55 px-3 py-2.5'
                >
                  <p className='text-xs font-medium text-white'>{method}</p>
                  <p className='mt-1 text-[11px] leading-5 text-slate-400'>
                    {index === 0
                      ? '扩展灰度动态范围'
                      : index === 1
                        ? '改善整体对比度'
                        : '适配特定目标与区域'}
                  </p>
                </div>
              ))}
            </div>
            {explanationText && (
              <div className='mt-3 rounded-xl border border-violet-400/20 bg-violet-500/8 p-3 text-xs leading-6 text-violet-100'>
                {explanationText}
                <CompanionEvidence metadata={explanationMetadata} />
              </div>
            )}
          </div>
        </article>
      )}

      {activeResource?.type === 'image_demo' && (
        <div className='rounded-2xl border border-slate-800 bg-slate-950/35 p-4'>
          <h3 className='text-base font-semibold text-white'>
            增强前后影像演示
          </h3>
          <p className='mt-1 text-xs text-slate-400'>
            {activeResource.description}
          </p>
          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            <DemoSatelliteImage variant='before' className='min-h-80' />
            <DemoSatelliteImage variant='after' className='min-h-80' />
          </div>
          <p className='mt-3 text-xs leading-6 text-slate-300'>
            观察河流边界、植被纹理与城市建成区的层次变化。该影像仅为代码生成的
            UI 示意，不代表真实遥感处理结果。
          </p>
        </div>
      )}

      {activeResource?.type === 'document' && (
        <div className='rounded-2xl border border-slate-800 bg-slate-950/35 p-5'>
          <div className='flex items-center gap-3'>
            <span className='flex size-10 items-center justify-center rounded-xl bg-violet-500/12 text-violet-200'>
              <FileText className='size-5' />
            </span>
            <div>
              <h3 className='font-semibold text-white'>图像增强课程讲义</h3>
              <p className='text-xs text-slate-400'>
                前端原型摘要 · 后续接入真实课程资源
              </p>
            </div>
          </div>
          <ol className='mt-5 grid gap-3 sm:grid-cols-3'>
            {[
              '基本概念与评价原则',
              '灰度变换与直方图方法',
              '局部增强、噪声与失真',
            ].map((title, index) => (
              <li
                key={title}
                className='rounded-xl border border-slate-800 bg-slate-900/45 p-3'
              >
                <span className='text-[10px] text-sky-300'>
                  章节 0{index + 1}
                </span>
                <p className='mt-1 text-sm text-slate-200'>{title}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
