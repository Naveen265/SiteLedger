import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { routes } from '@/config/routes';

/**
 * The project switcher in the office header.
 * The selection persists per user and is validated against access on load, so
 * a user who loses a project does not land on an empty screen.
 */
export function ProjectSwitcher() {
  const { activeProjects, currentProject, setCurrentProjectId, isLoading } = useProject();
  const t = useTranslate();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the menu on Escape or a click outside it.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (isLoading) return <Skeleton className="h-9 w-52" />;
  if (activeProjects.length === 0) return null;

  /** Switches project and lands on that project's dashboard. */
  const select = (projectId: string) => {
    setCurrentProjectId(projectId);
    setIsOpen(false);
    navigate(routes.projectDashboard(projectId));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('projects.switcher')}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex h-9 min-w-48 max-w-64 items-center gap-2 rounded-[var(--radius-control)]',
          'border border-border bg-surface px-2.5 text-xs text-ink hover:bg-surface-subtle',
        )}
      >
        <span className="truncate font-medium">
          {currentProject?.name ?? t('common.selectPlaceholder')}
        </span>
        <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-ink-faint" aria-hidden />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className={cn(
            'absolute left-0 top-full z-40 mt-1 max-h-80 w-72 overflow-y-auto',
            'rounded-[var(--radius-card)] border border-border bg-surface py-1',
            'shadow-[var(--shadow-overlay)]',
          )}
        >
          {activeProjects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                role="option"
                aria-selected={project.id === currentProject?.id}
                onClick={() => select(project.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-surface-subtle"
              >
                <Check
                  className={cn(
                    'size-3.5 shrink-0',
                    project.id === currentProject?.id ? 'text-primary' : 'invisible',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {project.code && <span className="shrink-0 text-2xs text-ink-faint">{project.code}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
