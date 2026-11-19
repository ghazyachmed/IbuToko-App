import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'
import kittyUrl from '@/assets/hello-kitty.png'
import { composeData, entryBasePrice, type LocalRecords, loadLocalRecords, saveLocalRecords } from '@/lib/store'
import { type Answer, answerQuestion, type PendingAction, priceAnalysis, sellAnalysis } from '@/lib/tanya-data'
import {
  type AccountView,
  type Branch,
  BRANCHES,
  type IncomeView,
  type InvoiceView,
  type PaymentView,
  type ProductView,
  rupiah,
  shortDate,
  todayISO,
} from '@/lib/toko-types'
import { Link, Navigate, useNavigate, usePathname } from '@/router'

type PaymentMethod = 'bca' | 'bri' | 'cash'
type Invoice = InvoiceView
type Payment = PaymentView

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
type NewPayment = {
  invoiceId: string
  date: string
  amount: number
  method: PaymentMethod
  proofName: string
  acosysRecorded: boolean
}
type StoreContext = {
  branch: Branch | null
  setBranch: (branch: Branch | null) => void
  invoices: Invoice[]
  payments: Payment[]
  customerIncome: IncomeView[]
  balances: AccountView[]
  products: ProductView[]
  allowedBranches: Branch[]
  recordPayment: (payment: NewPayment) => { ok: boolean; error?: string }
  confirmAction: (action: PendingAction, acosysRecorded: boolean) => string[]
}

const TokoContext = createContext<StoreContext | null>(null)
const BRANCH_KEY = 'toko-santri-branch'
const WELCOMED_KEY = 'toko-santri-welcomed'
const PICKED_IN_APP_KEY = 'toko-santri-picked-in-app'

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* penyimpanan perangkat tidak tersedia */
  }
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

/*
 * Pasang aplikasi (PWA). Event "beforeinstallprompt" dari Chrome/Android ditangkap
 * sejak awal dan disimpan, agar tombol "Pasang Aplikasi" di mana pun bisa langsung
 * memunculkan dialog pasang. Kalau dialog belum tersedia, tampilkan langkah singkat.
 */
let deferredInstall: InstallEvent | null = null
let installedNow = false
const installListeners = new Set<() => void>()
const emitInstall = () => installListeners.forEach((listener) => listener())
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstall = event as InstallEvent
    emitInstall()
  })
  window.addEventListener('appinstalled', () => {
    deferredInstall = null
    installedNow = true
    emitInstall()
  })
}

type InstallSheetKind = 'android' | 'android-webview' | 'ios' | 'desktop'
const installPlatform = (): InstallSheetKind => {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return /; wv\)|FBAN|FBAV|Instagram|Line\//i.test(ua) ? 'android-webview' : 'android'
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  return 'desktop'
}

function useInstall() {
  const [, rerender] = useState(0)
  const [sheet, setSheet] = useState<InstallSheetKind | null>(null)
  useEffect(() => {
    const listener = () => rerender((value) => value + 1)
    installListeners.add(listener)
    return () => {
      installListeners.delete(listener)
    }
  }, [])
  const standalone = isStandalone() || installedNow
  async function install(): Promise<boolean> {
    if (standalone) return true
    const prompt = deferredInstall
    if (prompt) {
      await prompt.prompt()
      const choice = await prompt.userChoice
      deferredInstall = null
      emitInstall()
      return choice.outcome === 'accepted'
    }
    setSheet(installPlatform())
    return false
  }
  return { standalone, canPrompt: Boolean(deferredInstall), install, sheet, closeSheet: () => setSheet(null) }
}

const INSTALL_STEPS: Record<InstallSheetKind, { title: string; steps: ReactNode[] }> = {
  android: {
    title: 'Pasang di Android',
    steps: [
      <>
        Ketuk <b>⋮</b> di kanan atas Chrome.
      </>,
      <>
        Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.
      </>,
      <>
        Ketuk <b>Instal</b>.
      </>,
    ],
  },
  'android-webview': {
    title: 'Buka di Chrome dulu',
    steps: [
      <>
        Ketuk <b>⋮</b> lalu pilih <b>Buka di Chrome</b>.
      </>,
      <>
        Di Chrome, ketuk <b>Pasang Aplikasi</b> lagi.
      </>,
    ],
  },
  ios: {
    title: 'Pasang di iPhone',
    steps: [
      <>
        Ketuk tombol <b>Bagikan</b> di Safari.
      </>,
      <>
        Pilih <b>Tambah ke Layar Utama</b>.
      </>,
      <>
        Ketuk <b>Tambah</b>.
      </>,
    ],
  },
  desktop: {
    title: 'Pasang di komputer',
    steps: [
      <>
        Klik ikon <b>Pasang</b> di ujung kanan kolom alamat Chrome atau Edge.
      </>,
      <>
        Klik <b>Instal</b>.
      </>,
    ],
  },
}

