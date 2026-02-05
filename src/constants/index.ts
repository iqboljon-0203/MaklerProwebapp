// ===================================
// MaklerPro Constants
// ===================================

// App Info
export const APP_NAME = 'MaklerPro';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Professional tools for real estate agents';

// ===================================
// Theme Colors (Premium Real Estate Palette)
// ===================================

export const COLORS = {
  // Royal Blue - Primary
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#2563eb',
    600: '#1d4ed8',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#1e3b8b',
  },
  // Gold - Accent
  gold: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
  // Cyan - Secondary
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
} as const;

// ===================================
// Image Processing Defaults
// ===================================

export const IMAGE_LIMITS = {
  maxFiles: 20,
  maxFileSizeMB: 50,
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;

export const COMPRESSION_PRESETS = {
  telegram: {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.85,
    format: 'jpeg' as const,
  },
  instagram: {
    maxWidth: 1080,
    maxHeight: 1350,
    quality: 0.9,
    format: 'jpeg' as const,
  },
  olx: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    format: 'jpeg' as const,
  },
  web: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'webp' as const,
  },
} as const;

export const WATERMARK_POSITIONS = [
  { value: 'top-left', label: 'Верх лево' },
  { value: 'top-center', label: 'Верх центр' },
  { value: 'top-right', label: 'Верх право' },
  { value: 'center-left', label: 'Центр лево' },
  { value: 'center', label: 'Центр' },
  { value: 'center-right', label: 'Центр право' },
  { value: 'bottom-left', label: 'Низ лево' },
  { value: 'bottom-center', label: 'Низ центр' },
  { value: 'bottom-right', label: 'Низ право' },
] as const;

// ===================================
// Video Slideshow Defaults
// ===================================

export const SLIDESHOW_CONFIG = {
  defaultDuration: 3, // seconds per slide
  defaultTransitionDuration: 0.5,
  defaultFps: 30,
  maxImages: 50,
  aspectRatios: [
    { value: '9:16', label: 'Вертикальное (9:16)', description: 'Stories, Reels' },
    { value: '16:9', label: 'Горизонтальное (16:9)', description: 'YouTube' },
    { value: '1:1', label: 'Квадратное (1:1)', description: 'Посты' },
  ],
  transitions: [
    { value: 'none', label: 'Без перехода' },
    { value: 'fade', label: 'Плавное появление' },
    { value: 'slide-left', label: 'Слайд влево' },
    { value: 'slide-right', label: 'Слайд вправо' },
    { value: 'zoom-in', label: 'Увеличение' },
    { value: 'zoom-out', label: 'Уменьшение' },
  ],
} as const;

// ===================================
// Property Types
// ===================================

export const PROPERTY_TYPES = [
  { value: 'apartment', label: '🏢 Квартира', labelRu: 'Квартира' },
  { value: 'house', label: '🏠 Дом', labelRu: 'Дом' },
  { value: 'office', label: '🏛️ Офис', labelRu: 'Офис' },
  { value: 'land', label: '🌳 Участок', labelRu: 'Участок' },
  { value: 'commercial', label: '🏪 Коммерческая', labelRu: 'Коммерческая недвижимость' },
] as const;

export const PROPERTY_FEATURES = [
  'Евроремонт',
  'Мебель',
  'Техника',
  'Кондиционер',
  'Балкон',
  'Лоджия',
  'Паркинг',
  'Охрана',
  'Детская площадка',
  'Спортзал',
  'Бассейн',
  'Лифт',
  'Интернет',
  'Вид на город',
  'Тихий район',
] as const;

// ===================================
// Navigation
// ===================================

export const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: 'Home' },
  { id: 'compress', label: 'Сжатие', icon: 'FileDown' },
  { id: 'watermark', label: 'Водяной знак', icon: 'Stamp' },
  { id: 'enhance', label: 'Улучшение', icon: 'Sparkles' },
  { id: 'slideshow', label: 'Видео', icon: 'Film' },
  { id: 'ai-convert', label: 'AI Описание', icon: 'Wand2' },
] as const;

// ===================================
// API Endpoints (for Vercel Edge Functions)
// ===================================

export const API = {
  generateDescription: '/api/generate-description',
  analyzeImage: '/api/analyze-image',
} as const;
