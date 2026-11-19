import type { CollectionConfig } from 'payload'
import { branchCreateAccess, branchMutationAccess, branchReadAccess } from '@/access/appAccess'

export const CashTransactions: CollectionConfig = {
  slug: 'cash-transactions',
  labels: { singular: 'Pemasukan Pelanggan', plural: 'Pemasukan Pelanggan' },
  access: {
    create: branchCreateAccess,
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: branchMutationAccess,
  },
  admin: { group: 'Toko Santri', useAsTitle: 'reference' },
  fields: [
    { name: 'reference', type: 'text', required: true, index: true },
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
    { name: 'transactionDate', type: 'date', required: true, index: true },
    { name: 'customer', type: 'text', required: true },
    {
      name: 'method',
      type: 'select',
      required: true,
      options: [
        { label: 'Transfer', value: 'transfer' },
        { label: 'QRIS', value: 'qris' },
      ],
    },
    { name: 'amount', type: 'number', required: true, min: 1 },
    { name: 'account', type: 'relationship', relationTo: 'accounts', required: true },
  ],
}
