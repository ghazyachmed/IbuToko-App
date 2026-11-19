import { type MouseEvent, type ReactNode, useEffect, useSyncExternalStore } from 'react'

/** Minimal History-API router: keeps the app's existing URL paths. */
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') window.addEventListener('popstate', notify)

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const normalize = (pathname: string) =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (to === window.location.pathname + window.location.search) return
  if (options.replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  void window.scrollTo(0, 0)
  notify()
}

export const usePathname = () =>
  useSyncExternalStore(
    subscribe,
    () => normalize(window.location.pathname),
    () => '/',
  )

export const useNavigate = () => navigate

export function Navigate({ to }: { to: string; replace?: boolean }) {
  useEffect(() => {
    navigate(to, { replace: true })
  }, [to])
  return null
}

export function Link({
  to,
  className,
  children,
  ...rest
}: {
  to: string
  className?: string
  children: ReactNode
  'aria-label'?: string
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  )
}
