import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInFormInput } from '@/lib/validation';
import { env } from '@/config/env';
import { routes } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toUserMessage } from '@/lib/supabase/errors';
import { AuthLayout } from '../components/AuthLayout';

/**
 * Sign in.
 * The identifier is an email address or a mobile number depending on which
 * auth provider is configured, so the label and keyboard change with it.
 */
export function SignInPage() {
  const t = useTranslate();
  const navigate = useNavigate();
  const { signIn, verifyCode, error: authError } = useAuth();
  const { notify } = useToast();
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const usesPhone = env.phoneAuthEnabled;

  const { register, handleSubmit, formState, getValues } = useForm<SignInFormInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: '', password: '' },
  });

  /** Starts sign-in, then either lands or waits for the one time code. */
  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await signIn(values.identifier, values.password);
      if (result.requiresVerification) {
        setAwaitingCode(true);
        notify(t('auth.otpSent'), 'info');
      }
      // A successful password sign-in is picked up by the auth state listener,
      // which routes the user to the home screen for their role.
    } catch (error) {
      notify(toUserMessage(error), 'error');
    }
  });

  /** Exchanges the typed code for a session. */
  const onVerify = async () => {
    setIsVerifying(true);
    try {
      await verifyCode(getValues('identifier'), code);
      navigate(routes.projects);
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.signIn')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}.{' '}
          <Link to={routes.signUp} className="font-medium text-primary underline underline-offset-2">
            {t('auth.signUp')}
          </Link>
        </>
      }
    >
      {awaitingCode ? (
        <div className="flex flex-col gap-4">
          <Input
            label={t('auth.otpLabel')}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button fullWidth size="lg" onClick={() => void onVerify()} isLoading={isVerifying}>
            {t('auth.verifyOtp')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAwaitingCode(false)}>
            {t('common.back')}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {/* A sign-in can succeed and still fail to load the membership that
              decides where to land. Saying so beats an inert screen. */}
          {authError && (
            <p role="alert" className="measure text-2xs text-status-delayed">
              {authError}
            </p>
          )}
          <Input
            label={usesPhone ? t('auth.phoneLabel') : t('auth.emailLabel')}
            type={usesPhone ? 'tel' : 'email'}
            inputMode={usesPhone ? 'numeric' : 'email'}
            autoComplete={usesPhone ? 'tel' : 'email'}
            error={formState.errors.identifier?.message}
            {...register('identifier')}
          />

          {!usesPhone && (
            <Input
              label={t('auth.passwordLabel')}
              type="password"
              autoComplete="current-password"
              error={formState.errors.password?.message}
              {...register('password')}
            />
          )}

          <Button type="submit" fullWidth size="lg" isLoading={formState.isSubmitting}>
            {usesPhone ? t('auth.sendOtp') : t('auth.signIn')}
          </Button>

          {!usesPhone && (
            <Link
              to={routes.forgotPassword}
              className="text-center text-2xs text-ink-muted underline underline-offset-2"
            >
              {t('auth.forgotPassword')}
            </Link>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
