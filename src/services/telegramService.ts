

export async function sendFileToChat(
  file: Blob | string, 
  filename: string, 
  chatId: string,
  type: 'video' | 'document' = 'document'
): Promise<boolean> {
  let response;

  if (typeof file === 'string') {
    // If it's a URL (string)
    response = await fetch('/api/send-to-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        fileUrl: file,
        filename,
        type,
        caption: '🎨 MaklerPro orqali tayyorlandi'
      }),
    });
  } else {
    // If it's a Blob
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('chatId', chatId);
    formData.append('type', type);
    formData.append('caption', '🎨 MaklerPro orqali tayyorlandi');

    response = await fetch('/api/send-to-chat', {
      method: 'POST',
      body: formData,
    });
  }

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
