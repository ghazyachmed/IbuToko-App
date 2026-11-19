import type { CollectionConfig } from 'payload'
import { branchCreateAccess, branchMutationAccess, branchReadAccess } from '@/access/appAccess'

export const Suppliers: CollectionConfig = {
  slug: 'suppliers',
  labels: { singular: 'Supplier', plural: 'Supplier' },
  access: {
    create: branchCreateAccess,
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: branchMutationAccess,
  },
  admin: {
    group: 'Toko Santri',
    useAsTitle: 'name',
    defaultColumns: ['name', 'branch', 'phone'],
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
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
    { name: 'phone', type: 'text' },
  ],
}
