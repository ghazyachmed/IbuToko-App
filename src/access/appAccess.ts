import type { Access, FieldAccess } from 'payload'

export type BranchCode = 'gading' | 'palur'

type AppUser = {
  id: string | number
  collection?: string
  allowedBranches?: BranchCode[] | null
}

export const isAppUser = (user: unknown): user is AppUser =>
  Boolean(user && typeof user === 'object' && (user as AppUser).collection === 'users')

export const isPayloadAdmin = (user: unknown) =>
  Boolean(user && typeof user === 'object' && (user as AppUser).collection === 'admins')

export const getAllowedBranches = (user: unknown): BranchCode[] => {
  if (isPayloadAdmin(user)) return ['gading', 'palur']
  if (!isAppUser(user)) return []
  return user.allowedBranches ?? []
}

export const appUserOnly: Access = ({ req }) => isAppUser(req.user)

export const branchReadAccess: Access = ({ req }) => {
  if (isPayloadAdmin(req.user)) return true
  const allowed = getAllowedBranches(req.user)
  if (!allowed.length) return false
  return { branch: { in: allowed } }
}

export const branchCreateAccess: Access = ({ req, data }) => {
  if (isPayloadAdmin(req.user)) return true
  return isAppUser(req.user) && getAllowedBranches(req.user).includes(data?.branch as BranchCode)
}

export const branchMutationAccess: Access = ({ req }) => {
  if (isPayloadAdmin(req.user)) return true
  const allowed = getAllowedBranches(req.user)
  if (!allowed.length) return false
  return { branch: { in: allowed } }
}

export const serverOwnedField: FieldAccess = ({ req }) => isPayloadAdmin(req.user)
