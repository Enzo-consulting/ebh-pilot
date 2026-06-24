import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './auth/AuthProvider';
import { LoadingScreen } from './components/LoadingScreen';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                {/* LoadingScreen is shown while lazy chunks are being fetched */}
                      <Suspense fallback={<LoadingScreen />}>
                                <AuthProvider>
                                            <BrowserRouter>
                                                          <App />
                                            </BrowserRouter>BrowserRouter>
                                </AuthProvider>AuthProvider>
                      </Suspense>Suspense>
              </ThemeProvider>ThemeProvider>
        </QueryClientProvider>QueryClientProvider>
    </React.StrictMode>React.StrictMode>,
  );
</React.StrictMode>
