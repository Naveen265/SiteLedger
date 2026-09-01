import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { getAuthProvider } from '@/lib/auth';
import { can as canDo, type Action } from '@/lib/auth/permissions';
import { toUserMessage } from '@/lib/supabase/errors';
import { queryClient } from '@/lib/query/client';
import type { SessionUser } from '@/types/domain';

/**
 * Authentication and identity.
 * The signed-in user is a flattened view of the auth user, their profile and
 * their company membership, because every screen needs role and company id and
 * none of them should join three tables to get it.
 */

type AuthContextValue = {
  user: SessionUser | null;
  session: Session | null;
  isLoading: boolean;
  /** True once the initial session check has finished, signed in or not. */
  isReady: boolean;
  error: string | null;
  signIn: (identifier: string, password?: string) => Promise<{ requiresVerification: boolean }>;
  verifyCode: (identifier: string, code: string) => Promise<void>;
  signUp: (input: { identifier: string; password?: string; fullName: string }) => Promise<{ requiresVerification: boolean }>;
  requestPasswordReset: (identifier: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads the profile and membership, after a role change or a new invite. */
  refresh: () => Promise<void>;
  /** Permission check, backed by the single rules file. */
  can: (action: Action) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads the profile and the active company membership for an auth user.
   * A user with no active membership is signed in but has no company yet,
   * which is the state right after an invite is sent but not accepted.
   */
  const loadSessionUser = useCallback(async (authUserId: string): Promise<SessionUser | null> => {
    const { data, error: loadError } = await supabase
      .from('company_members')
      // The foreign key is named explicitly because company_members has two
      // references to profiles, profile_id and invited_by. Without it
      // PostgREST cannot choose between them and answers PGRST201, which
      // presents as a sign-in that authenticates and then does nothing.
      // Written as one literal because the client parses this string to infer
      // the result type; a concatenation degrades it to an error type.
      .select(
        'company_id, role, site_level, status, profile:profiles!company_members_profile_id_fkey(id, full_name, phone, email, avatar_url, locale)',
      )
      .eq('profile_id', authUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (loadError) throw new Error(toUserMessage(loadError));
    if (!data) return null;

    // The profile row is created by a trigger on auth.users, so its absence
    // means the trigger did not run rather than a normal empty result.
    const profile = data.profile as unknown as SessionUser | null;
    if (!profile) {
      throw new Error(
        'Your profile record is missing. Sign out and sign in again, or ask an owner to re-invite you.',
      );
    }

    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      avatar_url: profile.avatar_url,
      locale: profile.locale,
      company_id: data.company_id,
      role: data.role,
      site_level: data.site_level,
      status: data.status,
    };
  }, []);

  /** Applies a Supabase session to local state, loading the membership with it. */
  const applySession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setUser(null);
        return;
      }
      try {
        setUser(await loadSessionUser(nextSession.user.id));
      } catch (loadError) {
        setError(toUserMessage(loadError));
        setUser(null);
      }
    },
    [loadSessionUser],
  );

  // Read the stored session on first paint, then follow every auth change.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      await applySession(data.session);
      setIsLoading(false);
      setIsReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;
      await applySession(nextSession);
      setIsLoading(false);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [applySession]);

  /** Starts a sign-in through whichever provider is configured. */
  const signIn = useCallback(async (identifier: string, password?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      return await getAuthProvider().signIn({ identifier, password });
    } catch (signInError) {
      const message = toUserMessage(signInError);
      setError(message);
      // Keep the underlying failure attached, so a diagnostic trace is not lost
      // when the readable message replaces it.
      throw new Error(message, { cause: signInError });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Completes a two step sign-in by verifying the code that was sent. */
  const verifyCode = useCallback(async (identifier: string, code: string) => {
    setError(null);
    const provider = getAuthProvider();
    if (!provider.verify) throw new Error('This sign-in method does not use a code.');
    try {
      await provider.verify({ identifier, code });
    } catch (verifyError) {
      const message = toUserMessage(verifyError);
      setError(message);
      throw new Error(message, { cause: verifyError });
    }
  }, []);

  /** Creates a new account through the configured provider. */
  const signUp = useCallback(
    async (input: { identifier: string; password?: string; fullName: string }) => {
      setError(null);
      try {
        return await getAuthProvider().signUp(input);
      } catch (signUpError) {
        const message = toUserMessage(signUpError);
        setError(message);
        throw new Error(message, { cause: signUpError });
      }
    },
    [],
  );

  /** Sends whatever the provider uses to recover access. */
  const requestPasswordReset = useCallback(async (identifier: string) => {
    const provider = getAuthProvider();
    if (!provider.requestPasswordReset) {
      throw new Error('Password reset is not available for this sign-in method.');
    }
    await provider.requestPasswordReset(identifier);
  }, []);

  /** Ends the session and clears every cached query for this user. */
  const signOut = useCallback(async () => {
    await getAuthProvider().signOut();
    queryClient.clear();
    setUser(null);
    setSession(null);
  }, []);

  /** Re-reads profile and membership without a full page reload. */
  const refresh = useCallback(async () => {
    if (!session?.user) return;
    setUser(await loadSessionUser(session.user.id));
  }, [session, loadSessionUser]);

  /** Permission check bound to the current user. */
  const can = useCallback((action: Action) => canDo(user, action), [user]);

  const value = useMemo(
    () => ({
      user, session, isLoading, isReady, error,
      signIn, verifyCode, signUp, requestPasswordReset, signOut, refresh, can,
    }),
    [user, session, isLoading, isReady, error, signIn, verifyCode, signUp, requestPasswordReset, signOut, refresh, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads the auth context. Throws if used outside the provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
