import { useState } from 'react';
import { useHistoryStore } from '@/store';
import { type HistoryItem } from '@/services/historyService';
import { useTelegram } from '@/hooks';
import { 
  Image, Video, FileText, Trash2, Download, 
  Clock, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        removeItem(id, item.data);
      } else {
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
        return <Image className="h-4 w-4 text-cyan-400" />;
      case 'video':
        return <Video className="h-4 w-4 text-purple-400" />;
      case 'text':
        return <FileText className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <>
      <div className="space-y-6 pb-24 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-2 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {t('modules.gallery.title')}
              <span className="bg-white/10 text-gray-400 text-xs px-2 py-0.5 rounded-full font-normal">
                {items.length}
              </span>
            </h1>
          </div>
          
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="relative mb-8"
             >
                <div className="absolute inset-0 bg-gray-700/30 blur-2xl rounded-full scale-150" />
                <div className="relative bg-gray-800/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                   <Clock className="h-16 w-16 text-gray-400" />
                </div>
             </motion.div>
             <h2 className="text-xl font-bold text-gray-300 mb-2">{t('modules.gallery.empty')}</h2>
             <p className="text-gray-500 text-sm leading-relaxed max-w-[200px]">
               {t('modules.gallery.empty_desc')}
             </p>
          </div>
        ) : (
          /* Grid Layout */
          <div className="grid grid-cols-3 gap-2 px-1 pb-4 overflow-y-auto">
            {items.map((item) => (
              <motion.button
                layoutId={`gallery-item-${item.id}`}
                key={item.id}
                onClick={() => {
                  hapticFeedback('impact', 'light');
                  setSelectedItem(item);
                }}
                className="relative aspect-square rounded-2xl overflow-hidden bg-gray-800 group border border-transparent hover:border-white/20 transition-all"
                whileTap={{ scale: 0.95 }}
              >
                {/* Thumbnail Content */}
                {item.type === 'image' && (
                  <img 
                    src={item.thumbnail || item.data} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {item.type === 'video' && (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent" />
                    <Video className="h-8 w-8 text-purple-400/80" />
                  </div>
                )}
                {item.type === 'text' && (
                  <div className="w-full h-full bg-gray-900 flex flex-col p-3 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                     <FileText className="h-6 w-6 text-emerald-500/50 mb-2" />
                     <div className="w-full h-2 bg-gray-700 rounded-full mb-1 opacity-50" />
                     <div className="w-2/3 h-2 bg-gray-700 rounded-full mb-1 opacity-50" />
                     <div className="w-full h-2 bg-gray-700 rounded-full opacity-30" />
                  </div>
                )}

                {/* Type Icon Overlay */}
                <div className="absolute bottom-2 right-2 p-1 rounded-md bg-black/40 backdrop-blur-sm">
                   {getIcon(item.type)}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl"
            onClick={() => setSelectedItem(null)}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent z-10">
               <button 
                 onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
                 className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
               >
                 <ChevronRight className="w-6 h-6 rotate-180" />
               </button>
               <div className="flex gap-3">
                 <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(selectedItem.id); }}
                    className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>
               </div>
            </div>

            {/* Main Content Preview */}
            <div 
               className="flex-1 flex items-center justify-center p-4 overflow-hidden" 
               onClick={(e) => e.stopPropagation()}
            >
               <motion.div 
                 layoutId={`gallery-item-${selectedItem.id}`}
                 className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl"
               >
                 {selectedItem.type === 'image' && (
                    <img 
                      src={selectedItem.data} 
                      alt={selectedItem.title}
                      className="max-w-full max-h-[70vh] object-contain rounded-2xl"
                    />
                 )}
                 {selectedItem.type === 'video' && (
                    <video 
                      src={selectedItem.data} 
                      controls 
                      autoPlay
                      className="max-w-full max-h-[70vh] rounded-2xl bg-black"
                    />
                 )}
                 {selectedItem.type === 'text' && (
                    <div className="bg-gray-900 p-6 rounded-2xl max-w-md w-full max-h-[60vh] overflow-y-auto border border-white/10 shadow-emerald-500/10">
                      <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">
                        {selectedItem.data}
                      </pre>
                    </div>
                 )}
               </motion.div>
            </div>

            {/* Bottom Info & Action */}
            <div 
               className="p-6 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent z-10 pb-10"
               onClick={(e) => e.stopPropagation()}
            >
               <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{selectedItem.title}</h3>
                    <p className="text-xs text-gray-400">{formatDate(selectedItem.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                     {getIcon(selectedItem.type)}
                     <span className="text-xs font-medium text-gray-300 uppercase">
                       {selectedItem.type === 'text' ? 'AI Text' : selectedItem.type}
                     </span>
                  </div>
               </div>

               <button
                 onClick={() => handleDownload(selectedItem)}
                 className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-gray-100 flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-[0.98] transition-all"
               >
                 <Download className="w-5 h-5" />
                 {t('common.download')}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
