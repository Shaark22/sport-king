const AUTH_KEY = 'sportking-admin-token'

function getToken() {
  try {
    return sessionStorage.getItem(AUTH_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(AUTH_KEY, token)
    else sessionStorage.removeItem(AUTH_KEY)
  } catch {
    /* private mode / storage disabled */
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Ошибка сервера (${res.status})`)
  }

  return res.json() as Promise<T>
}

export interface StoreData {
  version: number
  products: import('../types/product').Product[]
  categories: import('../types/category').Category[]
  reviews: import('../types/review').Review[]
}

export interface AnalyticsSummary {
  updatedAt: string
  totals: {
    uniqueVisitors: number
    pageViews: number
    contactClicks: number
    kaspiClicks: number
  }
  contacts: { key: string; label: string; count: number }[]
  topClicks: {
    productId: string
    name: string
    slug: string
    views: number
    clicks: number
    kaspiClicks: number
  }[]
  topKaspi: AnalyticsSummary['topClicks']
  last7Days: { date: string; uniqueVisitors: number; pageViews: number }[]
}

export const api = {
  getStore: () => request<StoreData>('/api/store'),

  verifyAuth: () => request<{ ok: boolean }>('/api/auth/me'),

  getAnalytics: () => request<AnalyticsSummary>('/api/analytics'),

  getErrors: () =>
    request<{ entries: { id: string; at: string; message: string; path: string; status: number }[] }>(
      '/api/errors',
    ),

  login: (password: string) =>
    request<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('/api/upload', {
      method: 'POST',
      body: form,
    })
  },

  createProduct: (product: Omit<import('../types/product').Product, 'id'> & { id?: string }) =>
    request<import('../types/product').Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  updateProduct: (id: string, product: Partial<import('../types/product').Product>) =>
    request<import('../types/product').Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),

  deleteProduct: (id: string) =>
    request<{ ok: boolean }>(`/api/products/${id}`, { method: 'DELETE' }),

  createCategory: (category: Omit<import('../types/category').Category, 'id'> & { id?: string }) =>
    request<import('../types/category').Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    }),

  updateCategory: (id: string, category: Partial<import('../types/category').Category>) =>
    request<import('../types/category').Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),

  resetStore: () =>
    request<StoreData>('/api/store/reset', { method: 'POST' }),

  createReview: (review: Omit<import('../types/review').Review, 'id'> & { id?: string }) =>
    request<import('../types/review').Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    }),

  updateReview: (id: string, review: Partial<import('../types/review').Review>) =>
    request<import('../types/review').Review>(`/api/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(review),
    }),

  deleteReview: (id: string) =>
    request<{ ok: boolean }>(`/api/reviews/${id}`, { method: 'DELETE' }),

  createOrder: (payload: {
    productId: string
    customerName: string
    phone: string
    comment?: string
  }) =>
    request<import('../types/order').Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOrders: (status?: import('../types/order').OrderStatus) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return request<import('../types/order').Order[]>(`/api/orders${query}`)
  },

  updateOrder: (id: string, patch: { status?: import('../types/order').OrderStatus }) =>
    request<import('../types/order').Order>(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteOrder: (id: string) =>
    request<{ ok: boolean }>(`/api/orders/${id}`, { method: 'DELETE' }),

  getSettings: () => request<import('../types/siteSettings').SiteSettings>('/api/settings'),

  updateSettings: (settings: Partial<import('../types/siteSettings').SiteSettings>) =>
    request<import('../types/siteSettings').SiteSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  resetSettings: () =>
    request<import('../types/siteSettings').SiteSettings>('/api/settings/reset', {
      method: 'POST',
    }),

  getGallery: () =>
    request<{ photos: import('../types/galleryPhoto').GalleryPhoto[] }>('/api/gallery'),

  getGalleryAll: () =>
    request<{ photos: import('../types/galleryPhoto').GalleryPhoto[] }>('/api/gallery/all'),

  createGalleryPhoto: (payload: {
    url: string
    caption?: string
    alt?: string
    published?: boolean
  }) =>
    request<import('../types/galleryPhoto').GalleryPhoto>('/api/gallery', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateGalleryPhoto: (
    id: string,
    patch: Partial<
      Pick<
        import('../types/galleryPhoto').GalleryPhoto,
        'url' | 'caption' | 'alt' | 'published' | 'sortOrder'
      >
    >,
  ) =>
    request<import('../types/galleryPhoto').GalleryPhoto>(`/api/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  deleteGalleryPhoto: (id: string) =>
    request<{ ok: boolean }>(`/api/gallery/${id}`, { method: 'DELETE' }),
}

export async function uploadImageFile(file: File): Promise<string> {
  const compressed = await compressIfNeeded(file)
  const { url } = await api.uploadImage(compressed)
  return url
}

/** Gallery uploads: always compress to keep storage and bandwidth light. */
export async function uploadGalleryImageFile(file: File): Promise<string> {
  const compressed = await compressGalleryIfNeeded(file)
  const { url } = await api.uploadImage(compressed)
  return url
}

async function compressGalleryIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const { compressGalleryImageToDataUrl } = await import('../utils/compressImage')
    const dataUrl = await compressGalleryImageToDataUrl(file)
    const blob = await (await fetch(dataUrl)).blob()
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
      type: 'image/jpeg',
    })
  } catch {
    if (file.size < 400_000) return file
    return compressIfNeeded(file)
  }
}

async function compressIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 400_000) return file
  try {
    const { compressImageToDataUrl } = await import('../utils/compressImage')
    const dataUrl = await compressImageToDataUrl(file)
    const blob = await (await fetch(dataUrl)).blob()
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
      type: 'image/jpeg',
    })
  } catch {
    return file
  }
}
