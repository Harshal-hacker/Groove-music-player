import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Tell Rollup to treat these mobile/Node specific packages as external
      // so it doesn't look for them inside your web application node_modules
      external: [
        'react-native-fs',
        'fs'
      ]
    }
  }
});