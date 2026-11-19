import TokoApp from '@/components/TokoApp'
import type { TokoData } from '@/lib/toko-types'

const emptyData: TokoData = {
  invoices: [],
  payments: [],
  income: [],
  accounts: [],
  products: [],
}

export default function WelcomePage() {
  return <TokoApp data={emptyData} allowedBranches={[]} />
}
