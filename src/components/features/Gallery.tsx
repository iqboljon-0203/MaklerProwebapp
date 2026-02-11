import { useState } from 'react';
import { useHistoryStore } from '@/store';
import { type HistoryItem } from '@/services/historyService';
import { useTelegram } from '@/hooks';
import { 
  Image, Video, FileText, Trash2, Download, 
  Clock, ChevronRight 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Gallery() {
  const { t, i18n } = useTranslation();
  const { items, removeItem, clearHistory } = useHistoryStore();
  const { hapticFeedback, showConfirm } = useTelegram();
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const handleDelete = async (id: string) => {
    hapticFeedback('notification', 'warning');
    const confirmed = await showConfirm(t('modules.gallery.confirm_delete'));
    if (confirmed) {
      const item = items.find(i => i.id === id);
      if (item) {
        // Pass data (URL) for deletion from storage
        removeItem(id, item.data);
      } else {
        // Fallback just in case
        removeItem(id, ''); 
      }
      hapticFeedback('notification', 'success');
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  const handleClearAll = async () => {
    hapticFeedback('notification', 'warning');
    const confirmed = await showConfirm(t('modules.gallery.confirm_clear_all'));
    if (confirmed) {
      clearHistory();
      hapticFeedback('notification', 'success');
    }
  };

  const handleDownload = (item: HistoryItem) => {
    hapticFeedback('impact', 'light');
    const link = document.createElement('a');
    link.href = item.data;
    // Simple extension guess
    const ext = item.type === 'video' ? 'mp4' : item.type === 'image' ? 'png' : 'txt';
    link.download = `maklerpro-${item.title.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    link.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5 text-cyan-400" />;
      case 'video':
        return <Video className="h-5 w-5 text-purple-400" />;
      case 'text':
        return <FileText className="h-5 w-5 text-emerald-400" />;
    }
  };

  const getTypeLabel = (type: HistoryItem['type']) => {
    switch (type) {
      case 'image':
        return t('common.image');
      case 'video':
        return t('common.video');
      case 'text':
        return t('modules.ai.title'); // AI Tavsif
    }
  };

  // Empty State
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
        <div className="p-6 rounded-full bg-gray-800/50 mb-6">
          <Clock className="h-12 w-12 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-300 mb-2">{t('modules.gallery.empty')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          {t('modules.gallery.empty_desc')}
        </p>
      </div>
    );
  }

  // Detail View
  if (selectedItem) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
        {/* Back Button */}
        <button 
          onClick={() => setSelectedItem(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span className="text-sm">{t('common.back')}</span>
        </button>

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1E1E1E]">
          {selectedItem.type === 'image' && (
            <img 
              src={selectedItem.data} 
              alt={selectedItem.title}
              className="w-full h-auto max-h-[50vh] object-contain"
            />
          )}
          {selectedItem.type === 'video' && (
            <video 
              src={selectedItem.data} 
              controls 
              className="w-full h-auto max-h-[50vh]"
            />
          )}
          {selectedItem.type === 'text' && (
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                {selectedItem.data}
              </pre>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">{selectedItem.title}</h3>
          <p className="text-sm text-gray-500">{formatDate(selectedItem.created_at)}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handleDownload(selectedItem)}
            className="flex-1 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 font-medium flex items-center justify-center gap-2 hover:bg-cyan-500/30 transition-colors"
          >
            <Download className="h-5 w-5" />
            {t('common.download')}
          </button>
          <button
            onClick={() => handleDelete(selectedItem.id)}
            className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {t('modules.gallery.title')}
          </h1>
          <p className="text-gray-500 text-sm">{items.length} {t('modules.gallery.items')}</p>
        </div>
        
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            {t('modules.gallery.clear_all')}
          </button>
        )}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              hapticFeedback('impact', 'light');
              setSelectedItem(item);
            }}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-[#1E1E1E] hover:border-white/20 transition-all"
          >
            {/* Thumbnail */}
            {item.type === 'image' && (
              <img 
                src={item.thumbnail || item.data} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
            )}
            {item.type === 'video' && (
              <div className="w-full h-full bg-purple-500/10 flex items-center justify-center">
                <Video className="h-10 w-10 text-purple-400" />
              </div>
            )}
            {item.type === 'text' && (
              <div className="w-full h-full bg-emerald-500/10 p-3">
                <p className="text-[10px] text-gray-400 line-clamp-6 text-left">
                  {item.data.slice(0, 200)}...
                </p>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center gap-1.5">
                {getIcon(item.type)}
                <span className="text-[10px] text-gray-300 font-medium uppercase">
                  {getTypeLabel(item.type)}
                </span>
              </div>
            </div>

            {/* Delete Button (on hover) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
