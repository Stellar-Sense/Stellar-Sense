import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test-utils/query-client'
import { beforeEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { apiClient } from '@/lib/api-client'
import { LearningPath } from '@/features/dashboard/components/learning-path'
import {
  usePathPlan,
  useRegeneratePath,
  useUpdateGoal,
  type PathPlanPayload,
} from './adaptive-api'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

function fixture(version = 1): PathPlanPayload {
  const ids = version === 1 ? ['a', 'b'] : ['b', 'a']
  return {
    entries: ids.map((id, index) => ({
      nodeId: id,
      name: `节点 ${id}`,
      domain: '遥感',
      kind: 'concept',
      status: 'ready',
      mastery: 0,
      confidence: 0,
      prerequisites: [],
      isGoal: true,
      isReview: false,
      difficulty: 1,
      taskId: null,
      taskTitle: null,
      minutes: 20,
      sessions: [{ day: index + 1, minutes: 20 }],
      reasons: [],
      priority: 1,
    })),
    goal: { nodeIds: ids, dailyMinutes: 30, version },
    nodes: ids.map((id) => ({
      id,
      name: `节点 ${id}`,
      domain: '遥感',
      kind: 'concept',
      difficulty: 1,
      minutes: 20,
      description: '',
      x: 0,
      y: 0,
      sortOrder: 0,
    })),
    version,
    changed: true,
    ruleVersion: 'test',
    graphRevision: 1,
    changes: [],
    states: {},
    createdAt: '2026-09-14',
    completedNodeIds: [],
    targetNodeIds: ids,
    goalReached: false,
    totalMinutes: 40,
    estimatedDays: 2,
    nextNodeId: ids[0],
  }
}

function Controls() {
  const plan = usePathPlan()
  const update = useUpdateGoal()
  const regenerate = useRegeneratePath()
  return (
    <>
      <output aria-label='route order'>
        {plan.data?.entries.map((entry) => entry.nodeId).join(',')}
      </output>
      <button
        onClick={() => update.mutate({ nodeIds: ['b'], dailyMinutes: 30 })}
        disabled={update.isPending}
      >
        save targets
      </button>
      <button
        onClick={() => regenerate.mutate()}
        disabled={regenerate.isPending}
      >
        regenerate
      </button>
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient.get).mockResolvedValue({ data: fixture() })
  vi.mocked(apiClient.put).mockResolvedValue({ data: fixture(2) })
  vi.mocked(apiClient.post).mockResolvedValue({ data: fixture(3) })
})

it('updates dashboard route previews from the same cache after saving and regenerating', async () => {
  const client = createTestQueryClient()
  for (const key of ['dashboard', 'learning', 'path'])
    client.setQueryData([key, key === 'path' ? 'history' : 'summary'], {})
  const screen = await render(
    <QueryClientProvider client={client}>
      <Controls />
      <LearningPath />
    </QueryClientProvider>
  )
  await expect
    .element(screen.getByLabelText('route order'))
    .toHaveTextContent('a,b')
  const previewOrder = () =>
    screen
      .getByRole('button', { name: /^查看 / })
      .all()
      .map((button) => button.element().getAttribute('aria-label'))
  expect(previewOrder()).toEqual(['查看 节点 a', '查看 节点 b'])
  await screen.getByRole('button', { name: 'save targets' }).click()
  await expect
    .element(screen.getByLabelText('route order'))
    .toHaveTextContent('b,a')
  expect(previewOrder()).toEqual(['查看 节点 b', '查看 节点 a'])
  await expect
    .element(screen.getByRole('button', { name: 'save targets' }))
    .toBeEnabled()
  expect(client.getQueryState(['dashboard', 'summary'])?.isInvalidated).toBe(
    true
  )
  await screen.getByRole('button', { name: 'regenerate', exact: true }).click()
  await expect
    .poll(() => client.getQueryData<PathPlanPayload>(['path', 'plan'])?.version)
    .toBe(3)
  expect(client.getQueryState(['path', 'history'])?.isInvalidated).toBe(true)
})

it('does not let a stale in-flight refresh overwrite a newly saved route', async () => {
  const client = createTestQueryClient()
  const screen = await render(
    <QueryClientProvider client={client}>
      <Controls />
    </QueryClientProvider>
  )
  await expect
    .element(screen.getByLabelText('route order'))
    .toHaveTextContent('a,b')
  let resolveOld: (value: unknown) => void = () => undefined
  vi.mocked(apiClient.get).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve
      })
  )
  const refresh = client.refetchQueries({ queryKey: ['path', 'plan'] })
  await expect.poll(() => vi.mocked(apiClient.get).mock.calls.length).toBe(2)
  await screen.getByRole('button', { name: 'save targets' }).click()
  await expect
    .element(screen.getByLabelText('route order'))
    .toHaveTextContent('b,a')
  resolveOld({ data: fixture() })
  await refresh
  expect(client.getQueryData<PathPlanPayload>(['path', 'plan'])?.version).toBe(
    2
  )
})
