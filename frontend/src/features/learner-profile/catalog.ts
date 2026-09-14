import catalog from '../../../../shared/learner-profile.json'

export { catalog }
export type Profile = { version: 1; selections: Record<string, string[]> }
export type Group = (typeof catalog.groups)[number]
export const emptyProfile = (): Profile => ({ version: 1, selections: {} })
export const copyProfile = (profile: Profile): Profile =>
  structuredClone(profile)
export function validGroup(profile: Profile, group: Group) {
  const values = profile.selections[group.id] ?? []
  return (
    values.length >= 1 &&
    values.length <= group.max &&
    new Set(values).size === values.length &&
    values.every((value) =>
      group.options.some((option) => option.id === value)
    ) &&
    (!group.exclusive ||
      !values.includes(group.exclusive) ||
      values.length === 1)
  )
}
export const completeProfile = (profile: Profile) =>
  catalog.groups.every((group) => validGroup(profile, group))
export function toggleTag(profile: Profile, group: Group, id: string): Profile {
  const current = profile.selections[group.id] ?? []
  let next: string[]
  if (current.includes(id)) next = current.filter((value) => value !== id)
  else if (group.max === 1 || id === group.exclusive) next = [id]
  else
    next = [...current.filter((value) => value !== group.exclusive), id].slice(
      0,
      group.max
    )
  return { ...profile, selections: { ...profile.selections, [group.id]: next } }
}
