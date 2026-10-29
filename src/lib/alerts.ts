import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail, escapeHtml } from '@/lib/email';

export type AlertReason = 'safety' | 'call_request' | 'help_button' | 'message' | 'care';

const LABEL: Record<AlertReason, string> = {
  safety: 'Safety words heard',
  call_request: 'Please call now',
  help_button: 'Help button pressed',
  message: 'A message from Remi',
  care: 'Worth a look',
};

export function formatAlertMessage(preferredName: string, reason: AlertReason, detail: string): string {
  return `🔔 Remi AI · ${preferredName}\n${LABEL[reason]}\n${detail}`;
}

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`telegram ${res.status}`);
}

// Never throws: an alert failure must not break the patient's conversation.
export async function sendAlert(householdId: string, reason: AlertReason, detail: string): Promise<void> {
  try {
    const admin = supabaseAdmin();
    await admin.from('events').insert({ household_id: householdId, type: 'alert', payload: { reason, detail } });
    const { data: h } = await admin.from('households').select('preferred_name, telegram_chat_id').eq('id', householdId).single();
    if (h?.telegram_chat_id) await sendTelegram(h.telegram_chat_id, formatAlertMessage(h.preferred_name, reason, detail));
    // the care team hears about safety and care signals, by email
    if (reason === 'safety' || reason === 'care') {
      const { data: contacts } = await admin.from('care_contacts').select('email').eq('household_id', householdId);
      await Promise.allSettled((contacts ?? []).map((c) => sendEmail(c.email as string, `Remi · ${h?.preferred_name ?? ''} · ${LABEL[reason]}`,
        `<p>${escapeHtml(detail)}</p><p style="color:#666">${new Date().toUTCString()}. This is a note from Remi, not a clinical judgment.</p>`)));
    }
  } catch (e) {
    console.error('sendAlert failed', e);
  }
}
