import { Menu, Moon, Sun, Search, LogOut } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../auth/AuthProvider';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-2 text-fg-muted hover:bg-surface-3 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <input
          placeholder="Rechercher…"
          className="h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none placeholder:text-fg-muted focus:border-brand-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-fg-muted hover:bg-surface-3"
          aria-label="Changer de thème"
        >
          {theme === 'dark' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            {(user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <span className="hidden text-sm text-fg-muted sm:block">
            {user?.email}
          </span>
        </div>

        <button
          onClick={signOut}
          className="rounded-lg p-2 text-fg-muted hover:bg-surface-3"
          aria-label="Déconnexion"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
