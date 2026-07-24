import { useEffect, useState } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import { api } from '../api/client'
import { SmartImage } from '../components/ui/SmartImage'
import type { GalleryPhoto } from '../types/galleryPhoto'

export function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  usePageMeta({
    title: 'Фотогалерея — SPORT KING',
    description:
      'Фото установок и отзывов клиентов SPORT KING — реальные домашние спортивные комплексы.',
  })

  useEffect(() => {
    let active = true
    api
      .getGallery()
      .then((data) => {
        if (!active) return
        setPhotos(data.photos)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Не удалось загрузить галерею')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="bg-background py-10 md:py-16">
      <div className="site-container">
        <h1 className="text-2xl font-extrabold uppercase text-dark sm:text-4xl">
          Фотогалерея
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
          Реальные фото от наших клиентов — установленные комплексы SPORT KING в
          домах и квартирах.
        </p>

        {loading && (
          <p className="mt-10 text-sm text-text-secondary">Загрузка фото…</p>
        )}

        {error && !loading && (
          <p className="mt-10 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && photos.length === 0 && (
          <p className="mt-10 rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-text-secondary">
            Скоро здесь появятся фото от клиентов.
          </p>
        )}

        {!loading && photos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="aspect-[4/5] bg-image-bg">
                  <SmartImage
                    src={photo.url}
                    alt={photo.alt || photo.caption || 'Фото клиента SPORT KING'}
                    className="h-full w-full object-cover"
                    aspect=""
                    loading="lazy"
                  />
                </div>
                {photo.caption && (
                  <figcaption className="px-3 py-2.5 text-xs leading-snug text-text-secondary sm:text-sm">
                    {photo.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
