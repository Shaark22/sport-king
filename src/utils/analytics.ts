import { isTrackablePublicPath } from './publicPaths'

export type ContactType =
  | 'whatsapp'
  | 'instagram'
  | 'youtube'
  | 'phone'
  | 'contacts_cta'
  | 'contacts_page_instagram'
  | 'contacts_page_youtube'

const VISITOR_KEY = 'sportking-visitor-id'
const SESSION_TRACKED_KEY = 'sportking-analytics-tracked'
let memoryVisitorId: string | null = null

type TrackPayload =
  | { type: 'page_view'; path: string; visitorId: string }
  | { type: 'contact_click'; contact: ContactType; visitorId: string }
  | {
      type: 'product_view' | 'product_click' | 'kaspi_click'
      productId: string
      slug: string
      name: string
      visitorId: string
    }

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    if (!memoryVisitorId) memoryVisitorId = crypto.randomUUID()
    return memoryVisitorId
  }
}

function getSessionTracked(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_TRACKED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function markSessionOnce(key: string): boolean {
  try {
    const tracked = getSessionTracked()
    if (tracked.has(key)) return false
    tracked.add(key)
    sessionStorage.setItem(SESSION_TRACKED_KEY, JSON.stringify([...tracked]))
    return true
  } catch {
    return true
  }
}

function send(payload: TrackPayload) {
  const body = JSON.stringify(payload)
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/event', blob)
    return
  }
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export function trackPageView(path: string) {
  if (!isTrackablePublicPath(path)) return
  if (!markSessionOnce(`page:${path}`)) return
  send({ type: 'page_view', path, visitorId: getVisitorId() })
}

export function trackContactClick(contact: ContactType) {
  send({ type: 'contact_click', contact, visitorId: getVisitorId() })
}

export function trackProductView(product: {
  id: string
  slug: string
  name: string
}) {
  if (!markSessionOnce(`product_view:${product.id}`)) return
  send({
    type: 'product_view',
    productId: product.id,
    slug: product.slug,
    name: product.name,
    visitorId: getVisitorId(),
  })
}

export function trackProductClick(product: {
  id: string
  slug: string
  name: string
}) {
  send({
    type: 'product_click',
    productId: product.id,
    slug: product.slug,
    name: product.name,
    visitorId: getVisitorId(),
  })
}

export function trackKaspiClick(product: {
  id: string
  slug: string
  name: string
}) {
  send({
    type: 'kaspi_click',
    productId: product.id,
    slug: product.slug,
    name: product.name,
    visitorId: getVisitorId(),
  })
}