function InstallSheet({ kind, onClose }: { kind: InstallSheetKind; onClose: () => void }) {
  const content = INSTALL_STEPS[kind]
  return (
    <div className="backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()}>
        <i />
        <h2>{content.title}</h2>
        <ol>
          {content.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
        <button className="primary" onClick={onClose}>
          Mengerti
        </button>
      </section>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
    </svg>
  )
}

/** Tombol pasang; tidak tampil kalau aplikasi sudah terpasang. */
function InstallButton({ compact = false }: { compact?: boolean }) {
  const { standalone, install, sheet, closeSheet } = useInstall()
  if (standalone) return null
  return (
    <>
      <button
        type="button"
        className={compact ? 'install-icon' : 'install-button'}
        onClick={() => void install()}
        aria-label="Pasang aplikasi"
      >
        <DownloadIcon />
        {!compact && 'Pasang Aplikasi'}
      </button>
      {sheet && <InstallSheet kind={sheet} onClose={closeSheet} />}
    </>
  )
}

const iconPaths = {
  ledger: (
    <>
      <path d="M7 3.5h10a2 2 0 0 1 2 2v15H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M9 3.5v17M12 8h4M12 12h4M12 16h3" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M7 10a2 2 0 0 0 2-2h6a2 2 0 0 0 2 2v5a2 2 0 0 0-2 2H9a2 2 0 0 0-2-2v-5Z" />
      <circle cx="12" cy="12.5" r="2" />
    </>
  ),
  tag: (
    <>
      <path d="m20 13-7 7-9-9V4h7l9 9Z" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </>
  ),
  ask: (
    <>
      <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.5-.7L4 20l1.4-4A7.8 7.8 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />
      <path d="M9.7 9.5a2.4 2.4 0 0 1 4.6 1c0 1.8-2.3 1.8-2.3 3M12 16.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
}

function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function MenuIllustration({ name }: { name: 'ledger' | 'cash' | 'tag' | 'ask' }) {
  const rays = (
    <g className="menu-rays">
      <path d="M99 14v-9M106 18l7-6M109 26h8" />
    </g>
  )
  if (name === 'ledger')
    return (
      <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
        {rays}
        <path
          className="menu-soft"
          d="M13 25c17-5 31-3 47 7 16-10 30-12 47-7v49c-16-4-30-2-47 8-17-10-31-12-47-8Z"
        />
        <path
          className="menu-fill"
          d="M18 20c15-3 28 0 42 9v47c-14-9-27-12-42-9Zm84 0c-15-3-28 0-42 9v47c14-9 27-12 42-9Z"
        />
        <path
          className="menu-line"
          d="M18 20c15-3 28 0 42 9 14-9 27-12 42-9v47c-15-3-28 0-42 9-14-9-27-12-42-9Zm42 9v47M28 34c8-1 15 1 22 5m-22 9c8-1 15 1 22 5m42-19c-8-1-15 1-22 5m22 9c-8-1-15 1-22 5"
        />
        <path className="menu-accent" d="m52 70 8 6 8-6v15l-8-4-8 4Z" />
      </svg>
    )
  if (name === 'cash')
    return (
      <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
        {rays}
        <path className="money-paper" d="m45 25 45-14 8 29-45 14Z" />
        <circle className="money-dot" cx="72" cy="32" r="8" />
        <path
          className="menu-soft"
          d="M17 31h75c8 0 13 5 13 13v31H24c-8 0-13-5-13-13V38c0-4 2-7 6-7Z"
        />
        <path
          className="menu-fill"
          d="M19 27h72c7 0 11 4 11 11v36H25c-8 0-12-4-12-12V35c0-5 2-8 6-8Z"
        />
        <path
          className="menu-line"
          d="M19 27h72c7 0 11 4 11 11v36H25c-8 0-12-4-12-12V35c0-5 2-8 6-8Zm5 11h55"
        />
        <rect className="menu-accent" x="76" y="43" width="38" height="22" rx="8" />
        <rect className="menu-line" x="76" y="43" width="38" height="22" rx="8" />
        <circle className="money-dot" cx="91" cy="54" r="5" />
        <path className="wallet-stitch" d="M25 68h42" />
      </svg>
    )
  if (name === 'tag')
    return (
      <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
        {rays}
        <path className="box-left" d="M19 31 58 12l1 48-40 20Z" />
        <path className="box-right" d="m59 12 42 14-2 48-40-14Z" />
        <path className="box-top" d="M19 31 58 12l43 14-42 20Z" />
        <path
          className="menu-line"
          d="M19 31 58 12l43 14-2 48-40 9-40-23Zm40 15v37M19 31l40 15 42-20"
        />
        <path className="box-tape" d="m43 19 17-7 14 5-18 8v17l-13-5Z" />
        <rect className="box-label" x="65" y="60" width="25" height="12" rx="2" />
        <path className="barcode" d="M70 63v6m4-6v6m4-6v6m5-6v6" />
      </svg>
    )
  return (
    <svg className="menu-illustration" viewBox="-5 -5 132 100" aria-hidden="true">
      {rays}
      <path
        className="bubble-back"
        d="M57 42c0-17 13-27 31-27 17 0 29 10 29 25 0 14-12 24-29 24-5 0-10-1-14-3l-14 6 4-13c-4-3-7-7-7-12Z"
      />
      <path
        className="menu-line"
        d="M57 42c0-17 13-27 31-27 17 0 29 10 29 25 0 14-12 24-29 24-5 0-10-1-14-3l-14 6 4-13c-4-3-7-7-7-12Z"
      />
      <circle className="bubble-dot" cx="85" cy="41" r="3" />
      <circle className="bubble-dot" cx="98" cy="41" r="3" />
      <path
        className="menu-fill"
        d="M7 35C7 16 22 5 43 5c22 0 37 12 37 31 0 18-15 30-37 30-5 0-11-1-16-3L11 72l5-16c-6-5-9-12-9-21Z"
      />
      <path
        className="menu-line"
        d="M7 35C7 16 22 5 43 5c22 0 37 12 37 31 0 18-15 30-37 30-5 0-11-1-16-3L11 72l5-16c-6-5-9-12-9-21Z"
      />
      <path
        className="question-mark"
        d="M34 26c1-7 6-10 12-10 7 0 12 4 12 10 0 9-11 9-11 17m0 9h.01"
      />
    </svg>
  )
}

function Brand() {
  return (
    <span className="brand" aria-label="Toko Santri">
      <span />
      <i />
    </span>
  )
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 46" aria-hidden="true">
      <path className="store-awning" d="M8 5h32l5 11H3Z" />
      <path className="store-stripe" d="M16 5h8v11h-10ZM32 5h-8v11h10Z" />
      <path
        className="store-line"
        d="M8 5h32l5 11H3ZM3 16c0 3 2.4 5.5 5.3 5.5S13.7 19 13.7 16c0 3 2.4 5.5 5.2 5.5S24 19 24 16c0 3 2.3 5.5 5.2 5.5s5.1-2.5 5.1-5.5c0 3 2.4 5.5 5.3 5.5S45 19 45 16M16 5l-2.3 11M24 5v11M32 5l2.3 11M7.5 22v19h33V22M20 41V31.5h8V41"
      />
    </svg>
  )
}

function Heart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 22" aria-hidden="true">
      <path d="M12 20.5S2 14.3 2 7.6A5.1 5.1 0 0 1 12 5.4a5.1 5.1 0 0 1 10 2.2c0 6.7-10 12.9-10 12.9Z" />
    </svg>
  )
}

