import { useState, useEffect, useCallback } from 'react';

// ===================================
// Types
// ===================================

export interface NetworkState {
  isOnline: boolean;
  wasOffline: boolean; // To show "Back online" message
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
}

export interface UseNetworkOptions {
  onOnline?: () => void;
  onOffline?: () => void;
  onSlowConnection?: () => void;
}

// ===================================
// Network Information API Types
// ===================================

interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

// ===================================
// Get Connection Object
// ===================================

function getConnection(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

// ===================================
// useNetwork Hook
// ===================================

export function useNetwork(options: UseNetworkOptions = {}): NetworkState {
  const { onOnline, onOffline, onSlowConnection } = options;

  const [state, setState] = useState<NetworkState>(() => {
    if (typeof window === 'undefined') {
      return { isOnline: true, wasOffline: false };
    }

    const connection = getConnection();
    return {
      isOnline: navigator.onLine,
      wasOffline: false,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    };
  });

  // Handle online event
  const handleOnline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: true,
      wasOffline: true, // Mark that we were offline
    }));
    onOnline?.();

    // Clear "was offline" after showing "back online" message
    setTimeout(() => {
      setState((prev) => ({ ...prev, wasOffline: false }));
    }, 3000);
  }, [onOnline]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
    }));
    onOffline?.();
  }, [onOffline]);

  // Handle connection change
  const handleConnectionChange = useCallback(() => {
    const connection = getConnection();
    if (!connection) return;

    setState((prev) => ({
      ...prev,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    }));

    // Check for slow connection
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      onSlowConnection?.();
    }
  }, [onSlowConnection]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getConnection();
    connection?.addEventListener('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener('change', handleConnectionChange);
    };
  }, [handleOnline, handleOffline, handleConnectionChange]);

  return state;
}

// ===================================
// useSlowConnection Hook
// ===================================

export function useSlowConnection(threshold: 'slow-2g' | '2g' | '3g' = '2g'): boolean {
  const { effectiveType } = useNetwork();
  
  const slowTypes: Record<string, number> = {
    'slow-2g': 1,
    '2g': 2,
    '3g': 3,
    '4g': 4,
  };

  if (!effectiveType) return false;
  
  return slowTypes[effectiveType] <= slowTypes[threshold];
}

// ===================================
// Default Export
// ===================================

export default useNetwork;
