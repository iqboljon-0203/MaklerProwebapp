import fetch from 'node-fetch';

const URL = 'https://makler-pro-three.vercel.app/api/bot-webhook';

const payload = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: {
      id: 12345678,
      is_bot: false,
      first_name: 'Iqboljon',
      username: 'yuldashev_code',
      language_code: 'en'
    },
    chat: {
      id: 12345678,
      first_name: 'Iqboljon',
      username: 'yuldashev_code',
      type: 'private'
    },
    date: Math.floor(Date.now() / 1000),
    text: '/start'
  }
};

async function simulateWebhook() {
  console.log(`🚀 Sending POST request to: ${URL}`);
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': 'my_super_secret_makler_key_2024' // Uncomment if you set a secret in Vercel
      },
      body: JSON.stringify(payload)
    });

    console.log(`\n📡 Response Status: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
       const data = await response.json();
       console.log('📄 Response Body:', JSON.stringify(data, null, 2));
    } else {
       const text = await response.text();
       console.log('📄 Response Body:', text);
    }

  } catch (error) {
    console.error('❌ Error sending request:', error);
  }
}

simulateWebhook();
