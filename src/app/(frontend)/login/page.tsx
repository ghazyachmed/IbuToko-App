import { redirect } from 'next/navigation'
import { appAuth } from '@/lib/app-auth'
import AuthForm from '@/components/AuthForm'

export default async function LoginPage() {
  const user = await appAuth.currentUser()
  if (user) redirect('/app')
  return <AuthForm />
}
