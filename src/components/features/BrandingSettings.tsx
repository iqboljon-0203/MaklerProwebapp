import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Type, 
  Layers,
  Check,
  X,
  Eye,
  Settings2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '@/store';
import { 
  uploadWatermarkLogo, 
  deleteWatermarkLogo, 
  updateWatermarkSettings,
  getBrandingProfile,
  DEFAULT_WATERMARK_SETTINGS
} from '@/services/watermarkService';
import { applyCustomWatermark } from '@/services/imageService';
import type { 
  CustomWatermarkSettings, 
  WatermarkPosition, 
  WatermarkType,
  ImageFile
} from '@/types';
import { useTranslation } from 'react-i18next';

// ===================================
// Types
// ===================================

interface BrandingSettingsProps {
  telegramId: string;
  onClose?: () => void;
}

// ===================================
// Sample Image for Preview
// ===================================

const SAMPLE_IMAGE_URL = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop';

// ===================================
// Main Component
// ===================================

export function BrandingSettings({ telegramId, onClose }: BrandingSettingsProps) {
  const { branding, setWatermarkSettings, setCustomLogoUrl, setTextWatermark } = useUserStore();
  const { t } = useTranslation();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local settings state
  const [localSettings, setLocalSettings] = useState<CustomWatermarkSettings>(
    branding.settings || DEFAULT_WATERMARK_SETTINGS
  );
  const [localTextWatermark, setLocalTextWatermark] = useState(branding.textWatermark);

  // Position Options (Dynamic Translation)
  const POSITION_OPTIONS: { value: WatermarkPosition; label: string }[] = [
    { value: 'top-left', label: t('settings.positions.top_left') },
    { value: 'top-center', label: t('settings.positions.top_center') },
    { value: 'top-right', label: t('settings.positions.top_right') },
    { value: 'center-left', label: t('settings.positions.center_left') },
    { value: 'center', label: t('settings.positions.center') },
    { value: 'center-right', label: t('settings.positions.center_right') },
    { value: 'bottom-left', label: t('settings.positions.bottom_left') },
    { value: 'bottom-center', label: t('settings.positions.bottom_center') },
    { value: 'bottom-right', label: t('settings.positions.bottom_right') },
    { value: 'tile', label: t('settings.positions.tile') },
  ];

  const TYPE_OPTIONS: { value: WatermarkType; label: string; icon: React.ReactNode }[] = [
    { value: 'text', label: t('settings.watermark_type.text'), icon: <Type size={18} /> },
    { value: 'logo', label: t('settings.watermark_type.logo'), icon: <ImageIcon size={18} /> },
    { value: 'both', label: t('settings.watermark_type.both'), icon: <Layers size={18} /> },
  ];
  
  // ===================================
  // Load Branding Profile
  // ===================================
  
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const profile = await getBrandingProfile(telegramId);
        if (profile) {
          setLocalSettings(profile.watermarkSettings);
          setLocalTextWatermark(profile.textWatermark);
          if (profile.customWatermarkUrl) {
            setCustomLogoUrl(profile.customWatermarkUrl);
          }
        }
      } catch (error) {
        console.error('Failed to load branding profile:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProfile();
  }, [telegramId, setCustomLogoUrl]);
  
  // ===================================
  // Handle Logo Upload
  // ===================================
  
  const handleLogoUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    
    try {
      const result = await uploadWatermarkLogo(telegramId, file);
      
      if (result.success && result.url) {
        setCustomLogoUrl(result.url);
        toast.success(t('common.success'));
      } else {
        toast.error(result.error || t('common.error'));
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsUploading(false);
    }
  }, [telegramId, setCustomLogoUrl, t]);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);
  
  // ===================================
  // Handle Logo Delete
  // ===================================
  
  const handleDeleteLogo = useCallback(async () => {
    setIsUploading(true);
    
    try {
      const result = await deleteWatermarkLogo(telegramId);
      
      if (result.success) {
        setCustomLogoUrl(null);
        toast.success(t('common.success'));
      } else {
        toast.error(result.error || t('common.error'));
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsUploading(false);
    }
  }, [telegramId, setCustomLogoUrl, t]);
  
  // ===================================
  // Handle Settings Save
  // ===================================
  
  const handleSaveSettings = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const result = await updateWatermarkSettings(telegramId, localSettings);
      
      if (result.success) {
        setWatermarkSettings(localSettings);
        setTextWatermark(localTextWatermark);
        toast.success(t('common.success'));
      } else {
        toast.error(result.error || t('common.error'));
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [telegramId, localSettings, localTextWatermark, setWatermarkSettings, setTextWatermark, t]);
  
  // ===================================
  // Generate Preview
  // ===================================
  
  const generatePreview = useCallback(async () => {
    setIsPreviewLoading(true);
    
    try {
      // Create a sample image file
      const response = await fetch(SAMPLE_IMAGE_URL);
      const blob = await response.blob();
      
      const sampleImage: ImageFile = {
        id: 'preview',
        file: new File([blob], 'sample.jpg', { type: 'image/jpeg' }),
        preview: SAMPLE_IMAGE_URL,
        width: 800,
        height: 600,
        size: blob.size,
        name: 'sample.jpg',
        type: 'image/jpeg',
      };
      
      const result = await applyCustomWatermark(sampleImage, {
        logoUrl: branding.customLogoUrl || undefined,
        textWatermark: localTextWatermark,
        settings: localSettings,
        isPremium: true, // Preview without MaklerPro branding
      });
      
      setPreviewUrl(result.preview);
      setActiveTab('preview');
      
    } catch (error) {
      console.error('Preview generation failed:', error);
      toast.error(t('common.error'));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [branding.customLogoUrl, localTextWatermark, localSettings, t]);
  
  // ===================================
  // Render
  // ===================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
            <p className="text-blue-100 text-sm mt-1">
              {t('modules.branding.desc')}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-white text-blue-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Settings2 size={16} className="inline mr-2" />
            {t('modules.branding.action')}
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-blue-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Eye size={16} className="inline mr-2" />
            {t('modules.gallery.action')} 
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Logo Upload Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('settings.upload_logo')}
                </h3>
                
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                    {branding.customLogoUrl ? (
                      <img
                        src={branding.customLogoUrl}
                        alt="Custom Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon size={32} className="text-gray-400" />
                    )}
                    
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      <Upload size={18} />
                      {branding.customLogoUrl ? t('settings.upload_logo') : t('settings.upload_logo')}
                    </button>
                    
                    {branding.customLogoUrl && (
                      <button
                        onClick={handleDeleteLogo}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                        {t('common.delete')}
                      </button>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.upload_hint')}
                    </p>
                  </div>
                </div>
              </section>
              
              {/* Watermark Type */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('settings.watermark')}
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLocalSettings({ ...localSettings, type: option.value })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        localSettings.type === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </section>
              
              {/* Text Watermark Settings */}
              {(localSettings.type === 'text' || localSettings.type === 'both') && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('settings.custom_text')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('settings.text_placeholder')}
                      </label>
                      <input
                        type="text"
                        value={localTextWatermark.name}
                        onChange={(e) => setLocalTextWatermark({ ...localTextWatermark, name: e.target.value })}
                        placeholder="John Doe Realty"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('settings.phone')}
                      </label>
                      <input
                        type="text"
                        value={localTextWatermark.phone}
                        onChange={(e) => setLocalTextWatermark({ ...localTextWatermark, phone: e.target.value })}
                        placeholder="+998 90 123 45 67"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </section>
              )}
              
              {/* Position */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('settings.position')}
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  {POSITION_OPTIONS.slice(0, 9).map((position) => (
                    <button
                      key={position.value}
                      onClick={() => setLocalSettings({ ...localSettings, position: position.value })}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                        localSettings.position === position.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {position.label}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setLocalSettings({ ...localSettings, position: 'tile' })}
                  className={`w-full mt-2 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    localSettings.position === 'tile'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Layers size={16} className="inline mr-2" />
                  Tile
                </button>
              </section>
              
              {/* Opacity & Scale */}
              <section className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.opacity')}
                    </label>
                    <span className="text-sm text-gray-500">{Math.round(localSettings.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={localSettings.opacity}
                    onChange={(e) => setLocalSettings({ ...localSettings, opacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.scale')}
                    </label>
                    <span className="text-sm text-gray-500">{localSettings.scale}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={localSettings.scale}
                    onChange={(e) => setLocalSettings({ ...localSettings, scale: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </section>
              
              {/* Enable/Disable Toggle */}
              <section>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t('settings.watermark_status')}: {localSettings.enabled ? t('settings.on') : t('settings.off')}</p>
                    <p className="text-sm text-gray-500">{t('settings.watermark')}</p>
                  </div>
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, enabled: !localSettings.enabled })}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      localSettings.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        localSettings.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </section>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={generatePreview}
                  disabled={isPreviewLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {isPreviewLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Eye size={18} />
                  )}
                  {t('modules.gallery.action')}
                </button>
                
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Preview Image */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Watermark Preview"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="aspect-[4/3] flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {t('common.loading')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={generatePreview}
                disabled={isPreviewLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Eye size={18} />
                    {t('modules.gallery.action')}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default BrandingSettings;
