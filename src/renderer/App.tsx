import { useEffect, useState } from 'react';
import type { AppInfo } from '@shared/types/ipc';
import { api } from './lib/api';
import CategoriesScreen from './features/categories/CategoriesScreen';
import PosScreen from './features/pos/PosScreen';
import ProductsScreen from './features/products/ProductsScreen';
import ReportsScreen from './features/reports/ReportsScreen';
import SettingsScreen from './features/settings/SettingsScreen';

type Screen = 'pos' | 'categories' | 'products' | 'reports' | 'settings';

interface NavItem {
  id: Screen;
  label: string;
  enabled: boolean;
}

/**
 * Navigation is enabled module by module as features are delivered.
 */
const NAV_ITEMS: NavItem[] = [
  { id: 'pos', label: 'Point of Sale', enabled: true },
  { id: 'categories', label: 'Categories', enabled: true },
  { id: 'products', label: 'Products', enabled: true },
  { id: 'reports', label: 'Reports', enabled: true },
  { id: 'settings', label: 'Settings', enabled: true }
];

const SCREEN_TITLES: Record<Screen, string> = {
  pos: 'Point of Sale',
  categories: 'Categories',
  products: 'Products',
  reports: 'Reports',
  settings: 'Settings'
};

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>('pos');
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.app
      .getInfo()
      .then((appInfo) => {
        if (!cancelled) setInfo(appInfo);
      })
      .catch(() => {
        // Version label simply keeps its placeholder.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex h-screen bg-base text-gray-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-edge bg-panel">
        <div className="flex h-16 items-center border-b border-edge px-5">
          <span className="text-xl font-bold tracking-tight">
            Mana<span className="text-accent">POS</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.enabled}
                onClick={() => setScreen(item.id)}
                className={
                  'w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ' +
                  (!item.enabled
                    ? 'cursor-not-allowed text-muted opacity-50'
                    : isActive
                      ? 'bg-accent-muted text-accent'
                      : 'text-muted hover:bg-panel-hover hover:text-gray-100')
                }
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-edge px-5 py-4 text-xs text-muted">
          Version {info?.version ?? '…'}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge bg-panel px-6">
          <h1 className="text-lg font-semibold">{SCREEN_TITLES[screen]}</h1>
          <span className="text-sm text-muted">{today}</span>
        </header>

        {screen === 'pos' && <PosScreen />}
        {screen === 'categories' && <CategoriesScreen />}
        {screen === 'products' && <ProductsScreen />}
        {screen === 'reports' && <ReportsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </div>
    </div>
  );
}
