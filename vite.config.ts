import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Define process.env globally so it works in the browser
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
          output: {
              manualChunks: {
                  vendor: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
              },
          },
      },
    },
  };
});