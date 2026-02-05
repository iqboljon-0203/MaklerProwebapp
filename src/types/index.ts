// ===================================
// MaklerPro Type Definitions
// ===================================

// Telegram WebApp Types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: ThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  MainButton: MainButton;
  BackButton: BackButton;
  HapticFeedback: HapticFeedback;
}

export interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
}

export interface BackButton {
  isVisible: boolean;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
}

export interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

// ===================================
// Image Processing Types
// ===================================

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
  size: number;
  name: string;
  type: string;
}

export interface ProcessedImage {
  id: string;
  originalId: string;
  blob: Blob;
  preview: string;
  width: number;
  height: number;
  size: number;
}

export interface WatermarkConfig {
  text: string;           // Primary text (e.g. Name)
  secondText?: string;    // Secondary text (e.g. Phone)
  position: WatermarkPosition;
  fontSize: number;
  opacity: number;
  color: string;
  fontFamily: string;
  rotation: number;
  logo?: string;
  logoSize?: number;
  style?: 'simple' | 'badge' | 'glass'; // Visual style
}

export type WatermarkPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'tile';

export interface CompressionConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
}

export interface EnhancementConfig {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  sharpness: number;    // 0 to 100
}

// ===================================
// Video Slideshow Types
// ===================================

export interface SlideshowConfig {
  images: ProcessedImage[];
  duration: number;        // seconds per slide
  transition: TransitionType;
  transitionDuration: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  fps: number;
  quality: 'low' | 'medium' | 'high';
}

export type TransitionType = 
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out';

// ===================================
// AI Description Types
// ===================================

export interface PropertyDetails {
  type: PropertyType;
  rooms: number;
  area: number;
  floor?: number;
  totalFloors?: number;
  price: number;
  currency: 'UZS' | 'USD';
  location: string;
  features: string[];
  description?: string;
  rawInput?: string;
}

export type PropertyType = 
  | 'apartment'
  | 'house'
  | 'office'
  | 'land'
  | 'commercial';

export interface GeneratedDescriptions {
  telegram: string;
  instagram: string;
  olx: string;
}

export type Platform = 'telegram' | 'instagram' | 'olx';

// ===================================
// UI State Types
// ===================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export type AppView = 
  | 'home'
  | 'compress'
  | 'watermark'
  | 'enhance'
  | 'slideshow'
  | 'ai-convert'
  | 'gallery'
  | 'settings';

export interface ProcessingProgress {
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
}