function Rays({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M15 10V3M21 13l5-4M22 20h6" />
    </svg>
  )
}

/** Pojok kanan header: tombol pasang (kalau belum terpasang), selain itu hiasan hati. */
function HeroCorner({ install }: { install: boolean }) {
  const { standalone } = useInstall()
  if (!install || standalone) return <Heart className="hero-heart" />
  return (
    <span className="hero-install">
      <InstallButton compact />
    </span>
  )
}

function HomeHero({ install = false }: { install?: boolean }) {
  return (
    <header className="home-hero">
      <Rays className="hero-rays" />
      <StoreIcon className="hero-store" />
      <b>Toko Santri</b>
      <HeroCorner install={install} />
      <svg className="hero-wave" viewBox="0 0 400 28" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 14C55 2 105 2 160 12s110 14 160 4 60-10 80-8V28H0Z" />
      </svg>
    </header>
  )
}

function GreetingScene() {
  return (
    <svg className="greeting-scene" viewBox="0 0 400 210" preserveAspectRatio="none" aria-hidden="true">
      <path className="scene-hill-back" d="M0 150c40-28 85-30 125-8 30-22 70-26 105-6 45-34 110-36 170-4v78H0Z" />
      <path className="scene-hill" d="M0 178c60-20 120-18 190-2 70-16 140-18 210-4v38H0Z" />
      <g className="scene-flower" transform="translate(328 150)">
        <circle cx="0" cy="-7" r="6" />
        <circle cx="7" cy="-1" r="6" />
        <circle cx="4" cy="7" r="6" />
        <circle cx="-5" cy="7" r="6" />
        <circle cx="-7" cy="-1" r="6" />
        <circle className="scene-flower-mid" r="4" />
      </g>
      <g className="scene-flower" transform="translate(362 166) scale(.8)">
        <circle cx="0" cy="-7" r="6" />
        <circle cx="7" cy="-1" r="6" />
        <circle cx="4" cy="7" r="6" />
        <circle cx="-5" cy="7" r="6" />
        <circle cx="-7" cy="-1" r="6" />
        <circle className="scene-flower-mid" r="4" />
      </g>
      <path className="scene-leaf" d="M352 150c6-9 14-11 20-9-3 8-11 12-20 9Z" />
    </svg>
  )
}

function Kitten() {
  return (
    <img
      className="kitten"
      src={kittyUrl}
      width="512"
      height="512"
      alt="Hello Kitty melambaikan tangan"
      decoding="async"
    />
  )
}

function StoreRoot({ children }: { children: ReactNode }) {
  const allowedBranches = BRANCHES
  const [branch, updateBranch] = useState<Branch | null>(() => {
    const stored = readStorage(BRANCH_KEY) as Branch | null
    return stored && BRANCHES.includes(stored) ? stored : null
  })
  const [local, setLocal] = useState<LocalRecords>(() => loadLocalRecords())
  const data = useMemo(() => composeData(local), [local])

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD)
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])

  function setBranch(value: Branch | null) {
    writeStorage(BRANCH_KEY, value)
    updateBranch(value)
  }

  function commit(next: LocalRecords) {
    saveLocalRecords(next)
    setLocal(next)
    return composeData(next)
  }

  function recordPayment(input: NewPayment): { ok: boolean; error?: string } {
    const invoice = data.invoices.find((item) => item.id === input.invoiceId)
    if (!invoice) return { ok: false, error: 'Nota tidak ditemukan.' }
    if (!['bca', 'bri', 'cash'].includes(input.method))
      return { ok: false, error: 'Metode pembayaran tidak valid.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > todayISO())
      return { ok: false, error: 'Tanggal pembayaran tidak valid.' }
    if (!Number.isFinite(input.amount) || input.amount <= 0)
      return { ok: false, error: 'Jumlah harus lebih dari nol.' }
    if (input.amount > invoice.remainingBalance) return { ok: false, error: 'Jumlah melebihi sisa nota.' }
    if (!input.proofName) return { ok: false, error: 'Pilih bukti pembayaran.' }
    const payment: PaymentView = {
      id: `LOCAL-${invoice.number}-${Date.now()}`,
      branch: invoice.branch,
      invoiceId: invoice.id,
      date: input.date,
      amount: Math.round(input.amount),
      method: input.method === 'bca' ? 'Transfer BCA' : input.method === 'bri' ? 'Transfer BRI' : 'Tunai',
      proofName: `${input.proofName} (simulasi)`,
      proofUrl: null,
      acosysRecorded: input.acosysRecorded,
      simulated: true,
      local: true,
    }
    commit({ ...local, payments: [payment, ...local.payments] })
    return { ok: true }
  }

  function confirmAction(action: PendingAction, acosysRecorded: boolean): string[] {
    const product = data.products.find((item) => item.branch === action.branch && item.key === action.productKey)
    if (!product) return ['Barang tidak ditemukan.']
    if (action.kind === 'sell') {
      if (product.latestCost && action.sellPrice < product.latestCost.basePrice)
        return ['Tidak bisa disimpan: harga jual lebih murah dari harga beli.']
      const next = commit({
        ...local,
        sells: [
          {
            id: `JUAL-${Date.now()}`,
            branch: action.branch,
            productKey: action.productKey,
            date: action.date,
            sellPrice: action.sellPrice,
            previous: product.sellPrice,
            acosysRecorded,
          },
          ...local.sells,
        ],
      })
      const updated = next.products.find((item) => item.id === product.id)
      return updated ? sellAnalysis(updated) : []
    }
    if (!(action.unitPrice > 0) || entryBasePrice(product, action.unit, action.unitPrice, action.shipping) <= 0)
      return ['Harga tidak valid.']
    const id = `INFO-${Date.now()}`
    const next = commit({
      ...local,
      prices: [
        {
          id,
          branch: action.branch,
          productKey: action.productKey,
          date: action.date,
          supplier: action.supplier,
          unit: action.unit,
          unitPrice: action.unitPrice,
          shipping: action.shipping,
          acosysRecorded,
          note: 'Info harga dari supplier/sales (dicatat di Tanya & Catat)',
        },
        ...local.prices,
      ],
    })
    const updated = next.products.find((item) => item.id === product.id)
    return updated ? priceAnalysis(updated, id) : []
  }

  return (
    <TokoContext.Provider
      value={{
        branch,
        setBranch,
        invoices: data.invoices,
        payments: data.payments,
        customerIncome: data.income,
        balances: data.accounts,
        products: data.products,
        allowedBranches,
        recordPayment,
        confirmAction,
      }}
    >
      {children}
    </TokoContext.Provider>
  )
}

