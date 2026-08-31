import type { SessionUser } from '@/types/domain';

/**
 * The auth provider contract.
 * The product is designed for phone plus OTP, because site staff do not
 * reliably have email. Supabase phone auth needs a paid SMS provider, so the
 * layer sits behind this adapter: email and password ships enabled today and
 * switching on OTP later is a configuration change, not a rewrite.
 */
export interface AuthProvider {
  readonly id: 'email-password' | 'phone-otp';

  /** Starts a sign-in. Returns whether a second step (an OTP) is required. */
  signIn(input: SignInInput): Promise<{ requiresVerification: boolean }>;

  /** Completes a two step sign-in by verifying the code that was sent. */
  verify?(input: { identifier: string; code: string }): Promise<void>;

  /** Creates a new account for the identifier. */
  signUp(input: SignUpInput): Promise<{ requiresVerification: boolean }>;

  /** Sends whatever the provider uses to recover access. */
  requestPasswordReset?(identifier: string): Promise<void>;

  /** Ends the session on this device. */
  signOut(): Promise<void>;
}

export type SignInInput = { identifier: string; password?: string };
export type SignUpInput = { identifier: string; password?: string; fullName: string };

export type AuthState = {
  user: SessionUser | null;
  isLoading: boolean;
  error: string | null;
};
