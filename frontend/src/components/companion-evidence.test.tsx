import { beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { useLocale } from '@/lib/i18n'
import { CompanionEvidence } from './companion-evidence'

beforeEach(() => useLocale.getState().setLocale('zh'))

describe('CompanionEvidence', () => {
  it('shows traceable BM25 chunk metadata without labeling it as a summary', async () => {
    const screen = await render(
      <CompanionEvidence
        metadata={{
          mode: 'generated',
          retrievalMode: 'bm25',
          references: [
            {
              chunkId: 'chk_image_enhancement',
              text: '直方图均衡化可以提高影像整体对比度。',
              sourceDocument: 'image_enhancement.md',
              locator: '直方图均衡化',
              evidenceKind: 'retrieved_chunk',
              nodeId: '图像增强',
            },
          ],
        }}
      />
    )

    await expect.element(screen.getByText('（课程检索片段）')).toBeInTheDocument()
    await expect.element(screen.getByText(/chk_image_enhancement/)).toBeInTheDocument()
    await expect.element(screen.getByText(/图像增强/)).toBeInTheDocument()
    await expect.element(screen.getByText(/retrieved_chunk/)).toBeInTheDocument()
    await expect.element(screen.getByText('（知识星图摘要）')).not.toBeInTheDocument()
  })
})
