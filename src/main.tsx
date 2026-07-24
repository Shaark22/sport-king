import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { readCachedSiteSettings } from './types/siteSettings'
import './index.css'
import App from './App.tsx'

try {
  const cachedHeroImage = readCachedSiteSettings()?.hero?.image
  if (cachedHeroImage && document.head) {
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'image'
    preload.href = cachedHeroImage
    document.head.appendChild(preload)
  }
} catch {
  /* ignore preload failures */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
