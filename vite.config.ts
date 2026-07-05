import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    base: "/kynren.assets",
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'formdata-polyfill/esm.min.js': path.resolve(__dirname, 'src/utils/empty.ts'),
        'formdata-polyfill/FormData.js': path.resolve(__dirname, 'src/utils/empty.ts'),
        'formdata-polyfill/formdata.min.js': path.resolve(__dirname, 'src/utils/empty.ts'),
        'formdata-polyfill/formdata-to-blob.js': path.resolve(__dirname, 'src/utils/empty.ts'),
        'formdata-polyfill': path.resolve(__dirname, 'src/utils/empty.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
