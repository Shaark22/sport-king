export interface HeroSettings {
  eyebrow: string
  title: string
  subtitle: string
  description: string
  ctaLabel: string
  ctaLink: string
  image: string
  imageAlt: string
}

export interface ContactSettings {
  phone: string
  whatsapp: string
  instagram: string
  youtube: string
  instagramLabel: string
  youtubeLabel: string
  address: string
  cities: string
  intro: string
}

export interface AboutValue {
  title: string
  text: string
}

export interface AboutSettings {
  pageTitle: string
  paragraphs: string[]
  values: AboutValue[]
}

export interface DeliverySettings {
  pageTitle: string
  stepsTitle: string
  steps: string[]
  paragraphs: string[]
}

export interface SiteSettings {
  version: number
  hero: HeroSettings
  tagline: string
  description: string
  contacts: ContactSettings
  about: AboutSettings
  delivery: DeliverySettings
}

export const defaultSiteSettings: SiteSettings = {
  version: 2,
  hero: {
    eyebrow: 'SPORT KING',
    title: 'Тренируйся дома — Когда удобно',
    subtitle: 'Создай свой зал дома',
    description:
      'Шведские стенки, турники, брусья и спортивные комплексы для дома от SPORT KING.',
    ctaLabel: 'Смотреть каталог',
    ctaLink: '/catalog',
    image: '/images/hero-main.png',
    imageAlt: 'Домашнее спортивное оборудование SPORT KING в современном интерьере',
  },
  tagline: 'Тренируйся дома. Создай свой зал.',
  description:
    'Современное спортивное оборудование для домашних тренировок. Шведские стенки, турники, брусья и комплексы 3-в-1.',
  contacts: {
    phone: '+7 778 576 6700',
    whatsapp: 'https://wa.me/77785766700',
    instagram: 'https://www.instagram.com/turnik_kzz/',
    youtube: 'https://www.youtube.com/@SPORTKING-KZ',
    instagramLabel: '@turnik_kzz',
    youtubeLabel: '@SPORTKING-KZ',
    address: 'Усть-Каменогорск, проспект Сатпаева',
    cities: 'Усть-Каменогорск',
    intro: 'Свяжитесь с нами для консультации по выбору оборудования.',
  },
  about: {
    pageTitle: 'О SPORT KING',
    paragraphs: [
      'SPORT KING — бренд спортивного оборудования для домашних тренировок. Мы создаём решения, которые помогают тренироваться дома — без походов в зал и без лишней сложности.',
      'В ассортименте — шведские стенки, турники, брусья, перекладины и комплексы 3-в-1. Каждая модель рассчитана на регулярные нагрузки и удобную установку в квартире или частном доме.',
      'Наш подход простой: надёжное оборудование, понятные характеристики и покупка через Kaspi — быстро и удобно.',
    ],
    values: [
      {
        title: 'Качество',
        text: 'Прочные металлические конструкции для ежедневных тренировок.',
      },
      {
        title: 'Функциональность',
        text: 'Оборудование для силы, выносливости и детского спорта.',
      },
      {
        title: 'Доступность',
        text: 'Покупка напрямую на Kaspi с доставкой по Казахстану.',
      },
    ],
  },
  delivery: {
    pageTitle: 'Доставка и оплата',
    stepsTitle: 'Как купить',
    steps: [
      'Выберите товар на сайте SPORT KING.',
      'Нажмите кнопку «Купить на Kaspi» или оформите заявку на сайте.',
      'Оформите заказ на Kaspi или дождитесь звонка менеджера.',
      'Оплата производится через Kaspi или при получении — по договорённости.',
    ],
    paragraphs: [
      'Покупки на Kaspi оформляются на платформе Kaspi. Заявки с сайта обрабатывает менеджер SPORT KING — доставка по Астане возможна в день заказа.',
      'SPORT KING — сайт-витрина, который помогает выбрать подходящее оборудование. Условия доставки и оплаты на Kaspi определяются при оформлении заказа.',
    ],
  },
}

export function cloneSiteSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    hero: { ...settings.hero },
    contacts: { ...settings.contacts },
    about: {
      ...settings.about,
      paragraphs: [...settings.about.paragraphs],
      values: settings.about.values.map((v) => ({ ...v })),
    },
    delivery: {
      ...settings.delivery,
      steps: [...settings.delivery.steps],
      paragraphs: [...settings.delivery.paragraphs],
    },
  }
}

const SETTINGS_CACHE_KEY = 'sportking-site-settings-v2'

export function readCachedSiteSettings(): SiteSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (!raw) return null
    return mergeSiteSettings(JSON.parse(raw) as Partial<SiteSettings>)
  } catch {
    return null
  }
}

export function writeCachedSiteSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
  } catch {
    /* quota / private mode */
  }
}

/** Совместимость со старым settings.json (v1 без contacts/about/delivery). */
export function mergeSiteSettings(
  partial: Partial<SiteSettings> | SiteSettings | null | undefined,
): SiteSettings {
  const base = defaultSiteSettings
  if (!partial) return cloneSiteSettings(base)

  return {
    version: 2,
    hero: { ...base.hero, ...(partial.hero ?? {}) },
    tagline: partial.tagline?.trim() || base.tagline,
    description: partial.description?.trim() || base.description,
    contacts: { ...base.contacts, ...(partial.contacts ?? {}) },
    about: {
      pageTitle: partial.about?.pageTitle?.trim() || base.about.pageTitle,
      paragraphs:
        partial.about?.paragraphs?.filter(Boolean).length
          ? [...partial.about.paragraphs]
          : [...base.about.paragraphs],
      values:
        partial.about?.values?.length === 3
          ? partial.about.values.map((v, i) => ({
              title: v.title?.trim() || base.about.values[i]?.title || '',
              text: v.text?.trim() || base.about.values[i]?.text || '',
            }))
          : base.about.values.map((v) => ({ ...v })),
    },
    delivery: {
      pageTitle: partial.delivery?.pageTitle?.trim() || base.delivery.pageTitle,
      stepsTitle: partial.delivery?.stepsTitle?.trim() || base.delivery.stepsTitle,
      steps:
        partial.delivery?.steps?.filter(Boolean).length
          ? [...partial.delivery.steps]
          : [...base.delivery.steps],
      paragraphs:
        partial.delivery?.paragraphs?.filter(Boolean).length
          ? [...partial.delivery.paragraphs]
          : [...base.delivery.paragraphs],
    },
  }
}
