import { type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Home } from './pages/Home'
import { Catalog } from './pages/Catalog'
import { ProductPage } from './pages/ProductPage'
import { CategoryPage } from './pages/CategoryPage'
import { About } from './pages/About'
import { Delivery } from './pages/Delivery'
import { Contacts } from './pages/Contacts'
import { GalleryPage } from './pages/GalleryPage'
import { OrderPage } from './pages/OrderPage'
import { AnalyticsTracker } from './components/AnalyticsTracker'
import { ScrollToTop } from './components/ScrollToTop'

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden">
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <>
      <AnalyticsTracker />
      <ScrollToTop />
      <PublicLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/product/:slug/order" element={<OrderPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Routes>
      </PublicLayout>
    </>
  )
}
