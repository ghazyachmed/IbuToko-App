import type { CollectionConfig } from 'payload'
import { branchCreateAccess, branchMutationAccess, branchReadAccess } from '@/access/appAccess'

export const Accounts: CollectionConfig = {
  slug: 'accounts',
  labels: { singular: 'Akun Kas/Bank', plural: 'Akun Kas/Bank' },
  access: {
    create: branchCreateAccess,
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: branchMutationAccess,
  },
  admin: { group: 'Toko Santri', useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'branch',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Gading', value: 'gading' },
        { label: 'Palur', value: 'palur' },
      ],
    },
    { name: 'openingBalance', type: 'number', required: true, defaultValue: 0 },
  ],
}
