import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorSchema, type VendorInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTranslate } from '@/contexts/I18nContext';
import { useCreateVendor } from '../hooks/useProcurement';

/** Adds a vendor. The GSTIN is captured so exported values are correct. */
export function VendorDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslate();
  const create = useCreateVendor();

  const { register, handleSubmit, reset, formState } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { name: '', gstin: '', contact_phone: '', contact_email: '', address: '' },
  });

  /** Saves the vendor and closes. */
  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync(values);
    reset();
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('procurement.addVendor')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void onSubmit()} isLoading={create.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input label={t('common.name')} required error={formState.errors.name?.message} {...register('name')} />
        <Input label={t('procurement.gstin')} hint={t('common.optional')} {...register('gstin')} />
        <Input label={t('common.phone')} type="tel" inputMode="numeric" {...register('contact_phone')} />
        <Input
          label={t('common.email')}
          type="email"
          error={formState.errors.contact_email?.message}
          {...register('contact_email')}
        />
        <Input label={t('projects.address')} {...register('address')} />
      </form>
    </Dialog>
  );
}
