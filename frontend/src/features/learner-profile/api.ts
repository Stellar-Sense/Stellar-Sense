import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { type Profile } from './catalog'

type Payload = { profile: Profile | null }
export function useLearnerProfile() {
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['user', 'learner-profile', token],
    enabled: Boolean(token),
    queryFn: async () =>
      (await apiClient.get<Payload>('/user/learner-profile')).data,
  })
}
export function useSaveLearnerProfile() {
  const client = useQueryClient()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useMutation({
    mutationFn: async (profile: Profile) =>
      (await apiClient.put<Payload>('/user/learner-profile', profile)).data,
    onSuccess: (data) => {
      client.setQueryData(['user', 'learner-profile', token], data)
      void client.invalidateQueries({ queryKey: ['path', 'plan'] })
    },
  })
}
