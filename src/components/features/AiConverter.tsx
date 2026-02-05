import { useState } from 'react';
import { useAppStore } from '@/store';
import { generateDescriptions, copyToClipboard } from '@/services/aiService';
import type { GeneratedDescriptions, PropertyDetails } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Wand2, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumGate } from '@/components/features/PremiumGate';

export function AiConverter() {
  const { isProcessing, setProcessing, addToast } = useAppStore();
  
  const [mode, setMode] = useState<'raw' | 'form'>('raw');
  const [rawInput, setRawInput] = useState('');
  const [generated, setGenerated] = useState<GeneratedDescriptions | null>(null);
  const [activeTab, setActiveTab] = useState('telegram');
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<PropertyDetails>>({
    type: 'apartment',
    rooms: 2,
    area: 50,
    price: 0,
    currency: 'USD',
    location: '',
    features: [],
  });

  const handleGenerate = async () => {
    if (mode === 'raw' && !rawInput.trim()) {
      addToast({ type: 'warning', title: 'Введите текст', message: 'Поле не должно быть пустым' });
      return;
    }

    setProcessing(true);
    setGenerated(null);

    try {
      const payload: any = mode === 'raw' 
        ? { rawInput } 
        : { ...formData, features: [] }; 

      const result = await generateDescriptions(payload);
      setGenerated(result);
      
      addToast({
        type: 'success',
        title: 'Готово!',
        message: 'Описания сгенерированы'
      });
    } catch (error) {
      console.error(error);
      addToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось сгенерировать описание'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: 'success', title: 'Скопировано', message: 'Текст в буфере обмена' });
    }
  };

  return (
    <PremiumGate featureName="AI генерацию">
      <div className="flex flex-col space-y-4 pb-20">
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'raw' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setMode('raw')}
          >
            Текст
          </button>
          <button
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'form' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setMode('form')}
          >
            Анкета
          </button>
        </div>

        <Card className="p-4 border-border/50">
          {mode === 'raw' ? (
            <div className="space-y-3">
              <Label htmlFor="raw-input">Исходные данные</Label>
              <Textarea
                id="raw-input"
                placeholder="Например: 3 комнатная на Чиланзаре, 50.000, евроремонт, 2 этаж..."
                className="min-h-[120px] resize-none"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Тип</Label>
                   <Input value="Квартира" disabled />
                 </div>
                 <div className="space-y-2">
                   <Label>Комнат</Label>
                   <Input type="number" value={formData.rooms} onChange={e => setFormData({...formData, rooms: Number(e.target.value)})} />
                 </div>
               </div>
               <div className="space-y-2">
                  <Label>Расположение</Label>
                  <Input placeholder="Район, ориентир..." value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
               </div>
               <p className="text-xs text-muted-foreground text-center">Полная анкета в разработке...</p>
            </div>
          )}

          <Button 
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            onClick={handleGenerate}
            disabled={isProcessing}
          >
            {isProcessing ? (
              'Генерация...'
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Сгенерировать
              </>
            )}
          </Button>
        </Card>

        {generated && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="font-semibold px-1">Результат</h3>
              <Tabs defaultValue="telegram" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="telegram">Telegram</TabsTrigger>
                      <TabsTrigger value="instagram">Instagram</TabsTrigger>
                      <TabsTrigger value="olx">OLX</TabsTrigger>
                  </TabsList>
                  
                  {['telegram', 'instagram', 'olx'].map((platform) => (
                      <TabsContent key={platform} value={platform} className="mt-2">
                          <Card className="relative p-4 border-border/50 bg-muted/30">
                              <Textarea 
                                  className="min-h-[200px] bg-transparent border-none resize-none focus-visible:ring-0 p-0"
                                  value={generated[platform as keyof GeneratedDescriptions]}
                                  readOnly
                              />
                              <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute bottom-4 right-4 shadow-sm"
                                  onClick={() => handleCopy(generated[platform as keyof GeneratedDescriptions])}
                              >
                                  {copied && activeTab === platform ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                      <Copy className="h-4 w-4" />
                                  )}
                                  <span className="ml-2">Копировать</span>
                              </Button>
                          </Card>
                      </TabsContent>
                  ))}
              </Tabs>
          </div>
        )}
      </div>
    </PremiumGate>
  );
}
