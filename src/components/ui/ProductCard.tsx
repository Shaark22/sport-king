import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { Product } from '../../types/product'
import { formatPrice } from '../../utils/formatPrice'
import { openKaspi } from '../../hooks/usePageMeta'
import { trackProductClick } from '../../utils/analytics'
import { Badge } from './Badge'
import { Rating } from './Rating'
import { Button, ButtonLink } from './Button'
import { SmartImage } from './SmartImage'
import { isProductInStock } from '../../utils/productStock'

interface ProductCardProps {
  product: Product
}

function handleProductClick(product: Product) {
  trackProductClick({
    id: product.id,
    slug: product.slug,
    name: product.name,
  })
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group card-shell">
      <Link
        to={`/product/${product.slug}`}
        className="card-image-frame block"
        onClick={() => handleProductClick(product)}
      >
        <div className="flex h-[78%] w-[88%] items-center justify-center sm:h-[80%] sm:w-[90%]">
          <SmartImage
            src={product.image}
            alt={product.name}
            className="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            aspect=""
          />
        </div>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5">
            {product.badge && <Badge label={product.badge} />}
          </div>
        </div>

        {isProductInStock(product.inStock) && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-surface/95 px-2 py-1 text-[10px] font-semibold text-success shadow-sm backdrop-blur-sm sm:bottom-4 sm:right-4 sm:px-2.5 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            В наличии
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-linear-to-t from-dark/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="mb-4 rounded-full bg-surface/95 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-dark shadow-sm backdrop-blur-sm">
            Подробнее
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-5">
        <Link
          to={`/product/${product.slug}`}
          onClick={() => handleProductClick(product)}
          className="block"
        >
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-dark transition-colors group-hover:text-dark-secondary sm:min-h-[2.75rem] sm:text-base">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2">
          <Rating
            rating={product.rating}
            reviewsCount={product.reviewsCount}
            size="sm"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-end gap-x-2 gap-y-1 sm:mt-3">
          <span className="text-base font-extrabold tracking-tight text-dark sm:text-xl">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && (
            <span className="pb-0.5 text-xs text-text-secondary line-through sm:text-sm">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3 sm:pt-4">
          <Button
            className="w-full min-h-10 !px-2.5 gap-1 normal-case tracking-normal whitespace-nowrap text-[11px] sm:min-h-12 sm:!px-4 sm:gap-1.5 sm:text-sm"
            onClick={() =>
              openKaspi(product.kaspiUrl, {
                id: product.id,
                slug: product.slug,
                name: product.name,
              })
            }
            aria-label={`Купить ${product.name} на Kaspi`}
          >
            <span>Купить на Kaspi</span>
            <ExternalLink size={12} className="shrink-0 sm:hidden" aria-hidden />
            <ExternalLink size={14} className="hidden shrink-0 sm:block" aria-hidden />
          </Button>
          <ButtonLink
            to={`/product/${product.slug}/order`}
            variant="outline"
            className="w-full min-h-10 !px-2.5 normal-case tracking-normal whitespace-nowrap text-[11px] sm:min-h-12 sm:!px-4 sm:text-sm"
            onClick={() => handleProductClick(product)}
          >
            Купить на сайте
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
