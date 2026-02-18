import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
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
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl"
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    {t('settings.upload_logo')}
                  </h3>
                  {branding.customLogoUrl && (
                    <button
                      onClick={handleDeleteLogo}
                      disabled={isUploading}
                      className="text-red-500 hover:text-red-600 text-xs font-bold px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-4">
                    {/* Logo Preview */}
                    <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-white dark:bg-black/40 flex items-center justify-center border border-gray-200 dark:border-white/10">
                      {branding.customLogoUrl ? (
                        <img
                          src={branding.customLogoUrl}
                          alt="Custom Logo"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <ImageIcon size={24} className="text-gray-300 dark:text-gray-600" />
                      )}
                      
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1">
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                      >
                        <Upload size={16} />
                        {branding.customLogoUrl ? t('settings.upload_logo') : t('settings.upload_logo')}
                      </button>
                      
                      <p className="text-[10px] text-gray-400 mt-2 text-center">
                        {t('settings.upload_hint')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Watermark Type */}
              <section>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {t('settings.watermark')}
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLocalSettings({ ...localSettings, type: option.value })}
                      className={`relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                        localSettings.type === option.value
                          ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/20'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${localSettings.type === option.value ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-white/10'}`}>
                        {option.icon}
                      </div>
                      <span className="text-xs font-bold">{option.label}</span>
                      
                      {localSettings.type === option.value && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
              
              {/* Text Watermark Settings */}
              {(localSettings.type === 'text' || localSettings.type === 'both') && (
                <section className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      {t('settings.custom_text')}
                    </label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={localTextWatermark.name}
                          onChange={(e) => setLocalTextWatermark({ ...localTextWatermark, name: e.target.value })}
                          placeholder={t('settings.text_placeholder')}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">📞</div>
                        <input
                          type="text"
                          value={localTextWatermark.phone}
                          onChange={(e) => setLocalTextWatermark({ ...localTextWatermark, phone: e.target.value })}
                          placeholder={t('settings.phone')}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}
              
              {/* Visual Position Grid */}
              <section>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {t('settings.position')}
                </h3>
                
                <div className="flex flex-col items-center gap-4">
                  <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/10">
                    {POSITION_OPTIONS.slice(0, 9).map((position) => (
                      <button
                        key={position.value}
                        onClick={() => setLocalSettings({ ...localSettings, position: position.value })}
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                          localSettings.position === position.value
                            ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30 transform scale-110'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                        title={position.label}
                      >
                        <div className={`w-3 h-3 rounded-full ${localSettings.position === position.value ? 'bg-white' : 'bg-gray-300 dark:bg-white/20'}`} />
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, position: 'tile' })}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                      localSettings.position === 'tile'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                  >
                    <Layers size={14} />
                    {t('settings.positions.tile')}
                  </button>
                </div>
              </section>
              
              {/* Opacity & Scale */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                  <div className="flex justify-between mb-3 text-xs font-medium uppercase text-gray-400">
                    <label>{t('settings.opacity')}</label>
                    <span className="text-blue-500">{Math.round(localSettings.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={localSettings.opacity}
                    onChange={(e) => setLocalSettings({ ...localSettings, opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                
                <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                  <div className="flex justify-between mb-3 text-xs font-medium uppercase text-gray-400">
                    <label>{t('settings.scale')}</label>
                    <span className="text-blue-500">{localSettings.scale}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={localSettings.scale}
                    onChange={(e) => setLocalSettings({ ...localSettings, scale: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </section>
              
              {/* Enable/Disable Toggle */}
              <section>
                <div className={`
                  flex items-center justify-between p-4 rounded-2xl border transition-all duration-300
                  ${localSettings.enabled 
                    ? 'bg-blue-500/10 border-blue-500/50' 
                    : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10'}
                `}>
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${localSettings.enabled ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}
                    `}>
                      <Settings2 size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {t('settings.watermark_status')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {localSettings.enabled ? t('settings.on') : t('settings.off')}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, enabled: !localSettings.enabled })}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                      localSettings.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm ${
                        localSettings.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </section>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 mt-2 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={generatePreview}
                  disabled={isPreviewLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
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
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check size={20} strokeWidth={3} />
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
