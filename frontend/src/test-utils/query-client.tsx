import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/** 测试用 React Query 客户端：禁用重试，避免失败用例长时间等待 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithQueryClient(node: React.ReactNode) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {node}
    </QueryClientProvider>
  )
}