const useStore = () => {
  const value = useContext(TokoContext)
  if (!value) throw new Error('TokoApp must be rendered inside StoreRoot.')
  return value
}

/** Rute awal "/": pertama kali buka atau baru dipasang → Pilih Toko dulu. */
function Start() {
  const { branch } = useStore()
  const standalone = isStandalone()
  if (!branch || (standalone && readStorage(PICKED_IN_APP_KEY) !== 'yes'))
    return <Navigate to="/pilih-toko" replace />
  if (!standalone && readStorage(WELCOMED_KEY) !== 'yes') return <Welcome />
  return <Navigate to="/app" replace />
}

function Welcome() {
  const navigate = useNavigate()
  const { install, sheet, closeSheet } = useInstall()

  const next = () => {
    writeStorage(WELCOMED_KEY, 'yes')
    navigate('/app', { replace: true })
  }

  useEffect(() => {
    const installed = () => next()
    window.addEventListener('appinstalled', installed)
    return () => window.removeEventListener('appinstalled', installed)
  })

  async function onInstall() {
    if (await install()) next()
  }

  return (
    <main className="welcome">
      <div className="glow" />
      <section className="welcome-card">
        <Brand />
        <h1>Pasang Toko Santri</h1>
        <p className="intro">Ikonnya muncul di Beranda HP.</p>
        <div className="phone" aria-hidden="true">
          <div>
            <b />
            <i />
          </div>
          <span />
          <em />
          <section>
            <i />
            <i />
            <i />
            <i />
          </section>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => void onInstall()}>
            Pasang Aplikasi
          </button>
          <button onClick={next}>Lewati</button>
        </div>
      </section>
      {sheet && (
        <InstallSheet
          kind={sheet}
          onClose={() => {
            closeSheet()
            next()
          }}
        />
      )}
    </main>
  )
}

function BranchPicker() {
  const { setBranch, allowedBranches } = useStore()
  const navigate = useNavigate()
  const choose = (branch: Branch) => {
    setBranch(branch)
    const standalone = isStandalone()
    if (standalone) writeStorage(PICKED_IN_APP_KEY, 'yes')
    if (!standalone && readStorage(WELCOMED_KEY) !== 'yes') navigate('/', { replace: true })
    else navigate('/app', { replace: true })
  }
  return (
    <main className="page home branch-home">
      <HomeHero />
      <section className="branch-content">
        <h1>Pilih Toko</h1>
        <div className="branch-options">
          {allowedBranches.map((item) => (
            <button className="branch-card" key={item} onClick={() => choose(item)}>
              <StoreIcon className="branch-store" />
              <b>{item}</b>
              <em>›</em>
            </button>
          ))}
        </div>
        <InstallButton />
      </section>
    </main>
  )
}

