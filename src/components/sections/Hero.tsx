import { ButtonLink } from '../ui/Button'
import { SmartImage } from '../ui/SmartImage'
import { useData } from '../../context/DataContext'

export function Hero() {
  const { siteSettings, settingsHydrated } = useData()
  const { hero } = siteSettings

  return (
    <section className="bg-background">
      <div className="site-container hero-grid py-10 sm:py-14 lg:py-16 xl:py-20">
        <div className="hero-copy animate-slide-up order-1">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-text-secondary sm:text-sm">
            {hero.eyebrow}
          </p>
          <h1 className="text-display font-extrabold uppercase tracking-tight text-dark">
            {hero.title}
          </h1>
          <p className="mt-3 text-sm font-bold uppercase tracking-wide text-dark sm:text-base lg:text-lg">
            {hero.subtitle}
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
            {hero.description}
          </p>
          <div className="mt-6 sm:mt-8">
            <ButtonLink to={hero.ctaLink || '/catalog'} className="w-full sm:w-auto">
              {hero.ctaLabel}
            </ButtonLink>
          </div>
        </div>

        <div className="hero-media animate-fade-in order-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:rounded-3xl">
            {settingsHydrated ? (
              <SmartImage
                src={hero.image}
                alt={hero.imageAlt}
                className="aspect-[5/4] w-full object-cover object-center sm:aspect-square"
                loading="eager"
              />
            ) : (
              <div
                className="aspect-[5/4] w-full shimmer bg-image-bg sm:aspect-square"
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
