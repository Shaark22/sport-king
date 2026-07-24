import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Eye, EyeOff, ImagePlus, Trash2 } from 'lucide-react'
import { api, uploadGalleryImageFile } from '../api/client'
import { Button } from '../components/ui/Button'
import { SmartImage } from '../components/ui/SmartImage'
import type { GalleryPhoto } from '../types/galleryPhoto'

export function AdminGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [caption, setCaption] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getGalleryAll()
      setPhotos(data.photos)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить галерею')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    setUploading(true)
    setError('')
    try {
      for (const file of files) {
        const url = await uploadGalleryImageFile(file)
        const photo = await api.createGalleryPhoto({
          url,
          caption: caption.trim(),
        })
        setPhotos((prev) => [photo, ...prev])
      }
      setCaption('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
    }
  }

  const togglePublished = async (photo: GalleryPhoto) => {
    try {
      const updated = await api.updateGalleryPhoto(photo.id, {
        published: !photo.published,
      })
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить фото')
    }
  }

  const updateCaption = async (photo: GalleryPhoto, nextCaption: string) => {
    try {
      const updated = await api.updateGalleryPhoto(photo.id, {
        caption: nextCaption,
        alt: nextCaption || photo.alt,
      })
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить подпись')
    }
  }

  const removePhoto = async (id: string) => {
    if (!window.confirm('Удалить фото из галереи?')) return
    try {
      await api.deleteGalleryPhoto(id)
      setPhotos((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить фото')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold uppercase text-dark sm:text-4xl">
        Фотогалерея
      </h1>
      <p className="mt-2 text-sm text-text-secondary sm:text-base">
        Загружайте фото от клиентов. На сайте показываются только опубликованные
        снимки. Фото автоматически сжимаются перед загрузкой.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <label className="block text-xs font-bold uppercase tracking-wide text-dark">
          Подпись к новым фото (необязательно)
        </label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
          placeholder="Например: Установка в Астане"
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base sm:text-sm"
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        <Button
          type="button"
          className="mt-4"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={18} />
          {uploading ? 'Загрузка…' : 'Загрузить фото'}
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-text-secondary">Загрузка…</p>
      ) : photos.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-text-secondary">
          Пока нет фото. Загрузите первое изображение от клиента.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="aspect-[4/3] bg-image-bg">
                <SmartImage
                  src={photo.url}
                  alt={photo.alt}
                  className="h-full w-full object-cover"
                  aspect=""
                />
              </div>
              <div className="space-y-3 p-4">
                <input
                  type="text"
                  defaultValue={photo.caption}
                  maxLength={200}
                  placeholder="Подпись"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base sm:text-sm"
                  onBlur={(e) => {
                    if (e.target.value.trim() !== photo.caption) {
                      void updateCaption(photo, e.target.value.trim())
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void togglePublished(photo)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold uppercase tracking-wide text-dark"
                  >
                    {photo.published ? <Eye size={16} /> : <EyeOff size={16} />}
                    {photo.published ? 'На сайте' : 'Скрыто'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removePhoto(photo.id)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold uppercase tracking-wide text-red-700"
                  >
                    <Trash2 size={16} />
                    Удалить
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
