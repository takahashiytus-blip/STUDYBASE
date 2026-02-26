
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Property 'cwd' does not exist on type 'Process'. 
  // vite.config.ts runs in a Node.js environment where process.cwd() is available.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    define: {
      'process.env': env
    }
  };
});
