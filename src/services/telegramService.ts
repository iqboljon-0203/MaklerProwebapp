

export async function sendFileToChat(
  blob: Blob, 
  filename: string, 
  chatId: string
): Promise<boolean> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('chatId', chatId);
  formData.append('caption', '🎨 MaklerPro orqali tayyorlandi');

  const response = await fetch('/api/send-to-chat', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send file');
  }

  return true;
}

// Helper to deduce Chat ID from Telegram WebApp initData
export function getTelegramChatId(): string | null {
  const telegram = (window as any).Telegram?.WebApp;
  if (telegram?.initDataUnsafe?.user?.id) {
    return String(telegram.initDataUnsafe.user.id);
  }
  return null;
}
