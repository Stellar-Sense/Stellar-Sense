/**
 * FNV-1a 哈希 → [0, 1) 的确定性伪随机源。
 * 知识星系布局与程序化纹理都依赖它，避免使用 Math.random 导致每次渲染不一致。
 */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return ((hash >>> 0) % 100000) / 100000
}
