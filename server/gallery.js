import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const MAX_PHOTOS = 100
const MAX_CAPTION = 200
const MAX_ALT = 120

function defaultData() {
  return { version: 1, photos: [] }
}

function sanitizeUrl(url) {
  const value = String(url || '').trim()
  if (!value) throw new Error('Укажите URL фото')
  if (value.startsWith('/uploads/')) return value
  if (/^https?:\/\//i.test(value)) return value
  throw new Error('Некорректный URL фото')
}

export function createGalleryStore(galleryPath) {
  function read() {
    if (!existsSync(galleryPath)) return defaultData()
    try {
      const data = JSON.parse(readFileSync(galleryPath, 'utf8'))
      if (!Array.isArray(data.photos)) return defaultData()
      return data
    } catch {
      return defaultData()
    }
  }

  function write(data) {
    writeFileSync(galleryPath, JSON.stringify(data, null, 2))
  }

  function sortPhotos(photos) {
    return [...photos].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  function list({ publishedOnly = false } = {}) {
    const data = read()
    let photos = sortPhotos(data.photos)
    if (publishedOnly) photos = photos.filter((p) => p.published)
    return photos
  }

  function create(payload) {
    const data = read()
    if (data.photos.length >= MAX_PHOTOS) {
      throw new Error(`Максимум ${MAX_PHOTOS} фото в галерее`)
    }

    const url = sanitizeUrl(payload.url)
    const caption = String(payload.caption || '').trim().slice(0, MAX_CAPTION)
    const alt = String(payload.alt || caption || 'Фото клиента SPORT KING')
      .trim()
      .slice(0, MAX_ALT)
    const sortOrder = Number.isFinite(Number(payload.sortOrder))
      ? Number(payload.sortOrder)
      : data.photos.length

    const photo = {
      id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      alt,
      caption,
      published: payload.published !== false,
      sortOrder,
      createdAt: new Date().toISOString(),
    }

    data.photos.unshift(photo)
    write(data)
    return photo
  }

  function update(id, patch) {
    const data = read()
    const index = data.photos.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Фото не найдено')

    const current = data.photos[index]
    const next = { ...current }

    if (patch.url !== undefined) next.url = sanitizeUrl(patch.url)
    if (patch.caption !== undefined) {
      next.caption = String(patch.caption || '').trim().slice(0, MAX_CAPTION)
    }
    if (patch.alt !== undefined) {
      next.alt = String(patch.alt || next.caption || 'Фото клиента SPORT KING')
        .trim()
        .slice(0, MAX_ALT)
    }
    if (patch.published !== undefined) next.published = patch.published === true
    if (patch.sortOrder !== undefined && Number.isFinite(Number(patch.sortOrder))) {
      next.sortOrder = Number(patch.sortOrder)
    }

    data.photos[index] = next
    write(data)
    return next
  }

  function remove(id) {
    const data = read()
    const before = data.photos.length
    data.photos = data.photos.filter((p) => p.id !== id)
    if (data.photos.length === before) throw new Error('Фото не найдено')
    write(data)
    return { ok: true }
  }

  return { list, create, update, remove, MAX_PHOTOS }
}
