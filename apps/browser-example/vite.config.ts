import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    // https://vite.dev/config/shared-options.html#css-preprocessoroptions
    preprocessorOptions: {
      scss: {
        // https://sass-lang.com/documentation/js-api/interfaces/options/#quietDeps
        quietDeps: true,
      },
    },
  },
})
