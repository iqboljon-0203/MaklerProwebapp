import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  ImageFile, 
  ProcessedImage, 
  WatermarkConfig, 
  CompressionConfig, 
  EnhancementConfig,
  AppView,
  ProcessingProgress,
  Toast 
} from '@/types';

// ===================================
// App Store - Global App State
// ===================================

interface AppState {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  
  // Telegram WebApp
  isInitialized: boolean;
  setInitialized: (value: boolean) => void;
  
  // Processing
  isProcessing: boolean;
  progress: ProcessingProgress;
  setProcessing: (value: boolean) => void;
  setProgress: (progress: ProcessingProgress) => void;
  
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Navigation
      currentView: 'home',
      setCurrentView: (view) => set({ currentView: view }),
      
      // Theme
      isDarkMode: true,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      // Telegram WebApp
      isInitialized: false,
      setInitialized: (value) => set({ isInitialized: value }),
      
      // Processing
      isProcessing: false,
      progress: { current: 0, total: 0, status: 'idle' },
      setProcessing: (value) => set({ isProcessing: value }),
      setProgress: (progress) => set({ progress }),
      
      // Toasts
      toasts: [],
      addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }]
      })),
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),
    }),
    { name: 'app-store' }
  )
);

// ===================================
// Image Store - Image Processing State
// ===================================

interface ImageState {
  // Original images
  images: ImageFile[];
  addImages: (images: ImageFile[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  
  // Processed images
  processedImages: ProcessedImage[];
  addProcessedImage: (image: ProcessedImage) => void;
  clearProcessedImages: () => void;
  
  // Selected images for batch processing
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export const useImageStore = create<ImageState>()(
  devtools(
    (set) => ({
      // Original images
      images: [],
      addImages: (newImages) => set((state) => ({ 
        images: [...state.images, ...newImages] 
      })),
      removeImage: (id) => set((state) => ({ 
        images: state.images.filter((img) => img.id !== id) 
      })),
      clearImages: () => set({ images: [], processedImages: [], selectedIds: [] }),
      
      // Processed images
      processedImages: [],
      addProcessedImage: (image) => set((state) => ({ 
        processedImages: [...state.processedImages, image] 
      })),
      clearProcessedImages: () => set({ processedImages: [] }),
      
      // Selection
      selectedIds: [],
      toggleSelection: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id]
      })),
      selectAll: () => set((state) => ({ 
        selectedIds: state.images.map((img) => img.id) 
      })),
      deselectAll: () => set({ selectedIds: [] }),
    }),
    { name: 'image-store' }
  )
);

// ===================================
// Settings Store - Persisted Settings
// ===================================

interface SettingsState {
  // Watermark settings
  watermarkConfig: WatermarkConfig;
  setWatermarkConfig: (config: Partial<WatermarkConfig>) => void;
  
  // Compression settings
  compressionConfig: CompressionConfig;
  setCompressionConfig: (config: Partial<CompressionConfig>) => void;
  
  // Enhancement settings
  enhancementConfig: EnhancementConfig;
  setEnhancementConfig: (config: Partial<EnhancementConfig>) => void;
  
  // User preferences
  autoSaveToGallery: boolean;
  setAutoSaveToGallery: (value: boolean) => void;
  
  hapticFeedback: boolean;
  setHapticFeedback: (value: boolean) => void;
}

const defaultWatermarkConfig: WatermarkConfig = {
  text: 'MaklerPro',
  position: 'bottom-right',
  fontSize: 24,
  opacity: 0.7,
  color: '#FFFFFF',
  fontFamily: 'Arial',
  rotation: 0,
};

const defaultCompressionConfig: CompressionConfig = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'webp',
};

const defaultEnhancementConfig: EnhancementConfig = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        // Watermark
        watermarkConfig: defaultWatermarkConfig,
        setWatermarkConfig: (config) => set((state) => ({
          watermarkConfig: { ...state.watermarkConfig, ...config }
        })),
        
        // Compression
        compressionConfig: defaultCompressionConfig,
        setCompressionConfig: (config) => set((state) => ({
          compressionConfig: { ...state.compressionConfig, ...config }
        })),
        
        // Enhancement
        enhancementConfig: defaultEnhancementConfig,
        setEnhancementConfig: (config) => set((state) => ({
          enhancementConfig: { ...state.enhancementConfig, ...config }
        })),
        
        // User preferences
        autoSaveToGallery: true,
        setAutoSaveToGallery: (value) => set({ autoSaveToGallery: value }),
        
        hapticFeedback: true,
        setHapticFeedback: (value) => set({ hapticFeedback: value }),
      }),
      {
        name: 'maklerpro-settings',
        partialize: (state) => ({
          watermarkConfig: state.watermarkConfig,
          compressionConfig: state.compressionConfig,
          enhancementConfig: state.enhancementConfig,
          autoSaveToGallery: state.autoSaveToGallery,
          hapticFeedback: state.hapticFeedback,
        }),
      }
    ),
    { name: 'settings-store' }
  )
);

export * from './userStore';
