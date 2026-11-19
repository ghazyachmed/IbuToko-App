import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import type { User } from '@/payload-types'

const SESSION_COOKIE = 'app-session'
const PAYLOAD_COOKIE = 'payload-token'
const appUserCollection = 'users' as const
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 12,
}

export type AppUserSession = User & { collection: 'users' }

export function createAppAuth(collection: typeof appUserCollection) {
  return {
    async currentUser(): Promise<AppUserSession | null> {
      const token = (await cookies()).get(SESSION_COOKIE)?.value
      if (!token) return null
      const payload = await getPayload({ config })
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })
      if (!user || user.collection !== collection) return null
      return { ...user, collection } as AppUserSession
    },
    async login(email: string, password: string) {
      const payload = await getPayload({ config })
      const result = await payload.login({
        collection,
        data: { email, password },
      })
      if (!result.token) throw new Error('Login gagal.')
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, result.token, sessionCookieOptions)
      // Payload's upload endpoint authenticates its canonical cookie directly.
      cookieStore.set(PAYLOAD_COOKIE, result.token, sessionCookieOptions)
      return result.user
    },
    async signup(email: string, password: string) {
      const payload = await getPayload({ config })
      await payload.create({
        collection,
        overrideAccess: false,
        draft: false,
        data: {
          email,
          password,
          role: 'owner',
          allowedBranches: ['gading', 'palur'],
        },
      })
      return this.login(email, password)
    },
    async logout() {
      const cookieStore = await cookies()
      cookieStore.delete(SESSION_COOKIE)
      cookieStore.delete(PAYLOAD_COOKIE)
    },
  }
}

export const appAuth = createAppAuth(appUserCollection)
