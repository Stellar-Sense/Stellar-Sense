import { createFileRoute } from '@tanstack/react-router'
import { PathPlanning } from '@/features/path-planning'

export const Route = createFileRoute('/_authenticated/path-planning/')({
  component: PathPlanning,
})