function Home() {
  const { branch, setBranch, invoices } = useStore()
  const navigate = useNavigate()
  const unpaid = invoices.filter((invoice) => invoice.branch === branch && invoice.status !== 'Lunas').length
  return (
    <main className="page home">
      <HomeHero install />
      <section className="store-switch">
        <div className="store-pill">
          <StoreIcon className="pill-store" />
          <h1>{branch}</h1>
        </div>
        <button
          onClick={() => {
            setBranch(null)
            navigate('/pilih-toko')
          }}
        >
          ⇄ Ganti Toko
        </button>
      </section>
      <section className="greeting">
        <GreetingScene />
        <Heart className="float-heart h1" />
        <Heart className="float-heart h2" />
        <Rays className="kitten-rays" />
        <Kitten />
        <div className="speech-bubble">
          <svg viewBox="0 0 220 150" preserveAspectRatio="none" aria-hidden="true">
            <path
              className="speech-shape"
              d="M24 99C12 87 6 74 6 59 6 25 47 5 109 5c63 0 105 26 105 69 0 42-41 71-104 71-37 0-66-10-83-28L7 130l15-26Z"
            />
          </svg>
          <h2>
            <span>
              Mau lihat
              <br />
              apa, Bu?
            </span>
            <Heart className="bubble-heart" />
          </h2>
        </div>
      </section>
      <section className="features">
        <Link className="feature" to="/app/buku-besar">
          <span>
            <MenuIllustration name="ledger" />
          </span>
          <b>Buku Besar</b>
        </Link>
        <Link className="feature" to="/app/buku-uang">
          <span>
            <MenuIllustration name="cash" />
          </span>
          <b>Buku Uang</b>
        </Link>
        <Link className="feature wide" to="/app/tanya-data">
          <span>
            <MenuIllustration name="ask" />
          </span>
          <b>Tanya & Catat</b>
        </Link>
      </section>
      <Link className="reminder" to="/app/buku-besar">
        <span>
          <Icon name="bell" />
        </span>
        <div>
          <b>{unpaid ? `${unpaid} nota belum lunas` : 'Semua nota lunas'}</b>
        </div>
        <em>›</em>
      </Link>
    </main>
  )
}

function PageHeader({ title, subtitle, back = '/app' }: { title: string; subtitle: string; back?: string }) {
  return (
    <header className="inner-head">
      <Link to={back} aria-label="Kembali">
        ‹
      </Link>
      <div>
        <small>{subtitle}</small>
        <h1>{title}</h1>
      </div>
    </header>
  )
}

const supplierPath = (supplier: string) => `/app/buku-besar/supplier/${encodeURIComponent(supplier)}`
const dayLabel = (date: string) => {
  const today = todayISO()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === today) return 'Hari ini'
  if (date === yesterday.toISOString().slice(0, 10)) return 'Kemarin'
  return shortDate(date)
}
const paidText = (invoice: Invoice) =>
  invoice.status === 'Lunas'
    ? `Lunas ${invoice.paidDates.length ? shortDate(invoice.paidDates.at(-1)!) : ''}`.trim()
    : invoice.status === 'Sebagian'
      ? `Sisa ${rupiah(invoice.remainingBalance)}`
      : 'Belum dibayar'

/** Buku Besar: rekap nota per supplier. */
function Ledger() {
  const { branch, invoices } = useStore()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const branchInvoices = invoices.filter((invoice) => invoice.branch === branch)
  const q = query.trim().toLowerCase()
  const groups = [...new Set(branchInvoices.map((invoice) => invoice.supplier))]
    .sort((a, b) => a.localeCompare(b, 'id'))
    .map((supplier) => {
      const notes = branchInvoices.filter((invoice) => invoice.supplier === supplier)
      return {
        supplier,
        notes,
        last: notes.reduce((max, invoice) => (invoice.date > max ? invoice.date : max), ''),
        remaining: notes.reduce((sum, invoice) => sum + invoice.remainingBalance, 0),
        open: notes.filter((invoice) => invoice.status !== 'Lunas').length,
      }
    })
    .filter(
      (group) =>
        !q ||
        group.supplier.toLowerCase().includes(q) ||
        group.notes.some(
          (invoice) =>
            invoice.number.toLowerCase().includes(q) ||
            invoice.items.some((item) => item.product.toLowerCase().includes(q)),
        ),
    )
  const openTotal = branchInvoices.reduce((sum, invoice) => sum + invoice.remainingBalance, 0)
  return (
    <main className="page inner">
      <PageHeader title="Buku Besar" subtitle={`${branch} • Data simulasi`} />
      <section>
        <div className="summary">
          <span>
            <small>Belum dibayar</small>
            <b>{rupiah(openTotal)}</b>
          </span>
          <span>
            <small>Supplier</small>
            <b>{groups.length}</b>
          </span>
        </div>
        <label className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari supplier, nota, atau barang"
            aria-label="Cari"
          />
        </label>
        <div className="supplier-list">
          {groups.map((group) => (
            <button className="supplier-card" key={group.supplier} onClick={() => navigate(supplierPath(group.supplier))}>
              <span>
                <b>{group.supplier}</b>
                <small>
                  {group.notes.length} nota • terakhir {shortDate(group.last)}
                </small>
              </span>
              <strong className={group.remaining ? 'due' : ''}>
                {group.remaining ? rupiah(group.remaining) : '✓'}
                <small>{group.remaining ? `${group.open} belum lunas` : 'lunas'}</small>
              </strong>
            </button>
          ))}
        </div>
        {!groups.length && <Empty text="Tidak ketemu. Coba kata lain." />}
      </section>
    </main>
  )
}

/** Daftar nota satu supplier, terbaru di atas. */
function SupplierNotes() {
  const { branch, invoices } = useStore()
  const pathname = usePathname()
  const navigate = useNavigate()
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [toast, setToast] = useState('')
  const supplier = decodeURIComponent(pathname.split('/').at(-1) ?? '')
  const notes = invoices
    .filter((invoice) => invoice.branch === branch && invoice.supplier === supplier)
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!notes.length) return <Navigate to="/app/buku-besar" replace />
  return (
    <main className="page inner">
      <PageHeader title={supplier} subtitle={`${branch} • ${notes.length} nota`} back="/app/buku-besar" />
      <section className="invoice-list">
        {notes.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onOpen={() => navigate(`/app/buku-besar/${encodeURIComponent(invoice.number)}`)}
            onPay={() => setPaying(invoice)}
          />
        ))}
      </section>
      {paying && (
        <PaymentModal
          invoice={paying}
          remaining={paying.remainingBalance}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setToast(`Nota ${paying.number} dicatat sudah bayar.`)
            setPaying(null)
          }}
        />
      )}
      {toast && <Toast text={toast} />}
    </main>
  )
}

