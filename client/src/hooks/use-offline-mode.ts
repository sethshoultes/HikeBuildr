import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Trail } from '@shared/schema';

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineTrails, setOfflineTrails] = useState<Trail[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger background sync when coming back online
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            registration.sync.register('sync-trails').catch(console.error);
          }
        });
      }
      // Invalidate and refetch trails data
      queryClient.invalidateQueries({ queryKey: ['/api/trails'] });
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Load cached trails from IndexedDB when going offline
      loadCachedTrails();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load of cached trails
    loadCachedTrails();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  const loadCachedTrails = async () => {
    try {
      const cache = await caches.open('runtime-cache');
      const response = await cache.match('/api/trails');
      if (response) {
        const data = await response.json();
        setOfflineTrails(data);
      }
    } catch (error) {
      console.error('Failed to load cached trails:', error);
    }
  };

  const cacheTrail = async (trail: Trail) => {
    if ('caches' in window) {
      try {
        const cache = await caches.open('runtime-cache');
        const response = new Response(JSON.stringify(trail));
        await cache.put(`/api/trails/${trail.id}`, response);
      } catch (error) {
        console.error('Failed to cache trail:', error);
      }
    }
  };

  return {
    isOnline,
    offlineTrails,
    cacheTrail
  };
}