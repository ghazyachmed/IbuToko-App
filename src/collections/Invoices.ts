import type { CollectionConfig } from 'payload'
import {
  branchCreateAccess,
  branchMutationAccess,
  branchReadAccess,
  serverOwnedField,
} from '@/access/appAccess'

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  labels: { singular: 'Nota Supplier', plural: 'Nota Supplier' },
  access: {
    create: branchCreateAccess,
    read: branchReadAccess,
    update: branchMutationAccess,
    delete: branchMutationAccess,
  },
  admin: {
    group: 'Toko Santri',
    useAsTitle: 'number',
    defaultColumns: ['number', 'branch', 'supplier', 'paymentStatus', 'remainingBalance'],
    listSearchableFields: ['number'],
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const items = Array.isArray(data.items) ? data.items : []
        data.items = items.map((item) => ({
          ...item,
          lineTotal: Number(item.quantity || 0) * Number(item.unitPrice || 0),
        }))
        const total = data.items.reduce(
          (sum: number, item: { lineTotal?: number }) => sum + Number(item.lineTotal || 0),
          0,
        )
        data.total = total
        if (typeof data.amountPaid !== 'number') data.amountPaid = 0
        data.remainingBalance = Math.max(0, total - data.amountPaid)
        data.paymentStatus =
          data.amountPaid <= 0 ? 'unpaid' : data.remainingBalance <= 0 ? 'paid' : 'partial'
        return data
      },
    ],
  },
  fields: [
    { name: 'number', type: 'text', required: true, index: true },
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
    { name: 'invoiceDate', type: 'date', required: true, index: true },
    { name: 'dueDate', type: 'date', required: true },
    { name: 'supplier', type: 'relationship', relationTo: 'suppliers', required: true },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        { name: 'quantity', type: 'number', required: true, min: 0.01 },
        { name: 'unit', type: 'text', required: true },
        { name: 'unitPrice', type: 'number', required: true, min: 0 },
        {
          name: 'lineTotal',
          type: 'number',
          required: true,
          access: { create: serverOwnedField, update: serverOwnedField },
        },
      ],
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    {
      name: 'amountPaid',
      type: 'number',
      defaultValue: 0,
      required: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    {
      name: 'remainingBalance',
      type: 'number',
      required: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [
        { label: 'Belum Bayar', value: 'unpaid' },
        { label: 'Sebagian', value: 'partial' },
        { label: 'Lunas', value: 'paid' },
      ],
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
