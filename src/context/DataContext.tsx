import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from 'react'

import type { Product } from '../types/product'

import type { Category } from '../types/category'

import type { Review } from '../types/review'

import type { SiteSettings } from '../types/siteSettings'

import { defaultProducts } from '../data/products'

import { defaultCategories } from '../data/categories'

import { defaultSiteSettings, mergeSiteSettings, readCachedSiteSettings, writeCachedSiteSettings } from '../types/siteSettings'

import { api, setAuthToken, type StoreData } from '../api/client'



const AUTH_KEY = 'sportking-admin-token'



interface DataContextValue {

  products: Product[]

  categories: Category[]

  reviews: Review[]

  siteSettings: SiteSettings

  settingsHydrated: boolean

  loading: boolean

  error: string | null

  refresh: () => Promise<void>

  getProductBySlug: (slug: string) => Product | undefined

  getCategoryBySlug: (slug: string) => Category | undefined

  getProductsByCategory: (slug: string) => Product[]

  getPopularProducts: (limit?: number) => Product[]

  getReviewsByProductId: (productId: string) => Review[]

  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>

  updateProduct: (id: string, data: Partial<Product>) => Promise<void>

  deleteProduct: (id: string) => Promise<void>

  addCategory: (category: Omit<Category, 'id'>) => Promise<Category>

  updateCategory: (id: string, data: Partial<Category>) => Promise<void>

  deleteCategory: (id: string) => Promise<void>

  addReview: (review: Omit<Review, 'id'>) => Promise<Review>

  updateReview: (id: string, data: Partial<Review>) => Promise<void>

  deleteReview: (id: string) => Promise<void>

  resetToDefaults: () => Promise<void>

  updateSiteSettings: (data: SiteSettings) => Promise<void>

  resetSiteSettings: () => Promise<SiteSettings>

  isAdmin: boolean

  login: (password: string) => Promise<void>

  logout: () => Promise<void>

}



const DataContext = createContext<DataContextValue | null>(null)



const fallbackStore: StoreData = {

  version: 2,

  products: defaultProducts,

  categories: defaultCategories,

  reviews: [],

}



function withStore(

  prev: StoreData | null,

  updater: (base: StoreData) => StoreData,

): StoreData {

  return updater(prev ?? fallbackStore)

}



