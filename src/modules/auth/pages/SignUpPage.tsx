import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpFormInput } from '@/lib/validation';
import { routes } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/supabase/errors';
import { AuthLayout } from '../components/AuthLayout';

/**
 * Sign up.
 * Creating an account also creates the company and makes the creator its
 * owner, which is done in one database function so the two cannot diverge.
 */
export function SignUpPage() {
  const t = useTranslate();
  const { signUp, refresh } = useAuth();
  const { notify } = useToast();

  const { register, handleSubmit, formState } = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: '', identifier: '', password: '', company_name: '' },
  });

  /** Creates the auth user, then the company, then makes the user its owner. */
  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp({
        identifier: values.identifier,
        password: values.password,
        fullName: values.full_name,
      });

      // create_company_with_owner runs as one transaction in Postgres, so a
      // half-created tenant is not a state the product can end up in.
      const { error } = await supabase.rpc('create_company_with_owner', {
        p_company_name: values.company_name,
        p_full_name: values.full_name,
      });
      if (error) throw error;

      await refresh();
      notify(t('common.saved'), 'success');
    } catch (error) {
      notify(toUserMessage(error), 'error');
    }
  });

  return (
    <AuthLayout
      title={t('auth.signUp')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}.{' '}
          <Link to={routes.signIn} className="font-medium text-primary underline underline-offset-2">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.fullNameLabel')}
          autoComplete="name"
          error={formState.errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label={t('auth.companyNameLabel')}
          autoComplete="organization"
          error={formState.errors.company_name?.message}
          {...register('company_name')}
        />
        <Input
          label={t('auth.emailLabel')}
          type="email"
          inputMode="email"
          autoComplete="email"
          error={formState.errors.identifier?.message}
          {...register('identifier')}
        />
        <Input
          label={t('auth.passwordLabel')}
          type="password"
          autoComplete="new-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" fullWidth size="lg" isLoading={formState.isSubmitting}>
          {t('auth.signUp')}
        </Button>
      </form>
    </AuthLayout>
  );
}
