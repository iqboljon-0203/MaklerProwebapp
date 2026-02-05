import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // 1. CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { 
      provider, 
      external_id, 
      user_id, // This is the Telegram ID
      amount, 
      signature 
    } = await req.json();

    // 2. Verify Signature (Mock)
    // In production, checking headers['x-click-signature'] or hash(body + salt)
    const isValid = mockVerifySignature(provider, signature);
    
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Idempotency Check
    // Check if payment already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('external_id', external_id)
      .eq('provider', provider)
      .single();

    if (existingPayment) {
      return new Response(JSON.stringify({ message: 'Payment already processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Record Payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        provider,
        external_id,
        amount,
        status: 'paid',
        metadata: { processed_at: new Date().toISOString() }
      });

    if (paymentError) {
      console.error('Payment Insert Error:', paymentError);
      throw new Error('Failed to record payment');
    }

    // 5. Update User Premium Status
    // Set premium_until to NOW + 30 days. 
    // If user is already premium and has time left, we should add 30 days to existing time?
    // For simplicity, this implementation extends from NOW or extends existing.
    
    // First get current status
    const { data: userData } = await supabase
      .from('users')
      .select('premium_until')
      .eq('telegram_id', user_id)
      .single();
      
    let newPremiumUntil = new Date();
    newPremiumUntil.setDate(newPremiumUntil.getDate() + 30); // Default +30 days from now

    if (userData?.premium_until) {
        const currentUntil = new Date(userData.premium_until);
        if (currentUntil > new Date()) {
            // User is currently premium, add 30 days to the expiry date
            currentUntil.setDate(currentUntil.getDate() + 30);
            newPremiumUntil = currentUntil;
        }
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ 
        is_premium: true,
        premium_until: newPremiumUntil.toISOString(),
        // Reset or increase daily limits? Maybe increase max limit logic resides elsewhere
      })
      .eq('telegram_id', user_id);

    if (userError) {
        console.error('User Update Error:', userError);
        // Note: Payment recorded but user not updated. Needs manual reconciliation or retry logic.
        throw new Error('Failed to activate premium');
    }

    return new Response(JSON.stringify({ success: true, premium_until: newPremiumUntil }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function mockVerifySignature(provider: string, signature: string): boolean {
    // ⚠️ WARNING: THIS IS FOR TESTING ONLY ⚠️
    // To secure your webhook, you MUST implement provider-specific validation.
    
    // Example for Click:
    // const clickSecret = Deno.env.get('CLICK_SECRET_KEY');
    // const myHash = md5(click_trans_id + service_id + ... + clickSecret);
    // return myHash === signature;

    // For security in this MVP, we require a specific manual secret:
    const TEST_SECRET = 'TEST_SECRET_KEY_123'; 
    if (signature === TEST_SECRET) return true;

    console.error(`Invalid Signature. Received: ${signature}, Expected: ${TEST_SECRET}`);
    return false;
}
