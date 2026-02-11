import { useEffect, useRef, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { useAppStore } from '@/store';

// ===================================
// Telegram WebApp Hook
// ===================================

export function useTelegram() {
  const { setInitialized, isDarkMode } = useAppStore();
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      // Initialize Telegram WebApp
      WebApp.ready();
      WebApp.expand();
      
      // Enable closing confirmation (v6.2+)
      if (WebApp.isVersionAtLeast('6.2')) {
        WebApp.enableClosingConfirmation();
      }
      
      isInitializedRef.current = true;
      setInitialized(true);
      
      console.log('Telegram WebApp initialized:', {
        platform: WebApp.platform,
        version: WebApp.version,
        colorScheme: WebApp.colorScheme,
      });
    } catch (error) {
      console.error('Failed to initialize Telegram WebApp:', error);
      // App can still work outside Telegram
      setInitialized(true);
    }
  }, [setInitialized]);

  const hapticFeedback = useCallback((
    type: 'impact' | 'notification' | 'selection',
    style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'error' | 'success' | 'warning'
  ) => {
    try {
      // HapticFeedback requires v6.1+
      if (!WebApp.isVersionAtLeast('6.1')) return;

      if (type === 'impact') {
        WebApp.HapticFeedback.impactOccurred(style as 'light' | 'medium' | 'heavy' | 'rigid' | 'soft');
      } else if (type === 'notification') {
        WebApp.HapticFeedback.notificationOccurred(style as 'error' | 'success' | 'warning');
      } else {
        WebApp.HapticFeedback.selectionChanged();
      }
    } catch {
      // Haptic feedback not available or failed
    }
  }, []);

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    try {
      WebApp.MainButton.setText(text);
      WebApp.MainButton.onClick(onClick);
      WebApp.MainButton.show();
    } catch {
      console.warn('MainButton not available');
    }
  }, []);

  const hideMainButton = useCallback(() => {
    try {
      WebApp.MainButton.hide();
    } catch {
      console.warn('MainButton not available');
    }
  }, []);

  const showBackButton = useCallback((onClick: () => void) => {
    try {
      if (WebApp.isVersionAtLeast('6.1')) {
        WebApp.BackButton.onClick(onClick);
        WebApp.BackButton.show();
      }
    } catch {
      console.warn('BackButton not available');
    }
  }, []);

  const hideBackButton = useCallback(() => {
    try {
      if (WebApp.isVersionAtLeast('6.1')) {
        WebApp.BackButton.hide();
      }
    } catch {
      console.warn('BackButton not available');
    }
  }, []);

  const showAlert = useCallback((message: string) => {
    try {
      WebApp.showAlert(message);
    } catch {
      alert(message);
    }
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        WebApp.showConfirm(message, resolve);
      } catch {
        resolve(window.confirm(message));
      }
    });
  }, []);

  const closeApp = useCallback(() => {
    try {
      WebApp.close();
    } catch {
      window.close();
    }
  }, []);

  return {
    webApp: WebApp,
    user: WebApp.initDataUnsafe?.user,
    colorScheme: WebApp.colorScheme || (isDarkMode ? 'dark' : 'light'),
    platform: WebApp.platform,
    viewportHeight: WebApp.viewportStableHeight,
    hapticFeedback,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    closeApp,
  };
}

// ===================================
// Debounce Hook
// ===================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Need to import useState for useDebounce
import { useState } from 'react';

// ===================================
// Local Storage Hook
// ===================================

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ===================================
// Media Query Hook
// ===================================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ===================================
// File Picker Hook
// ===================================

export * from './useImageProcessor';

export function useFilePicker(options?: {
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const openPicker = useCallback(() => {
    if (!inputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options?.accept || 'image/*';
      input.multiple = options?.multiple ?? true;
      input.style.display = 'none';
      
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const selectedFiles = Array.from(target.files || []);
        const maxFiles = options?.maxFiles || 20;
        setFiles(selectedFiles.slice(0, maxFiles));
        input.value = '';
      });
      
      document.body.appendChild(input);
      inputRef.current = input;
    }
    
    inputRef.current.click();
  }, [options]);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  useEffect(() => {
    return () => {
      if (inputRef.current) {
        document.body.removeChild(inputRef.current);
      }
    };
  }, []);

  return { files, openPicker, clearFiles };
}

// ===================================
// Telegram Action Hook (UX Polish)
// ===================================

export function useTelegramAction() {
  const { webApp, hapticFeedback, showAlert } = useTelegram();

  /**
   * Wraps an async action with Telegram-native UX feedback.
   * 1. Triggers Haptic Feedback
   * 2. Shows MainButton Loading Progress
   * 3. Disables Interaction
   * 4. Shows Success/Error Alert
   */
  const executeWithFeedback = useCallback(async (
    actionFn: () => Promise<void>,
    options: {
      successMessage?: string;
      confirmMessage?: string;
      hapticStyle?: 'light' | 'medium' | 'heavy';
      useMainButton?: boolean;
    } = {}
  ) => {
    const { 
      successMessage, 
      confirmMessage, 
      hapticStyle = 'medium',
      useMainButton = true 
    } = options;

    if (confirmMessage) {
       const confirmed = await new Promise<boolean>((resolve) => 
           webApp.showConfirm(confirmMessage, resolve)
       );
       if (!confirmed) return;
    }

    // 1. Initial Impact
    hapticFeedback('impact', hapticStyle);

    // 2. UI Feedback State
    if (useMainButton && webApp.MainButton.isVisible) {
       webApp.MainButton.showProgress(false); // keep active
       webApp.MainButton.disable();
    }

    try {
      await actionFn();
      
      // 3. Success Feedback
      hapticFeedback('notification', 'success');
      if (successMessage) {
        // webApp.showAlert is blocking, maybe better to use Toast?
        // User requested webApp.showAlert specifically.
        showAlert(successMessage);
      }
    } catch (error: any) {
      // 4. Error Feedback
      hapticFeedback('notification', 'error');
      showAlert(error.message || 'Произошла ошибка');
      throw error;
    } finally {
      // 5. Cleanup
      if (useMainButton) {
        webApp.MainButton.hideProgress();
        webApp.MainButton.enable();
      }
    }
  }, [webApp, hapticFeedback, showAlert]);

  return { executeWithFeedback };
}

// ===================================
// Network Status Hook
// ===================================

export { useNetwork, useSlowConnection } from './useNetwork';