function InvoiceCard({
  invoice,
  onOpen,
  onPay,
}: {
  invoice: Invoice
  onOpen: () => void
  onPay: () => void
}) {
  const first = invoice.items[0]
  return (
    <article className="invoice-card compact" onClick={onOpen}>
      <div className="invoice-top">
        <small>Datang {shortDate(invoice.date)}</small>
        <small>{invoice.number}</small>
      </div>
      <p className="invoice-first">
        {first.product}
        <span>
          {first.quantity} {first.unit} × {rupiah(first.unitPrice)}
        </span>
      </p>
      {invoice.items.length > 1 && <p className="invoice-more">+{invoice.items.length - 1} barang lain</p>}
      <footer>
        <b>{rupiah(invoice.total)}</b>
        <em className={`pay-state ${invoice.status.replace(' ', '-').toLowerCase()}`}>{paidText(invoice)}</em>
      </footer>
      {invoice.status !== 'Lunas' && (
        <button
          type="button"
          className="pay-button"
          onClick={(event) => {
            event.stopPropagation()
            onPay()
          }}
        >
          Sudah Bayar
        </button>
      )}
    </article>
  )
}

function InvoiceDetail() {
  const { invoices, payments } = useStore()
  const pathname = usePathname()
  const invoiceId = decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) ?? '')
  const navigate = useNavigate()
  const invoice = invoices.find((item) => item.id === invoiceId || item.number === invoiceId)
  const [showPayment, setShowPayment] = useState(false)
  const [toast, setToast] = useState('')
  if (!invoice) return <Navigate to="/app/buku-besar" replace />
  const invoicePayments = payments.filter((payment) => payment.invoiceId === invoice.id)
  const paid = invoicePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const remaining = invoice.remainingBalance
  return (
    <main className="page inner">
      <PageHeader
        title={invoice.number}
        subtitle={`${invoice.supplier} • Data simulasi`}
        back={supplierPath(invoice.supplier)}
      />
      <section>
        <div className="detail-hero">
          <span className={`status ${invoice.status.replace(' ', '-').toLowerCase()}`}>
            {invoice.status}
          </span>
          <p>
            Barang datang {shortDate(invoice.date)} • Jatuh tempo {shortDate(invoice.dueDate)}
            <br />
            {invoice.paidDates.length
              ? `Dibayar ${invoice.paidDates.map((date) => shortDate(date)).join(', ')}`
              : 'Belum dibayar'}
          </p>
          <h2>{rupiah(invoice.total)}</h2>
          <div>
            <span>
              Sudah dibayar <b>{rupiah(paid)}</b>
            </span>
            <span>
              Sisa <b>{rupiah(remaining)}</b>
            </span>
          </div>
        </div>
        <section className="detail-block">
          <h3>Barang masuk</h3>
          {invoice.items.map((item) => (
            <div className="item-row" key={item.product}>
              <div>
                <b>{item.product}</b>
                <small>
                  {item.quantity} {item.unit} × {rupiah(item.unitPrice)}
                </small>
              </div>
              <strong>{rupiah(item.total)}</strong>
            </div>
          ))}
        </section>
        <section className="detail-block">
          <h3>Riwayat pembayaran</h3>
          {invoicePayments.map((payment) => (
            <div className="payment-row" key={payment.id}>
              <span>✓</span>
              <div>
                <b>{rupiah(payment.amount)}</b>
                <small>
                  {shortDate(payment.date)} • {payment.method} •{' '}
                  {payment.proofUrl ? (
                    <a href={payment.proofUrl} target="_blank" rel="noreferrer">
                      {payment.proofName}
                    </a>
                  ) : (
                    payment.proofName
                  )}
                </small>
              </div>
              <em className={payment.acosysRecorded ? 'done' : ''}>
                {payment.acosysRecorded ? 'Sudah di ACOSYS' : 'Belum di ACOSYS'}
              </em>
            </div>
          ))}
          {!invoicePayments.length && <p className="muted">Belum ada pembayaran.</p>}
        </section>
        {invoice.status !== 'Lunas' && (
          <button className="primary sticky-action" onClick={() => setShowPayment(true)}>
            Sudah Bayar
          </button>
        )}
        <button className="secondary-action" onClick={() => navigate('/app/buku-uang')}>
          Lihat di Buku Uang
        </button>
      </section>
      {showPayment && (
        <PaymentModal
          invoice={invoice}
          remaining={remaining}
          onClose={() => setShowPayment(false)}
          onSaved={() => {
            setShowPayment(false)
            setToast('Pembayaran simulasi tersimpan di perangkat ini dan muncul di Buku Uang.')
          }}
        />
      )}{' '}
      {toast && <Toast text={toast} />}
    </main>
  )
}

