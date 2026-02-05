import { useState } from 'react';
import { useHistoryStore, useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { generateDescription } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { PremiumGate } from '@/components/features/PremiumGate';

type Platform = 'telegram' | 'instagram' | 'olx';

export function AiConverter() {
  const { addToast, setProcessing, isProcessing } = useAppStore();
  const { addItem } = useHistoryStore();
  const { hapticFeedback } = useTelegram();
  
  const [rawInput, setRawInput] = useState('');
  const [platform, setPlatform] = useState<Platform>('telegram');
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!rawInput.trim()) {
      addToast({ type: 'warning', title: 'Matn kiriting', message: 'Ko\'chmas mulk haqida ma\'lumot yozing' });
      return;
    }

    try {
      setProcessing(true);
      hapticFeedback('impact');
      
      const result = await generateDescription(rawInput, platform);
      setGeneratedText(result);
      
      // Save to history
      addItem({
        type: 'text',
        title: `${platform.toUpperCase()} tavsifi`,
        data: result,
      });
      
      addToast({ type: 'success', title: 'Tayyor! ✨', message: 'AI tavsif yaratildi' });
      hapticFeedback('notification');
      
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Xatolik', message: 'Tavsif yaratib bo\'lmadi' });
      hapticFeedback('notification');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      hapticFeedback('notification');
      addToast({ type: 'success', title: 'Nusxalandi!', message: '' });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PremiumGate featureName="AI Tavsif Generatori">
      <div className="flex flex-col h-full space-y-4">
        
        {/* Input Section */}
        <Card className="p-4 bg-[#1E1E1E] border-white/5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
            Ko'chmas mulk haqida ma'lumot
          </Label>
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Masalan: 3 xonali kvartira, 80 m², 5-qavat, remont bor, Sergeli metro yaqin, narxi 45000$"
            className="min-h-[120px] bg-black/30 border-white/10 text-gray-200 placeholder:text-gray-600 resize-none"
          />
        </Card>

        {/* Platform Selector */}
        <Card className="p-4 bg-[#1E1E1E] border-white/5">
          <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">
            Platforma
          </Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="bg-black/30 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="telegram">📱 Telegram</SelectItem>
              <SelectItem value="instagram">📸 Instagram</SelectItem>
              <SelectItem value="olx">🛒 OLX</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isProcessing || !rawInput.trim()}
          size="lg"
          className="w-full py-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generatsiya...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              AI Tavsif yaratish
            </>
          )}
        </Button>

        {/* Result Section */}
        {generatedText && (
          <Card className="p-4 bg-[#1E1E1E] border-emerald-500/30 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Natija ({platform.toUpperCase()})
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-gray-400 hover:text-white"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                {generatedText}
              </pre>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!generatedText && !rawInput && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="p-6 rounded-full bg-emerald-500/10 mb-4">
              <FileText className="h-12 w-12 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-300 mb-2">AI Tavsif Generatori</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Ko'chmas mulk haqida ma'lumot kiriting va AI sizga tayyor e'lon matni yaratib beradi.
            </p>
          </div>
        )}
      </div>
    </PremiumGate>
  );
}
