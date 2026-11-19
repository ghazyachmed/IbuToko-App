import type { CollectionConfig } from 'payload'
import { isAppUser, isPayloadAdmin } from '@/access/appAccess'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 12,
  },
  access: {
    create: async ({ req }) => {
      if (isPayloadAdmin(req.user)) return true
      const existing = await req.payload.count({
        collection: 'users',
        overrideAccess: true,
      })
      return existing.totalDocs === 0
    },
    read: ({ req }) => {
      if (isPayloadAdmin(req.user)) return true
      if (!isAppUser(req.user)) return false
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (isPayloadAdmin(req.user)) return true
      if (!isAppUser(req.user)) return false
      return { id: { equals: req.user.id } }
    },
    delete: ({ req }) => isPayloadAdmin(req.user),
    admin: ({ req }) => isPayloadAdmin(req.user),
  },
  admin: {
    useAsTitle: 'email',
    group: 'Toko Santri',
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [{ label: 'Pemilik', value: 'owner' }],
      defaultValue: 'owner',
      required: true,
      saveToJWT: true,
      access: {
        create: ({ req }) => isPayloadAdmin(req.user),
        update: ({ req }) => isPayloadAdmin(req.user),
      },
    },
    {
      name: 'allowedBranches',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Gading', value: 'gading' },
        { label: 'Palur', value: 'palur' },
      ],
      defaultValue: ['gading', 'palur'],
      required: true,
      saveToJWT: true,
      access: {
        create: ({ req }) => isPayloadAdmin(req.user),
        update: ({ req }) => isPayloadAdmin(req.user),
      },
    },
  ],
  versions: false,
}
