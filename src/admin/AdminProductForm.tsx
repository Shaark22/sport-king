import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { formatNumber } from '../utils/formatPrice'
import { slugify } from '../utils/slugify'
import { MultiImageUpload } from '../components/admin/MultiImageUpload'
import { getCategoryImage, placeholderImages } from '../data/images'
import type { Product } from '../types/product'
import { Button } from '../components/ui/Button'

function getInitialImages(product?: Product): string[] {
  if (!product) return []
  if (product.images?.length) return [...product.images]
  if (product.image) return [product.image]
  return []
}

const emptyProduct = {
  name: '',
  slug: '',
  category: '',
  description: '',
  price: 0,
  oldPrice: undefined as number | undefined,
  image: placeholderImages.product,
  images: [] as string[],
  videoUrl: '',
  rating: 4.8,
  reviewsCount: 0,
  badge: undefined as Product['badge'],
  features: [''],
  kaspiUrl: '',
  inStock: true,
}

export function AdminProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, categories, addProduct, updateProduct } = useData()
  const existing = id ? products.find((p) => p.id === id) : undefined

  const [gallery, setGallery] = useState(() => getInitialImages(existing))
  const [ratingInput, setRatingInput] = useState(() =>
    existing ? String(existing.rating) : '4.8',
  )
  const [reviewsInput, setReviewsInput] = useState(() =>
    existing
      ? existing.reviewsCount === 0
        ? ''
        : String(existing.reviewsCount)
      : '',
  )

  const [form, setForm] = useState(() =>
    existing
      ? {
          ...existing,
          videoUrl: existing.videoUrl ?? '',
          features: existing.features.length ? existing.features : [''],
        }
      : { ...emptyProduct, category: categories[0]?.slug ?? '' },
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  if (id && !existing) {
    return <Navigate to="/products" replace />
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const slug = form.slug || slugify(form.name)
    const features = form.features.filter((f) => f.trim())
    const normalizedGallery =
      gallery.length > 0 ? gallery : [getCategoryImage(form.category)]
    const videoUrl = form.videoUrl.trim() || undefined

    const rating = ratingInput === '' ? 0 : Math.min(5, Math.max(0, Number(ratingInput)))
    const reviewsCount =
      reviewsInput === '' ? 0 : Math.max(0, Math.round(Number(reviewsInput)))

    const payload = {
      ...form,
      slug,
      rating,
      reviewsCount,
      inStock: form.inStock === true,
      features: features.length ? features : ['Для домашних тренировок'],
      image: normalizedGallery[0],
      images: normalizedGallery,
      videoUrl,
    }

    try {
      if (existing) {
        await updateProduct(existing.id, payload)
      } else {
        await addProduct(payload)
      }
      navigate('/products')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить товар')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-base'

  return (
    <div>
      <Link
        to="/products"
        className="text-sm font-semibold text-text-secondary hover:text-dark"
      >
        ← Назад к товарам
      </Link>
      <h1 className="mt-4 text-2xl font-extrabold uppercase text-dark sm:text-4xl">
        {existing ? 'Редактировать товар' : 'Новый товар'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold uppercase">Название</label>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase">Slug (URL)</label>
          <input
            value={form.slug}
            onChange={(e) => update('slug', e.target.value)}
            placeholder={slugify(form.name) || 'auto'}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase">Категория</label>
          <select
            required
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold uppercase">Цена, ₸</label>
            <input
              required
              type="number"
              min={0}
              value={form.price || ''}
              onChange={(e) => update('price', Number(e.target.value))}
              className={inputClass}
            />
            {form.price > 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                На сайте: {formatNumber(form.price)} ₸
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold uppercase">Старая цена</label>
            <input
              type="number"
              min={0}
              value={form.oldPrice ?? ''}
              onChange={(e) =>
                update('oldPrice', e.target.value ? Number(e.target.value) : undefined)
              }
              className={inputClass}
            />
            {form.oldPrice && form.oldPrice > 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                На сайте: {formatNumber(form.oldPrice)} ₸
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase">Описание</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase">Ссылка Kaspi</label>
          <input
            required
            type="url"
            value={form.kaspiUrl}
            onChange={(e) => update('kaspiUrl', e.target.value)}
            className={inputClass}
          />
        </div>

        <MultiImageUpload
          label="Фото товара"
          images={gallery}
          onChange={setGallery}
        />

        <div>
          <label className="mb-2 block text-sm font-bold uppercase">
            Видео (необязательно)
          </label>
          <input
            type="url"
            value={form.videoUrl}
            onChange={(e) => update('videoUrl', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... или Instagram Reels"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-text-secondary">
            YouTube или Instagram. Кнопка «Смотреть видео» появится на странице товара
            только если ссылка указана.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-bold uppercase">Рейтинг</label>
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={ratingInput}
              onChange={(e) => setRatingInput(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold uppercase">Отзывы</label>
            <input
              type="number"
              min={0}
              value={reviewsInput}
              onChange={(e) => setReviewsInput(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold uppercase">Бейдж</label>
            <select
              value={form.badge ?? ''}
              onChange={(e) =>
                update('badge', (e.target.value || undefined) as Product['badge'])
              }
              className={inputClass}
            >
              <option value="">Нет</option>
              <option value="ХИТ">ХИТ</option>
              <option value="НОВИНКА">НОВИНКА</option>
              <option value="АКЦИЯ">АКЦИЯ</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase">Характеристики</label>
          {form.features.map((feature, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input
                value={feature}
                onChange={(e) => {
                  const next = [...form.features]
                  next[i] = e.target.value
                  update('features', next)
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  update(
                    'features',
                    form.features.filter((_, idx) => idx !== i),
                  )
                }
                className="shrink-0 rounded-xl border border-border px-3 text-sm"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update('features', [...form.features, ''])}
            className="text-sm font-semibold text-dark underline decoration-primary underline-offset-4"
          >
            + Добавить характеристику
          </button>
        </div>

        <label className="flex items-center gap-3 font-semibold text-dark">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={(e) => update('inStock', e.target.checked)}
            className="h-4 w-4"
          />
          В наличии
        </label>

        <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
          {saving ? 'Сохранение...' : existing ? 'Сохранить' : 'Создать товар'}
        </Button>
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </form>
    </div>
  )
}
