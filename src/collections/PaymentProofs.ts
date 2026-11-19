import type { CollectionConfig } from 'payload'
import {
  branchCreateAccess,
  branchMutationAccess,
  branchReadAccess,
  serverOwnedField,
} from '@/access/appAccess'
import { isAppUser } from '@/access/appAccess'

export const PaymentProofs: CollectionConfig = {
  slug: 'payment-proofs',
  labels: { singular: 'Bukti Pembayaran', plural: 'Bukti Pembayaran' },
  access: {
    create: branchCreateAccess,
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: branchMutationAccess,
  },
  admin: {
    group: 'Toko Santri',
    useAsTitle: 'filename',
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (!data) return data
        if (operation === 'create' && isAppUser(req.user)) data.owner = req.user.id
        return data
      },
    ],
  },
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      return headers
    },
  },
  fields: [
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
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    { name: 'description', type: 'text' },
  ],
}
