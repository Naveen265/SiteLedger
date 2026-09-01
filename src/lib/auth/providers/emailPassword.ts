import { supabase } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/supabase/errors';
import type { AuthProvider, SignInInput, SignUpInput } from '../types';

/**
 * Email and password provider.
 * This is the provider that ships enabled: it works on the Supabase free tier
 * and it is what office users and developers sign in with.
 */
export const emailPasswordProvider: AuthProvider = {
  id: 'email-password',

  /** Signs in directly; there is no second step for this provider. */
  async signIn({ identifier, password }: SignInInput) {
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: password ?? '',
    });
    if (error) throw new Error(toUserMessage(error));
    return { requiresVerification: false };
  },

  /**
   * Creates the auth user and seeds the profile name used across the app.
   *
   * Reports whether a session was established. When the project requires email
   * confirmation, Supabase returns a user but no session, and the caller must
   * not go on to create the company: that write needs an authenticated session
   * and would fail, leaving an account with no company attached.
   */
  async signUp({ identifier, password, fullName }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({
      email: identifier,
      password: password ?? '',
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(toUserMessage(error));
    return { requiresVerification: !data.session };
  },

  /** Sends a reset link back to the app's reset route. */
  async requestPasswordReset(identifier: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(toUserMessage(error));
  },

  /** Ends the session on this device only. */
  async signOut() {
    await supabase.auth.signOut();
  },
};
