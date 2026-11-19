/*
 * Toko Santri service worker.
 * Caches ONLY public static files: the app shell (index.html), hashed build
 * assets under /assets/, icons, and the manifest. It never caches API calls,
 * cross-origin requests, or anything that is not a plain same-origin GET.
 * All records shown by the app are simulated and bundled into the JS build.
 */
const VERSION = 'v5'
const CACHE = `toko-santri-static-${VERSION}`
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]
const STATIC_FILES = new Set(SHELL.filter((path) => path !== '/'))

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

const isPrivate = (url) =>
  url.pathname.startsWith('/api/') ||
  url.pathname.startsWith('/admin') ||
  url.search.length > 0

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || isPrivate(url)) return
  if (request.headers.has('authorization')) return

  // Page navigations: network first, fall back to the cached app shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    )
    return
  }

  // Hashed build assets and icons: cache first.
  const isStatic = url.pathname.startsWith('/assets/') || STATIC_FILES.has(url.pathname)
  if (!isStatic) return
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
