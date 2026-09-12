import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'

export type ProfilePayload = {
  username: string
  email: string
  bio: string
  urls: { value: string }[]
}

export type AccountPayload = {
  name: string
  dob: string | null
  language: string
}

export type PreferencesPayload = {
  type: 'all' | 'mentions' | 'none'
  mobile: string | null
  communicationEmails: boolean
  socialEmails: boolean
  marketingEmails: boolean
  securityEmails: boolean
}

export function useProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () =>
      (await apiClient.get<ProfilePayload>('/user/profile')).data,
    staleTime: 60_000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ProfilePayload) =>
      (await apiClient.put<ProfilePayload>('/user/profile', payload)).data,
    onSuccess: (data) => queryClient.setQueryData(['user', 'profile'], data),
  })
}

export function useAccount() {
  return useQuery({
    queryKey: ['user', 'account'],
    queryFn: async () =>
      (await apiClient.get<AccountPayload>('/user/account')).data,
    staleTime: 60_000,
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AccountPayload) =>
      (await apiClient.put<AccountPayload>('/user/account', payload)).data,
    onSuccess: (data) => queryClient.setQueryData(['user', 'account'], data),
  })
}

export function usePreferences() {
  return useQuery({
    queryKey: ['user', 'preferences'],
    queryFn: async () =>
      (await apiClient.get<PreferencesPayload>('/user/preferences')).data,
    staleTime: 60_000,
  })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PreferencesPayload) =>
      (await apiClient.put<PreferencesPayload>('/user/preferences', payload))
        .data,
    onSuccess: (data) =>
      queryClient.setQueryData(['user', 'preferences'], data),
  })
}
