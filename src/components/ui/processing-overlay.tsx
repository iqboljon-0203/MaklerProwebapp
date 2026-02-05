import { useAppStore } from '@/store';
import { Loader2 } from 'lucide-react';

export function ProcessingOverlay() {
  const { isProcessing, progress } = useAppStore();

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-card border shadow-xl max-w-sm w-full mx-4">
        <div className="relative">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             {/* Optional: Add Logo in center of spinner if desired */}
        </div>
        
        <div className="text-center space-y-2 w-full">
            <h3 className="font-semibold text-lg animate-pulse">
                {progress.message || 'Обработка...'}
            </h3>
            
            {/* Progress Bar */}
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                />
            </div>
            
            <p className="text-sm text-muted-foreground">
                {progress.current} из {progress.total}
            </p>
        </div>
      </div>
    </div>
  );
}
