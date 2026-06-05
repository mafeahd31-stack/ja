/**
 * Generate a random OTP code
 * In production, this should be 4-6 digits
 * In development/test, returns a fixed code for convenience
 */
export function generateOtp(): string {
  if (process.env.NODE_ENV === 'development') {
    return '1234';
  }

  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * OTP store (in-memory, use Redis in production)
 */
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function storeOtp(phone: string, code: string): void {
  otpStore.set(phone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
}

export function verifyOtp(phone: string, code: string): boolean {
  const stored = otpStore.get(phone);

  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  const isValid = stored.code === code;
  if (isValid) otpStore.delete(phone);
  return isValid;
}
