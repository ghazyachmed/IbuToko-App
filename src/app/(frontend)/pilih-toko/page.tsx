import { redirect } from 'next/navigation'
import TokoApp from '@/components/TokoApp'
import { appAuth } from '@/lib/app-auth'
import { getTokoData } from '@/lib/toko-data'

export default async function BranchPage() {
  const user = await appAuth.currentUser()
  if (!user) redirect('/login')
  const data = await getTokoData()
  if (!data) redirect('/login')
  const allowedBranches = user.allowedBranches.map((branch) =>
    branch === 'gading' ? ('Gading' as const) : ('Palur' as const),
  )
  return <TokoApp data={data} allowedBranches={allowedBranches} />
}
