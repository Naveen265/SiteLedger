import { supabase } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/supabase/errors';
import type { AuthProvider, SignInInput, SignUpInput } from '../types';

/**
 * Phone plus OTP provider.
 * Fully implemented, but only selected when VITE_AUTH_PHONE_ENABLED is true,
 * because Supabase phone auth requires a paid SMS provider such as MSG91.
 */
export const phoneOtpProvider: AuthProvider = {
  id: 'phone-otp',

  /** Sends a one time code to the phone number and waits for verification. */
  async signIn({ identifier }: SignInInput) {
    const { error } = await supabase.auth.signInWithOtp({ phone: normalise(identifier) });
    if (error) throw new Error(toUserMessage(error));
    return { requiresVerification: true };
  },

  /** Exchanges the code the user typed for a session. */
  async verify({ identifier, code }) {
    const { error } = await supabase.auth.verifyOtp({
      phone: normalise(identifier),
      token: code,
      type: 'sms',
    });
    if (error) throw new Error(toUserMessage(error));
  },

  /** Sign-up and sign-in are the same flow for OTP; the code creates the user. */
  async signUp({ identifier, fullName }: SignUpInput) {
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalise(identifier),
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(toUserMessage(error));
    return { requiresVerification: true };
  },

  /** Ends the session on this device only. */
  async signOut() {
    await supabase.auth.signOut();
  },
};

/** Adds the India country code when the user typed a bare ten digit number. */
function normalise(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}
