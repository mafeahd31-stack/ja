import { env } from '../config/env';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  token: string;
}

export async function sendPushNotification(payload: PushPayload): Promise<boolean> {
  if (!env.firebase.serverKey) {
    console.log(`[DEV PUSH] To: ${payload.token}, Title: ${payload.title}`);
    return true;
  }

  try {
    const response = await fetch(
      'https://fcm.googleapis.com/fcm/send',
      {
        method: 'POST',
        headers: {
          Authorization: `key=${env.firebase.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.token,
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
          },
          data: payload.data || {},
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

export async function sendPushToMultiple(
  payload: Omit<PushPayload, 'token'>,
  tokens: string[]
): Promise<boolean> {
  if (!env.firebase.serverKey) {
    console.log(`[DEV PUSH] To ${tokens.length} devices`);
    return true;
  }

  try {
    const response = await fetch(
      'https://fcm.googleapis.com/fcm/send',
      {
        method: 'POST',
        headers: {
          Authorization: `key=${env.firebase.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
          },
          data: payload.data || {},
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}
