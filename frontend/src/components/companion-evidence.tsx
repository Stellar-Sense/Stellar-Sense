import type { CompanionMetadata } from '@/lib/chat-stream'
import { t, useLocale } from '@/lib/i18n'

export function CompanionEvidence({
  metadata,
}: {
  metadata?: CompanionMetadata
}) {
  useLocale((state) => state.locale)

  if (!metadata) return null
  return (
    <div className='mt-2 border-t border-slate-600 pt-2 text-xs leading-5'>
      <p className='text-sky-200'>
        {metadata.mode === 'generated'
          ? t('小遇 · 依据资料生成')
          : metadata.mode === 'model_only'
            ? t('模型讲解 · 未检索到课程资料')
            : t('固定摘要 · {0}', metadata.reason ?? '备用内容')}
      </p>
      {metadata.references?.map((ref) => (
        <details key={ref.chunkId} className='mt-1'>
          <summary className='cursor-pointer'>
            {t('资料：')}
            {ref.locator}
          </summary>
          <p>{ref.text}</p>
          <p className='text-slate-400'>
            {ref.sourceDocument}
            {t('（知识星图摘要）')}
          </p>
        </details>
      ))}
      {metadata.suggestedAction && (
        <p className='mt-1'>
          {t('下一步：')}
          {metadata.suggestedAction}
        </p>
      )}
    </div>
  )
}
