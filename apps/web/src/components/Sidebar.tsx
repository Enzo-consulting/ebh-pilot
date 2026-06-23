import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@ebh/ui';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/profitability', label: 'Rentabilité', icon: TrendingUp },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface-2',
          'transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              EBH Pilot
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-3 text-fg'
                    : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="rounded-lg bg-surface-3 p-3">
            <p className="text-xs font-medium text-fg">Plan Pro</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Actions IA illimitées
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
