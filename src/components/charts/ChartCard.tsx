import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader } from '@/components/ui/Card';
import { Explain } from '@/components/patterns/InfoTip';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ErrorState } from '@/components/patterns/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslate } from '@/contexts/I18nContext';
import { CHART_REGISTRY, type ChartId } from './registry';

/**
 * The wrapper every chart in the product is rendered inside.
 * It pulls the title and the explain entry from the chart registry, which is
 * how the rule "no chart ships without its explanation" is actually enforced
 * rather than merely intended.
 */
export function ChartCard({
  chartId, isLoading, isError, onRetry, isEmpty, emptyMessage, height = 260, actions, children, className,
}: {
  chartId: ChartId;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslate();
  const definition = CHART_REGISTRY[chartId];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title={t(definition.titleKey)}
        adornment={<Explain name={definition.explain} />}
        actions={actions}
      />

      <div className="p-4">
        {isLoading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : isError ? (
          <ErrorState onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState message={emptyMessage ?? t('reports.empty')} />
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
