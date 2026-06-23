import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Expose all VITE_* env vars to the app
                              const env = loadEnv(mode, process.cwd(), 'VITE_');

                              return {
                                    plugins: [react()],
                                    resolve: {
                                            alias: {
                                                      '@ebh/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
                                                      '@ebh/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
                                                      '@': path.resolve(__dirname, 'src'),
                                            },
                                    },
                                    // Inject env variables as constants (accessible via import.meta.env)
                                    define: {
                                            __APP_NAME__: JSON.stringify(env.VITE_APP_NAME ?? 'EBH Pilot'),
                                            __API_URL__: JSON.stringify(env.VITE_API_URL ?? 'http://localhost:4000'),
                                            __ENVIRONMENT__: JSON.stringify(env.VITE_ENVIRONMENT ?? mode),
                                    },
                                    server: {
                                            port: 5173,
                                            // Proxy API calls to the backend in development
                                            proxy: env.VITE_API_URL
                                              ? undefined
                                                      : {
                                                                    '/api': {
                                                                                    target: 'http://localhost:4000',
                                                                                    changeOrigin: true,
                                                                    },
                                                      },
                                    },
                                    build: {
                                            // Standard Vite output — Render serves from dist/
                                      outDir: 'dist',
                                            sourcemap: false,
                                            rollupOptions: {
                                                      output: {
                                                                  manualChunks: {
                                                                                vendor: ['react', 'react-dom'],
                                                                                router: ['react-router-dom'],
                                                                                query: ['@tanstack/react-query'],
                                                                  },
                                                      },
                                            },
                                    },
                              };
});
