'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { appAuth } from '@/lib/app-auth'

export type ActionState = { ok: boolean; error?: string }

const cleanEmail = (value: FormDataEntryValue | null) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = cleanEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  if (!email || password.length < 8) return { ok: false, error: 'Periksa email dan kata sandi.' }
  try {
    await appAuth.login(email, password)
    return { ok: true }
  } catch {
    return { ok: false, error: 'Email atau kata sandi tidak cocok.' }
  }
}

export async function signupAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = cleanEmail(formData.get('email'))
  const password = String(formData.get('password') ?? '')
  if (!email.includes('@') || password.length < 8)
    return { ok: false, error: 'Gunakan email valid dan minimal 8 karakter.' }
  try {
    await appAuth.signup(email, password)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Akun pemilik sudah dibuat. Silakan masuk.',
    }
  }
}

export async function logoutAction() {
  await appAuth.logout()
}

export async function recordPaymentAction(formData: FormData): Promise<ActionState> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: 'Sesi berakhir. Silakan masuk lagi.' }

  const invoiceID = String(formData.get('invoiceId') ?? '')
  const amount = Number(formData.get('amount'))
  const method = String(formData.get('method') ?? '')
  const paymentDate = String(formData.get('date') ?? '') || new Date().toISOString()
  const file = formData.get('proof')
  const allowedMethods = ['bca', 'bri', 'cash'] as const
  if (
    !invoiceID ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !allowedMethods.includes(method as (typeof allowedMethods)[number]) ||
    !(file instanceof File) ||
    file.size <= 0
  )
    return { ok: false, error: 'Lengkapi pembayaran dan bukti pembayaran.' }
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'Ukuran bukti maksimal 10 MB.' }
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf')
    return { ok: false, error: 'Bukti harus berupa gambar atau PDF.' }

  const payload = await getPayload({ config })
  let proofID: string | number | null = null
  try {
    const invoice = await payload.findByID({
      collection: 'invoices',
      id: invoiceID,
      depth: 0,
      overrideAccess: false,
      user,
    })
    if (amount > invoice.remainingBalance) return { ok: false, error: 'Jumlah melebihi sisa nota.' }

    const accountName = method === 'bca' ? 'Bank BCA' : method === 'bri' ? 'Bank BRI' : 'Kas toko'
    const accounts = await payload.find({
      collection: 'accounts',
      overrideAccess: false,
      user,
      depth: 0,
      limit: 1,
      where: {
        and: [{ branch: { equals: invoice.branch } }, { name: { equals: accountName } }],
      },
    })
    const account = accounts.docs[0]
    if (!account) return { ok: false, error: 'Akun pembayaran belum tersedia.' }

    const buffer = Buffer.from(await file.arrayBuffer())
    const proof = await payload.create({
      collection: 'payment-proofs',
      overrideAccess: false,
      user,
      draft: false,
      data: {
        branch: invoice.branch,
        owner: user.id,
        description: `Bukti pembayaran ${invoice.number}`,
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    })
    proofID = proof.id

    await payload.create({
      collection: 'payments',
      overrideAccess: false,
      user,
      draft: false,
      data: {
        branch: invoice.branch,
        reference: `PAY-${invoice.number}-${Date.now()}`,
        invoice: invoice.id,
        paymentDate,
        amount,
        method: method as 'bca' | 'bri' | 'cash',
        account: account.id,
        proof: proof.id,
        recordedBy: user.id,
        acosysRecorded: formData.get('acosysRecorded') === 'on',
      },
    })
    return { ok: true }
  } catch (error) {
    if (proofID) {
      await payload
        .delete({
          collection: 'payment-proofs',
          id: proofID,
          overrideAccess: true,
        })
        .catch(() => undefined)
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Pembayaran gagal disimpan.',
    }
  }
}
