import { QueryClient } from '@tanstack/react-query';

// ===================================
// React Query Configuration
// ===================================

/**
 * Creates a configured QueryClient with caching strategies
 * optimized for offline-first experience.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ===================================
        // Stale Time Configuration
        // ===================================
        
        // Data is considered fresh for 5 minutes
        // During this time, no refetch will happen
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Keep cached data for 30 minutes even after unmount
        // This allows instant display of cached data
        gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
        
        // ===================================
        // Retry Configuration
        // ===================================
        
        // Retry failed requests up to 3 times
        retry: 3,
        
        // Exponential backoff: 1s, 2s, 4s
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // ===================================
        // Refetch Behavior
        // ===================================
        
        // Don't refetch when window regains focus
        // (prevents unnecessary requests on mobile)
        refetchOnWindowFocus: false,
        
        // Refetch when reconnecting to internet
        refetchOnReconnect: true,
        
        // Don't refetch on component mount if data exists
        refetchOnMount: false,
        
        // ===================================
        // Network Mode
        // ===================================
        
        // 'offlineFirst' - Always try cache first
        // This is key for offline experience
        networkMode: 'offlineFirst',
      },
      mutations: {
        // ===================================
        // Mutation Settings
        // ===================================
        
        // Retry mutations on failure
        retry: 2,
        
        // Keep mutation data for debugging
        gcTime: 5 * 60 * 1000, // 5 minutes
        
        // Offline mutations are paused until online
        networkMode: 'offlineFirst',
      },
    },
  });
}

// ===================================
// Query Keys Factory
// ===================================

export const queryKeys = {
  // User related
  user: {
    all: ['user'] as const,
    profile: (telegramId: string) => ['user', 'profile', telegramId] as const,
    stats: (telegramId: string) => ['user', 'stats', telegramId] as const,
    branding: (telegramId: string) => ['user', 'branding', telegramId] as const,
  },
  
  // History related
  history: {
    all: ['history'] as const,
    list: (telegramId: string) => ['history', 'list', telegramId] as const,
    item: (id: string) => ['history', 'item', id] as const,
    images: (telegramId: string) => ['history', 'images', telegramId] as const,
    texts: (telegramId: string) => ['history', 'texts', telegramId] as const,
    videos: (telegramId: string) => ['history', 'videos', telegramId] as const,
  },
  
  // Share analytics
  analytics: {
    all: ['analytics'] as const,
    shares: (telegramId: string) => ['analytics', 'shares', telegramId] as const,
  },
  
  // Video jobs
  videoJobs: {
    all: ['videoJobs'] as const,
    status: (jobId: string) => ['videoJobs', 'status', jobId] as const,
    list: (telegramId: string) => ['videoJobs', 'list', telegramId] as const,
  },
};

// ===================================
// Prefetch Helpers
// ===================================

/**
 * Prefetch user history on app load for instant display
 */
export async function prefetchUserData(
  queryClient: QueryClient,
  telegramId: string
) {
  // Prefetch profile
  await queryClient.prefetchQuery({
    queryKey: queryKeys.user.profile(telegramId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Prefetch history
  await queryClient.prefetchQuery({
    queryKey: queryKeys.history.list(telegramId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ===================================
// Offline Persistence (Optional)
// ===================================

/**
 * Configuration for persisting query cache to IndexedDB/localStorage
 * This enables true offline-first experience
 * 
 * To use, install: @tanstack/query-persist-client-core
 * and import createSyncStoragePersister from @tanstack/query-sync-storage-persister
 * 
 * Example:
 * ```ts
 * import { persistQueryClient } from '@tanstack/react-query-persist-client';
 * import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
 * 
 * const persister = createSyncStoragePersister({
 *   storage: localStorage,
 *   key: 'maklerpro-cache',
 * });
 * 
 * persistQueryClient({
 *   queryClient,
 *   persister,
 *   maxAge: 24 * 60 * 60 * 1000, // 24 hours
 * });
 * ```
 */
export const PERSISTENCE_KEY = 'maklerpro-cache';
export const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

// ===================================
// Default Export
// ===================================

export default createQueryClient;
