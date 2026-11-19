import type { CollectionConfig } from 'payload'
import {
  branchMutationAccess,
  branchReadAccess,
  getAllowedBranches,
  isAppUser,
  isPayloadAdmin,
  serverOwnedField,
} from '@/access/appAccess'

const relationshipID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value)
    return (value as { id: string | number }).id
  return undefined
}

export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Pembayaran Supplier', plural: 'Pembayaran Supplier' },
  access: {
    create: ({ req }) => isPayloadAdmin(req.user) || isAppUser(req.user),
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: () => false,
  },
  admin: {
    group: 'Toko Santri',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'branch', 'invoice', 'amount', 'paymentDate', 'acosysRecorded'],
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data
        const invoiceID = relationshipID(data?.invoice)
        if (!invoiceID) throw new Error('Nota sumber wajib dipilih.')
        const invoice = await req.payload.findByID({
          collection: 'invoices',
          id: invoiceID,
          depth: 0,
          overrideAccess: false,
          user: req.user,
        })
        if (!getAllowedBranches(req.user).includes(invoice.branch))
          throw new Error('Anda tidak memiliki akses ke cabang nota ini.')
        const amount = Number(data?.amount || 0)
        if (amount <= 0 || amount > invoice.remainingBalance)
          throw new Error('Jumlah pembayaran tidak valid atau melebihi sisa nota.')
        data.branch = invoice.branch
        data.reference = `PAY-${invoice.number}-${Date.now()}`
        if (!data.paymentDate) data.paymentDate = new Date().toISOString()
        if (isAppUser(req.user)) data.recordedBy = req.user.id
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation !== 'create') return doc
        const invoiceID = relationshipID(doc.invoice)
        if (!invoiceID) return doc
        const invoice = await req.payload.findByID({
          collection: 'invoices',
          id: invoiceID,
          depth: 0,
          overrideAccess: true,
        })
        const result = await req.payload.find({
          collection: 'payments',
          depth: 0,
          limit: 1000,
          overrideAccess: true,
          where: { invoice: { equals: invoiceID } },
        })
        const amountPaid = result.docs.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        )
        const remainingBalance = Math.max(0, Number(invoice.total) - amountPaid)
        await req.payload.update({
          collection: 'invoices',
          id: invoiceID,
          req,
          overrideAccess: true,
          data: {
            amountPaid,
            remainingBalance,
            paymentStatus: amountPaid <= 0 ? 'unpaid' : remainingBalance <= 0 ? 'paid' : 'partial',
          },
        })
        return doc
      },
    ],
  },
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
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    { name: 'invoice', type: 'relationship', relationTo: 'invoices', required: true },
    { name: 'paymentDate', type: 'date', required: true, index: true },
    { name: 'amount', type: 'number', required: true, min: 1 },
    {
      name: 'method',
      type: 'select',
      required: true,
      options: [
        { label: 'Transfer BCA', value: 'bca' },
        { label: 'Transfer BRI', value: 'bri' },
        { label: 'Tunai', value: 'cash' },
      ],
    },
    { name: 'account', type: 'relationship', relationTo: 'accounts', required: true },
    { name: 'proof', type: 'upload', relationTo: 'payment-proofs', required: true },
    {
      name: 'recordedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    {
      name: 'acosysRecorded',
      type: 'checkbox',
      defaultValue: false,
      label: 'Sudah Dicatat di ACOSYS',
    },
  ],
}
