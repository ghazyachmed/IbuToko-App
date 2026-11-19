import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { appAuth } from './app-auth'
import {
  branchLabel,
  type AccountView,
  type IncomeView,
  type InvoiceView,
  type PaymentView,
  type ProductView,
  type TokoData,
} from './toko-types'

const relationID = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value)
    return String((value as { id: string | number }).id)
  return ''
}

const relationName = (value: unknown, fallback = '') => {
  if (value && typeof value === 'object' && 'name' in value)
    return String((value as { name: string }).name)
  return fallback
}

export async function getTokoData(): Promise<TokoData | null> {
  const user = await appAuth.currentUser()
  if (!user) return null
  const payload = await getPayload({ config })
  const [invoiceResult, paymentResult, incomeResult, accountResult, productResult] =
    await Promise.all([
      payload.find({
        collection: 'invoices',
        depth: 2,
        limit: 500,
        sort: '-invoiceDate',
        overrideAccess: false,
        user,
      }),
      payload.find({
        collection: 'payments',
        depth: 2,
        limit: 500,
        sort: '-paymentDate',
        overrideAccess: false,
        user,
      }),
      payload.find({
        collection: 'cash-transactions',
        depth: 1,
        limit: 500,
        sort: '-transactionDate',
        overrideAccess: false,
        user,
      }),
      payload.find({
        collection: 'accounts',
        depth: 0,
        limit: 100,
        overrideAccess: false,
        user,
      }),
      payload.find({
        collection: 'products',
        depth: 2,
        limit: 500,
        sort: 'name',
        overrideAccess: false,
        user,
      }),
    ])

  const invoices: InvoiceView[] = invoiceResult.docs.map((invoice) => ({
    id: String(invoice.id),
    branch: branchLabel(invoice.branch),
    number: invoice.number,
    date: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    supplier: relationName(invoice.supplier),
    status:
      invoice.paymentStatus === 'paid'
        ? 'Lunas'
        : invoice.paymentStatus === 'partial'
          ? 'Sebagian'
          : 'Belum Bayar',
    acosysRecorded: Boolean(invoice.acosysRecorded),
    total: Number(invoice.total),
    amountPaid: Number(invoice.amountPaid),
    remainingBalance: Number(invoice.remainingBalance),
    items: (invoice.items ?? []).map((item) => ({
      productId: relationID(item.product),
      product: relationName(item.product),
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      total: Number(item.lineTotal),
    })),
  }))

  const payments: PaymentView[] = paymentResult.docs.map((payment) => {
    const proof =
      payment.proof && typeof payment.proof === 'object'
        ? (payment.proof as { filename?: string | null; url?: string | null })
        : null
    return {
      id: String(payment.id),
      branch: branchLabel(payment.branch),
      invoiceId: relationID(payment.invoice),
      date: payment.paymentDate,
      amount: Number(payment.amount),
      method:
        payment.method === 'bca'
          ? 'Transfer BCA'
          : payment.method === 'bri'
            ? 'Transfer BRI'
            : 'Tunai',
      proofName: proof?.filename ?? 'Bukti pembayaran',
      proofUrl: proof?.url ?? null,
      acosysRecorded: Boolean(payment.acosysRecorded),
    }
  })

  const income: IncomeView[] = incomeResult.docs.map((item) => ({
    id: String(item.id),
    branch: branchLabel(item.branch),
    date: item.transactionDate,
    customer: item.customer,
    method: item.method === 'qris' ? 'QRIS' : 'Transfer',
    amount: Number(item.amount),
    reference: item.reference,
    accountId: relationID(item.account),
  }))

  const outgoingByAccount = new Map<string, number>()
  for (const payment of paymentResult.docs) {
    const accountID = relationID(payment.account)
    outgoingByAccount.set(
      accountID,
      (outgoingByAccount.get(accountID) ?? 0) + Number(payment.amount),
    )
  }
  const incomeByAccount = new Map<string, number>()
  for (const item of incomeResult.docs) {
    const accountID = relationID(item.account)
    incomeByAccount.set(accountID, (incomeByAccount.get(accountID) ?? 0) + Number(item.amount))
  }
  const accounts: AccountView[] = accountResult.docs.map((account) => ({
    id: String(account.id),
    branch: branchLabel(account.branch),
    name: account.name,
    balance:
      Number(account.openingBalance) +
      (incomeByAccount.get(String(account.id)) ?? 0) -
      (outgoingByAccount.get(String(account.id)) ?? 0),
  }))

  const historyByProduct = new Map<
    string,
    Array<{ date: string; invoice: string; unitPrice: number; unit: string }>
  >()
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const history = historyByProduct.get(item.productId) ?? []
      history.push({
        date: invoice.date,
        invoice: invoice.number,
        unitPrice: item.unitPrice,
        unit: item.unit,
      })
      historyByProduct.set(item.productId, history)
    }
  }
  const products: ProductView[] = productResult.docs.map((product) => ({
    id: String(product.id),
    branch: branchLabel(product.branch),
    name: product.name,
    supplier: relationName(product.supplier),
    sellPrice: Number(product.sellingPrice),
    baseUnit: product.baseUnit,
    packaging: product.packaging,
    conversion: Number(product.conversion),
    history: (historyByProduct.get(String(product.id)) ?? []).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  }))

  return { invoices, payments, income, accounts, products }
}
