import type { CollectionConfig } from 'payload'
import { branchCreateAccess, branchMutationAccess, branchReadAccess } from '@/access/appAccess'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Produk', plural: 'Produk' },
  access: {
    create: branchCreateAccess,
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: branchMutationAccess,
  },
  admin: {
    group: 'Toko Santri',
    useAsTitle: 'name',
    defaultColumns: ['name', 'branch', 'supplier', 'sellingPrice'],
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
    { name: 'supplier', type: 'relationship', relationTo: 'suppliers', required: true },
    { name: 'sellingPrice', type: 'number', required: true, min: 0 },
    { name: 'baseUnit', type: 'text', required: true },
    { name: 'packaging', type: 'text', required: true },
    { name: 'conversion', type: 'number', required: true, min: 1 },
  ],
}
