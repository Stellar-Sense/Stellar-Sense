/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基础路径（开发环境走 Vite 代理，默认 /api） */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
