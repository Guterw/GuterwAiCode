import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Nome do repositório no GitHub (usado para o base path no GitHub Pages).
// Se você fizer fork ou renomear o repo, atualize aqui também.
const REPO_NAME = 'GuterwAiCode';

export default defineConfig({
  // Necessário para o projeto funcionar quando hospedado em
  // https://<usuario>.github.io/GuterwAiCode/
  base: `/${REPO_NAME}/`,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GuterwAiCode',
        short_name: 'GuterwAi',
        description: 'Assistente de IA focado em código, lógica e automação.',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        start_url: `/${REPO_NAME}/`,
        scope: `/${REPO_NAME}/`,
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Garante que rotas do HashRouter (ex: #/chat/3) sempre sirvam o index.html
        navigateFallback: `/${REPO_NAME}/index.html`,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
