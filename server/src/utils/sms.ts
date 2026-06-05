import { env } from '../config/env';

/**
 * Send SMS via Twilio or fallback to Unifonic (Middle East provider)
 */
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (env.twilio.accountSid) {
    return sendViaTwilio(phone, message);
  }

  if (env.unifonic.apiKey) {
    return sendViaUnifonic(phone, message);
  }

  console.log(`[DEV SMS] To: ${phone}, Message: ${message}`);
  return true;
}

async function sendViaTwilio(phone: string, message: string): Promise<boolean> {
  try {
    const accountSid = env.twilio.accountSid;
    const authToken = env.twilio.authToken;
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: env.twilio.phoneNumber,
          Body: message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return false;
  }
}

async function sendViaUnifonic(phone: string, message: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.unifonic.com/rest/Messages/Send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.unifonic.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Recipient: phone,
        Body: message,
        SenderID: env.unifonic.senderId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Unifonic SMS error:', error);
    return false;
  }
}
