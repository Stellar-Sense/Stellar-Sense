import { create } from 'zustand'

export type CompanionNode = {
  id: string
  name: string
  domain: string
  progress: number
  description: string
  status: 'mastered' | 'learning' | 'unlearned'
}

type CompanionState = {
  isOpen: boolean
  node: CompanionNode | null
  openForNode: (node: CompanionNode) => void
  setNode: (node: CompanionNode) => void
  open: () => void
  toggle: () => void
  close: () => void
}

export const useCompanionStore = create<CompanionState>((set) => ({
  isOpen: false,
  node: null,
  openForNode: (node) => set({ node, isOpen: true }),
  setNode: (node) => set({ node }),
  open: () => set({ isOpen: true }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
}))