/** Pilihan Sudah / Belum dicatat di ACOSYS (bukan checkbox). */
function AcosysChoice({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="acosys-choice" role="radiogroup" aria-label="Sudah dicatat di ACOSYS?">
      <span>Di ACOSYS?</span>
      <div>
        {[
          ['Sudah', true],
          ['Belum', false],
        ].map(([label, option]) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === option}
            key={String(label)}
            className={value === option ? 'active' : ''}
            onClick={() => onChange(option as boolean)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PaymentModal({
  invoice,
  remaining,
  onClose,
  onSaved,
}: {
  invoice: Invoice
  remaining: number
  onClose: () => void
  onSaved: () => void
}) {
  const { recordPayment } = useStore()
  const [date, setDate] = useState(() => todayISO())
  const [amount, setAmount] = useState(String(remaining))
  const [method, setMethod] = useState<PaymentMethod>('bca')
  const [proofName, setProofName] = useState('')
  const [acosys, setAcosys] = useState(false)
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!date || numericAmount <= 0 || numericAmount > remaining || !proofName)
      return setError('Lengkapi data dan pastikan jumlah tidak melebihi sisa tagihan.')
    const result = recordPayment({
      invoiceId: invoice.id,
      date,
      amount: numericAmount,
      method,
      proofName,
      acosysRecorded: acosys,
    })
    if (!result.ok) return setError(result.error ?? 'Pembayaran gagal disimpan.')
    onSaved()
  }
  function chooseProof(file: File | undefined) {
    setError('')
    if (!file) return setProofName('')
    if (file.size > 10 * 1024 * 1024) {
      setProofName('')
      return setError('Ukuran bukti maksimal 10 MB.')
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setProofName('')
      return setError('Bukti harus berupa gambar atau PDF.')
    }
    setProofName(file.name)
  }
  return (
    <div className="backdrop" onClick={onClose}>
      <form className="payment-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <div>
            <small>KONFIRMASI PEMBAYARAN • SIMULASI</small>
            <h2>{invoice.supplier}</h2>
            <p>
              {invoice.number} • Sisa {rupiah(remaining)}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          Tanggal pembayaran
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Jumlah dibayar
          <div className="money-input">
            <span>Rp</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </label>
        <label>
          Metode
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="bca">Transfer BCA</option>
            <option value="bri">Transfer BRI</option>
            <option value="cash">Tunai</option>
          </select>
        </label>
        <label>
          Bukti pembayaran
          <span className="upload">
            <input
              type="file"
              name="proof"
              accept="image/*,.pdf"
              onChange={(e) => chooseProof(e.target.files?.[0])}
            />
            {proofName || 'Pilih foto atau PDF'}
          </span>
        </label>
        <AcosysChoice value={acosys} onChange={setAcosys} />
        <p className="info-note">Simulasi: hanya tersimpan di HP ini, bukti tidak diunggah.</p>
        {error && <p className="form-error">{error}</p>}
        <button className="primary" type="submit">
          Simpan Pembayaran
        </button>
      </form>
    </div>
  )
}

/** Buku Uang: uang masuk (QRIS/transfer) dan bayar supplier, per hari. */
function CashBook() {
  const { branch, payments, invoices, customerIncome } = useStore()
  const [filter, setFilter] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua')
  const month = todayISO().slice(0, 7)
  const rows = [
    ...customerIncome
      .filter((item) => item.branch === branch)
      .map((item) => ({
        id: item.id,
        date: item.date,
        title: item.method === 'QRIS' ? 'QRIS pelanggan' : 'Transfer pelanggan',
        detail: '',
        amount: item.amount,
        type: 'in' as const,
        source: '',
      })),
    ...payments
      .filter((payment) => payment.branch === branch)
      .map((payment) => {
        const invoice = invoices.find((item) => item.id === payment.invoiceId)!
        return {
          id: payment.id,
          date: payment.date,
          title: invoice.supplier,
          detail: `${payment.method} • ${invoice.number}`,
          amount: payment.amount,
          type: 'out' as const,
          source: invoice.number,
        }
      }),
  ].sort((a, b) => b.date.localeCompare(a.date) || (a.type === b.type ? 0 : a.type === 'in' ? -1 : 1))
  const monthIn = rows.filter((row) => row.type === 'in' && row.date.startsWith(month)).reduce((s, r) => s + r.amount, 0)
  const monthOut = rows.filter((row) => row.type === 'out' && row.date.startsWith(month)).reduce((s, r) => s + r.amount, 0)
  const shown = rows.filter((row) => filter === 'Semua' || (filter === 'Masuk' ? row.type === 'in' : row.type === 'out'))
  const days = [...new Set(shown.map((row) => row.date))]
  return (
    <main className="page inner">
      <PageHeader title="Buku Uang" subtitle={`${branch} • Data simulasi`} />
      <section>
        <div className="summary">
          <span>
            <small>Masuk bulan ini</small>
            <b className="in">{rupiah(monthIn)}</b>
          </span>
          <span>
            <small>Bayar supplier</small>
            <b className="out">{rupiah(monthOut)}</b>
          </span>
        </div>
        <div className="filters">
          {(['Semua', 'Masuk', 'Keluar'] as const).map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item === 'Masuk' ? 'Uang masuk' : item === 'Keluar' ? 'Bayar supplier' : 'Semua'}
            </button>
          ))}
        </div>
        {days.slice(0, 45).map((day) => (
          <div className="day-group" key={day}>
            <h3 className="day-head">{dayLabel(day)}</h3>
            <div className="list">
              {shown
                .filter((row) => row.date === day)
                .map((item) => (
                  <div className="row" key={item.id}>
                    <span className={`money ${item.type}`}>{item.type === 'in' ? '+' : '−'}</span>
                    <div>
                      <b>{item.title}</b>
                      {item.detail && <small>{item.detail}</small>}
                      {item.source && <Link to={`/app/buku-besar/${item.source}`}>Lihat nota</Link>}
                    </div>
                    <strong className={item.type}>
                      {item.type === 'in' ? '+' : '−'}
                      {rupiah(item.amount)}
                    </strong>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {!days.length && <Empty text="Belum ada catatan." />}
      </section>
    </main>
  )
}

type ChatItem =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'bot'; answer: Answer; state?: 'saved' | 'cancelled'; result?: string[] }

const EXAMPLES = [
  'Uang ada berapa?',
  'Apa yang hampir habis?',
  'Barang apa yang laris?',
  'Tagihan APP sudah lunas?',
  'Barang Kondang Jaya datang kapan?',
  'Isi 1 koli Africa 115 X 155?',
  'Spon ati 9mm dari Kondang Jaya kemarin berapa?',
  'Karpet Mitra sama Planet murah mana?',
  'Catat harga Busa Ati 9 mm Hitam dari Kondang Jaya Rp 86.000 per LBR',
  'Ubah harga jual Lem Fox Biru jadi Rp 54.000',
]

/** Tanya & Catat: tanya, atau catat harga baru dari WA supplier. */
function AskData() {
  const store = useStore()
  const { branch, invoices, payments, customerIncome, balances, products, confirmAction } = store
  const [input, setInput] = useState('')
  const [chat, setChat] = useState<ChatItem[]>([])
  const [acosys, setAcosys] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chat])

  function ask(question: string) {
    const text = question.trim()
    if (!text) return
    const answer = answerQuestion(text, branch ?? 'Gading', {
      invoices,
      payments,
      income: customerIncome,
      accounts: balances,
      products,
    })
    setChat((items) => [
      ...items.map((item) =>
        item.role === 'bot' && item.answer.action && !item.state ? { ...item, state: 'cancelled' as const } : item,
      ),
      { id: nextId.current++, role: 'user', text },
      { id: nextId.current++, role: 'bot', answer },
    ])
    setInput('')
    setAcosys(false)
  }

  function decide(id: number, save: boolean) {
    setChat((items) =>
      items.map((item) => {
        if (item.id !== id || item.role !== 'bot' || !item.answer.action) return item
        if (!save) return { ...item, state: 'cancelled' }
        return { ...item, state: 'saved', result: confirmAction(item.answer.action, acosys) }
      }),
    )
  }

  return (
    <main className="page inner ask-page">
      <PageHeader title="Tanya & Catat" subtitle={`${branch} • Data simulasi`} />
      <section className="ask-panel">
        {!chat.length && (
          <div className="ask-intro">
            <span>
              <Icon name="ask" />
            </span>
            <h2>Mau tanya apa, Bu?</h2>
            <p>Bisa tanya, atau catat harga baru dari WA supplier.</p>
          </div>
        )}
        <div className="suggestions">
          {EXAMPLES.map((text) => (
            <button key={text} onClick={() => ask(text)}>
              {text}
            </button>
          ))}
        </div>
        <div className="chat">
          {chat.map((item) =>
            item.role === 'user' ? (
              <p className="chat-user" key={item.id}>
                {item.text}
              </p>
            ) : (
              <div className={`answer ${item.answer.tone ?? ''}`} key={item.id}>
                {item.answer.lines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
                {item.answer.action && !item.state && (
                  <div className="confirm">
                    <AcosysChoice value={acosys} onChange={setAcosys} />
                    <div>
                      <button className="confirm-yes" onClick={() => decide(item.id, true)}>
                        Simpan
                      </button>
                      <button className="confirm-no" onClick={() => decide(item.id, false)}>
                        Batal
                      </button>
                    </div>
                  </div>
                )}
                {item.state === 'cancelled' && item.answer.action && <p className="muted">Tidak disimpan.</p>}
                {item.state === 'saved' && (
                  <div className="saved">
                    {item.result?.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                )}
                {item.answer.sources.length > 0 && (
                  <div className="sources">
                    <b>Sumber</b>
                    {item.answer.sources.slice(0, 4).map((source, index) => (
                      <Link to={source.to} key={`${source.label}-${index}`}>
                        {source.label}
                        <span>›</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          <div ref={endRef} />
        </div>
        <form
          className="ask-form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            ask(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaan atau harga baru…"
            aria-label="Pertanyaan"
          />
          <button aria-label="Kirim">↑</button>
        </form>
      </section>
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <b>Tidak ada hasil</b>
      <p>{text}</p>
    </div>
  )
}
function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}
function NotFound() {
  return (
    <main className="welcome">
      <section className="welcome-card">
        <Brand />
        <h1>Halaman tidak ditemukan</h1>
        <Link className="primary link-button" to="/app">
          Kembali ke Beranda
        </Link>
      </section>
    </main>
  )
}

const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, 'Pasang Aplikasi'],
  [/^\/pilih-toko$/, 'Pilih Toko'],
  [/^\/app$/, 'Beranda'],
  [/^\/app\/buku-besar$/, 'Buku Besar'],
  [/^\/app\/buku-besar\/supplier\//, 'Nota Supplier'],
  [/^\/app\/buku-besar\//, 'Rincian Nota'],
  [/^\/app\/buku-uang$/, 'Buku Uang'],
  [/^\/app\/tanya-data$/, 'Tanya & Catat'],
]

function Screens() {
  const pathname = usePathname()
  const { branch } = useStore()

  useEffect(() => {
    const title = TITLES.find(([pattern]) => pattern.test(pathname))?.[1]
    document.title = title ? `${title} • Toko Santri` : 'Halaman tidak ditemukan • Toko Santri'
  }, [pathname])

  if (pathname === '/') return <Start />
  if (pathname === '/login') return <Navigate to="/pilih-toko" replace />
  if (pathname === '/pilih-toko') return <BranchPicker />
  if (pathname.startsWith('/app') && !branch) return <Navigate to="/pilih-toko" replace />
  if (pathname === '/app') return <Home />
  if (pathname === '/app/buku-besar') return <Ledger />
  if (pathname.startsWith('/app/buku-besar/supplier/')) return <SupplierNotes />
  if (pathname.startsWith('/app/buku-besar/')) return <InvoiceDetail />
  if (pathname === '/app/buku-uang') return <CashBook />
  if (pathname === '/app/harga-barang') return <Navigate to="/app/tanya-data" replace />
  if (pathname === '/app/tanya-data') return <AskData />
  return <NotFound />
}

export default function TokoApp() {
  return (
    <StoreRoot>
      <Screens />
    </StoreRoot>
  )
}