export function DataProvider({ children }: { children: ReactNode }) {

  const [store, setStore] = useState<StoreData | null>(null)

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    return readCachedSiteSettings() ?? defaultSiteSettings
  })

  const [settingsHydrated, setSettingsHydrated] = useState(
    () => !!readCachedSiteSettings(),
  )

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return !!sessionStorage.getItem(AUTH_KEY)
    } catch {
      return false
    }
  })



  const resolvedStore = store ?? fallbackStore



  const refreshSettings = useCallback(async () => {
    try {
      const settings = await api.getSettings()
      const merged = mergeSiteSettings(settings)
      setSiteSettings(merged)
      writeCachedSiteSettings(merged)
      setSettingsHydrated(true)
      return true
    } catch {
      setSettingsHydrated(true)
      return false
    }
  }, [])

  const refresh = useCallback(async () => {

    const maxAttempts = 4

    let lastError: Error | null = null

    const settingsTask = refreshSettings()



    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {

      try {

        const data = await api.getStore()

        setStore({ ...data, reviews: data.reviews ?? [] })

        await settingsTask

        setError(null)

        return

      } catch (err) {

        lastError = err instanceof Error ? err : new Error('Не удалось загрузить данные')

        if (attempt < maxAttempts - 1) {

          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))

        }

      }

    }



    await settingsTask

    setError(lastError?.message ?? 'Не удалось загрузить данные')

    setStore((prev) => prev ?? fallbackStore)

  }, [refreshSettings])



  useEffect(() => {

    let token: string | null = null
    try {
      token = sessionStorage.getItem(AUTH_KEY)
    } catch {
      token = null
    }



    async function init() {

      if (token) {

        setAuthToken(token)

        try {

          await api.verifyAuth()

          setIsAdmin(true)

        } catch {

          try {
            sessionStorage.removeItem(AUTH_KEY)
          } catch {
            /* private mode */
          }

          setAuthToken(null)

          setIsAdmin(false)

        }

      }

      await refresh()

      setLoading(false)

    }



    init()

  }, [refresh])



  useEffect(() => {

    const onFocus = () => {

      void refreshSettings()

      if (error) void refresh()

    }

    window.addEventListener('focus', onFocus)

    return () => window.removeEventListener('focus', onFocus)

  }, [error, refresh, refreshSettings])



  const getProductBySlug = useCallback(

    (slug: string) => resolvedStore.products.find((p) => p.slug === slug),

    [resolvedStore.products],

  )



  const getCategoryBySlug = useCallback(

    (slug: string) => resolvedStore.categories.find((c) => c.slug === slug),

    [resolvedStore.categories],

  )



  const getProductsByCategory = useCallback(

    (slug: string) => resolvedStore.products.filter((p) => p.category === slug),

    [resolvedStore.products],

  )



  const getPopularProducts = useCallback(

    (limit = 6) =>

      [...resolvedStore.products]

        .sort((a, b) => b.reviewsCount - a.reviewsCount)

        .slice(0, limit),

    [resolvedStore.products],

  )



  const getReviewsByProductId = useCallback(

    (productId: string) =>

      resolvedStore.reviews.filter((r) => r.productId === productId),

    [resolvedStore.reviews],

  )



  const addProduct = useCallback(async (data: Omit<Product, 'id'>) => {

    const product = await api.createProduct(data)

    setStore((prev) =>

      withStore(prev, (base) => ({

        ...base,

        products: [...base.products, product],

      })),

    )

    return product

  }, [])



  const updateProduct = useCallback(async (id: string, data: Partial<Product>) => {

    const product = await api.updateProduct(id, data)

    setStore((prev) =>

      withStore(prev, (base) => ({

        ...base,

        products: base.products.map((p) => (p.id === id ? product : p)),

      })),

    )

  }, [])



  const deleteProduct = useCallback(async (id: string) => {

    await api.deleteProduct(id)

    setStore((prev) =>

      withStore(prev, (base) => ({

        ...base,

        products: base.products.filter((p) => p.id !== id),

        reviews: base.reviews.filter((r) => r.productId !== id),

      })),

    )

  }, [])



  const addCategory = useCallback(async (data: Omit<Category, 'id'>) => {

    const category = await api.createCategory(data)

    setStore((prev) =>

      withStore(prev, (base) => ({

        ...base,

        categories: [...base.categories, category],

      })),

    )

    return category

  }, [])



  const updateCategory = useCallback(async (id: string, data: Partial<Category>) => {

    const category = await api.updateCategory(id, data)

    setStore((prev) =>

      withStore(prev, (base) => {

        const old = base.categories.find((c) => c.id === id)

        let products = base.products

        if (old && data.slug && data.slug !== old.slug) {

          products = products.map((p) =>

            p.category === old.slug ? { ...p, category: data.slug! } : p,

          )

        }

        return {

          ...base,

          products,

          categories: base.categories.map((c) => (c.id === id ? category : c)),

        }

      }),

    )

  }, [])



  const addReview = useCallback(async (data: Omit<Review, 'id'>) => {

    const review = await api.createReview(data)

    setStore((prev) =>

      withStore(prev, (base) => {

        const reviews = [...base.reviews, review]

        const products = base.products.map((p) => {

          if (p.id !== review.productId) return p

          const productReviews = reviews.filter((r) => r.productId === p.id)

          const avg =

            productReviews.reduce((sum, r) => sum + r.rating, 0) /

            productReviews.length

          return {

            ...p,

            reviewsCount: productReviews.length,

            rating: Math.round(avg * 10) / 10,

          }

        })

        return { ...base, products, reviews }

      }),

    )

    return review

  }, [])



  const updateReview = useCallback(async (id: string, data: Partial<Review>) => {

    const review = await api.updateReview(id, data)

    setStore((prev) =>

      withStore(prev, (base) => {

        const reviews = base.reviews.map((r) => (r.id === id ? review : r))

        const affectedIds = new Set(

          [review.productId, base.reviews.find((r) => r.id === id)?.productId].filter(

            Boolean,

          ) as string[],

        )

        const products = base.products.map((p) => {

          if (!affectedIds.has(p.id)) return p

          const productReviews = reviews.filter((r) => r.productId === p.id)

          if (!productReviews.length) return { ...p, reviewsCount: 0 }

          const avg =

            productReviews.reduce((sum, r) => sum + r.rating, 0) /

            productReviews.length

          return {

            ...p,

            reviewsCount: productReviews.length,

            rating: Math.round(avg * 10) / 10,

          }

        })

        return { ...base, products, reviews }

      }),

    )

  }, [])



  const deleteReview = useCallback(async (id: string) => {

    let targetProductId: string | undefined

    setStore((prev) => {

      const base = prev ?? fallbackStore

      targetProductId = base.reviews.find((r) => r.id === id)?.productId

      return base

    })

    await api.deleteReview(id)

    setStore((prev) =>

      withStore(prev, (base) => {

        const reviews = base.reviews.filter((r) => r.id !== id)

        const products = base.products.map((p) => {

          if (p.id !== targetProductId) return p

          const productReviews = reviews.filter((r) => r.productId === p.id)

          if (!productReviews.length) return { ...p, reviewsCount: 0 }

          const avg =

            productReviews.reduce((sum, r) => sum + r.rating, 0) /

            productReviews.length

          return {

            ...p,

            reviewsCount: productReviews.length,

            rating: Math.round(avg * 10) / 10,

          }

        })

        return { ...base, products, reviews }

      }),

    )

  }, [])



  const deleteCategory = useCallback(async (id: string) => {

    let categorySlug: string | undefined

    setStore((prev) => {

      const base = prev ?? fallbackStore

      categorySlug = base.categories.find((c) => c.id === id)?.slug

      return base

    })

    await api.deleteCategory(id)

    setStore((prev) =>

      withStore(prev, (base) => ({

        ...base,

        categories: base.categories.filter((c) => c.id !== id),

        products: categorySlug

          ? base.products.filter((p) => p.category !== categorySlug)

          : base.products,

      })),

    )

  }, [])



  const resetToDefaults = useCallback(async () => {

    const data = await api.resetStore()

    setStore({ ...data, reviews: data.reviews ?? [] })

  }, [])



  const updateSiteSettings = useCallback(async (data: SiteSettings) => {

    const updated = await api.updateSettings(data)

    const merged = mergeSiteSettings(updated)

    setSiteSettings(merged)

    writeCachedSiteSettings(merged)

    setSettingsHydrated(true)

  }, [])



  const resetSiteSettings = useCallback(async () => {

    const updated = await api.resetSettings()

    const merged = mergeSiteSettings(updated)

    setSiteSettings(merged)

    writeCachedSiteSettings(merged)

    setSettingsHydrated(true)

    return merged

  }, [])



  const login = useCallback(async (password: string) => {

    const { token } = await api.login(password)

    try {
      sessionStorage.setItem(AUTH_KEY, token)
    } catch {
      /* private mode */
    }

    setAuthToken(token)

    setIsAdmin(true)

  }, [])



  const logout = useCallback(async () => {

    try {

      await api.logout()

    } catch {

      /* token may already be invalid */

    }

    try {
      sessionStorage.removeItem(AUTH_KEY)
    } catch {
      /* private mode */
    }

    setAuthToken(null)

    setIsAdmin(false)

  }, [])



  const value = useMemo<DataContextValue>(

    () => ({

      products: resolvedStore.products,

      categories: resolvedStore.categories,

      reviews: resolvedStore.reviews,

      siteSettings,

      settingsHydrated,

      loading,

      error,

      refresh,

      getProductBySlug,

      getCategoryBySlug,

      getProductsByCategory,

      getPopularProducts,

      getReviewsByProductId,

      addProduct,

      updateProduct,

      deleteProduct,

      addCategory,

      updateCategory,

      deleteCategory,

      addReview,

      updateReview,

      deleteReview,

      resetToDefaults,

      updateSiteSettings,

      resetSiteSettings,

      isAdmin,

      login,

      logout,

    }),

    [

      resolvedStore,

      siteSettings,

      settingsHydrated,

      loading,

      error,

      refresh,

      getProductBySlug,

      getCategoryBySlug,

      getProductsByCategory,

      getPopularProducts,

      getReviewsByProductId,

      addProduct,

      updateProduct,

      deleteProduct,

      addCategory,

      updateCategory,

      deleteCategory,

      addReview,

      updateReview,

      deleteReview,

      resetToDefaults,

      updateSiteSettings,

      resetSiteSettings,

      isAdmin,

      login,

      logout,

    ],

  )



  return <DataContext.Provider value={value}>{children}</DataContext.Provider>

}



export function useData() {

  const ctx = useContext(DataContext)

  if (!ctx) throw new Error('useData must be used within DataProvider')

  return ctx

}


