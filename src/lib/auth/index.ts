import { env } from '@/config/env';
import { emailPasswordProvider } from './providers/emailPassword';
import { phoneOtpProvider } from './providers/phoneOtp';
import type { AuthProvider } from './types';

/**
 * Selects the active auth provider from configuration.
 * Nothing outside this file knows which provider is in use.
 */
export function getAuthProvider(): AuthProvider {
  return env.phoneAuthEnabled ? phoneOtpProvider : emailPasswordProvider;
}

export { can, canAny, usesSiteShell, roleLabelKey, type Action } from './permissions';
export type { AuthProvider, AuthState, SignInInput, SignUpInput } from './types';
