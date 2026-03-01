import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import atlas from 'vite-plugin-atlas'

export default defineConfig({
  plugins: [
    react(),
    atlas({
      pattern: 'src/**/*.examples.{tsx,jsx}',
      title: 'Atlas Demo',
      importPackage: '@mrmartineau/react-components',
    }),
  ],
})
