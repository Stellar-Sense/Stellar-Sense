import {
  LayoutDashboard,
  Package,
  Users,
  HelpCircle,
  NotebookPen,
  Compass,
  Command,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '遥感学习者',
    email: 'learner@remote-sensing.ai',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: '遥感智能学习平台',
      logo: Command,
      plan: '学习计划',
    },
  ],
  navGroups: [
    {
      title: '导航',
      items: [
        {
          title: '学习驾驶舱',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: '学科星图',
          url: '/tasks',
          icon: Compass,
        },
        {
          title: '路径规划',
          url: '/path-planning',
          icon: Package,
        },
        {
          title: '节点学习',
          url: '/node-learning',
          icon: NotebookPen,
        },
        {
          title: 'AI 学习助手',
          url: '/ai-assistant',
          icon: Users,
        },
        {
          title: '学习记录',
          url: '/learning-history',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
