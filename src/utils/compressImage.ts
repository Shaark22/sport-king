const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const GALLERY_MAX = 960
const JPEG_QUALITY = 0.82
const GALLERY_JPEG_QUALITY = 0.78

async function compressWithLimits(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  maxDataUrlLength: number,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл изображения (JPG, PNG, WebP).')
  }

  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height)
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать изображение.')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  if (dataUrl.length > maxDataUrlLength) {
    throw new Error(
      'Фото слишком большое. Попробуйте другое изображение или уменьшите его размер.',
    )
  }

  return dataUrl
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  return compressWithLimits(file, MAX_WIDTH, MAX_HEIGHT, JPEG_QUALITY, 900_000)
}

/** Smaller preset for customer photo gallery uploads. */
export async function compressGalleryImageToDataUrl(file: File): Promise<string> {
  return compressWithLimits(file, GALLERY_MAX, GALLERY_MAX, GALLERY_JPEG_QUALITY, 550_000)
}
