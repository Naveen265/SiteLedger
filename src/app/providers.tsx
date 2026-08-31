import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/lib/query/client';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastViewport } from '@/components/patterns/ToastViewport';

/**
 * The provider stack, in dependency order.
 * Language and messages first, then transient messages, then the query client,
 * then identity, then the tenant, then the selected project. Each layer may
 * read everything above it and nothing below.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <CompanyProvider>
                <ProjectProvider>
                  {children}
                  <ToastViewport />
                </ProjectProvider>
              </CompanyProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
