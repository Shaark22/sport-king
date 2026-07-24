import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const ADMIN_BASE = (process.env.VITE_ADMIN_BASE || '/sk-manage-kz8m2p').replace(/\/$/, '')

function adminDevRouting(): Plugin {
  return {
    name: 'admin-dev-routing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''

        if (url === '/admin' || url.startsWith('/admin/')) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }

        if (url === ADMIN_BASE || url.startsWith(`${ADMIN_BASE}/`)) {
          req.url = '/admin.html'
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), adminDevRouting()],
  server: {
    host: true,
    allowedHosts: [
      'trustee-overact-dimness.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
    ],
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
    watch: {
      ignored: ['**/server/data/**'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
      },
    },
  },
})
