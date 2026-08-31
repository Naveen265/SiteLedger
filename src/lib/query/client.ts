import { QueryClient } from '@tanstack/react-query';

/**
 * The shared query client.
 * Reference data such as worker lists and material masters changes rarely, so
 * a generous stale time keeps the site shell responsive on a bad connection.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Permission and not-found failures will not succeed on a retry.
        const message = error instanceof Error ? error.message : '';
        if (message.includes('permission') || message.includes('not found')) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: 0 },
  },
});
