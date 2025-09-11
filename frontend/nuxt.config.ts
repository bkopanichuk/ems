// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'shadcn-nuxt',
  ],

  css: ['~/assets/css/main.css'],
  
  typescript: {
    strict: true
  },

  shadcn: {
    prefix: '',
    componentDir: './components/ui'
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
    }
  },

  ssr: false,
  
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3000/api',
        changeOrigin: true
      }
    }
  }
})
