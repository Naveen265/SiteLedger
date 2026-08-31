import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader } from '@/components/ui/Card';
import { useTranslate } from '@/contexts/I18nContext';
import { routes } from '@/config/routes';
import { useProject } from '@/contexts/ProjectContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useWorkers } from '@/modules/labour/hooks/useLabour';
import { useMaterialItems } from '@/modules/materials/hooks/useMaterials';
import { useAssets } from '@/modules/equipment/hooks/useEquipment';

/**
 * The empty state of the company view for a brand new tenant.
 * Five concrete steps, each of which completes itself as the data appears, so
 * an owner is never looking at an empty dashboard wondering what to do.
 */
export function OnboardingChecklist() {
  const t = useTranslate();
  const { projects } = useProject();
  const { activeMembers } = useCompany();
  const workersQuery = useWorkers();
  const materialsQuery = useMaterialItems();
  const assetsQuery = useAssets();

  const steps = [
    { labelKey: 'company.stepProject', isDone: projects.length > 0, to: routes.projects },
    { labelKey: 'company.stepTeam', isDone: activeMembers.length > 1, to: routes.companyUsers },
    {
      labelKey: 'company.stepWorkers',
      isDone: (workersQuery.data ?? []).length > 0,
      to: projects[0] ? routes.labour(projects[0].id) : routes.projects,
    },
    {
      labelKey: 'company.stepMaterials',
      isDone: (materialsQuery.data ?? []).length > 0,
      to: projects[0] ? routes.materials(projects[0].id) : routes.projects,
    },
    {
      labelKey: 'company.stepEquipment',
      isDone: (assetsQuery.data ?? []).length > 0,
      to: projects[0] ? routes.equipment(projects[0].id) : routes.projects,
    },
  ];

  const doneCount = steps.filter((step) => step.isDone).length;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader
        title={t('company.onboardingTitle')}
        subtitle={t('company.onboardingSubtitle')}
        actions={
          <span className="tabular text-2xs text-ink-muted">
            {doneCount} {t('common.of')} {steps.length}
          </span>
        }
      />

      <ol className="divide-y divide-border">
        {steps.map((step) => (
          <li key={step.labelKey}>
            <Link
              to={step.to}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-subtle"
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border',
                  step.isDone
                    ? 'border-status-ontrack bg-status-ontrack text-white'
                    : 'border-border-strong text-ink-faint',
                )}
              >
                {step.isDone && <Check className="size-3.5" aria-hidden />}
              </span>
              <span
                className={cn(
                  'flex-1 text-xs',
                  step.isDone ? 'text-ink-muted line-through' : 'font-medium text-ink',
                )}
              >
                {t(step.labelKey)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
