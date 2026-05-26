import { Link, useLocation } from 'react-router-dom';
import { FileSearch, History, Users, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Resume Filter', icon: FileSearch },
  { to: '/history', label: 'History', icon: History },
];

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Users', icon: Users },
];

const UTIL_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const allItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? ADMIN_ITEMS : []),
    ...UTIL_ITEMS,
  ];

  return (
    <nav className="sticky top-0 z-50">
      {/* Primary dark bar — branding + user only */}
      <div style={{ background: 'linear-gradient(to right, var(--color-ocean-800), var(--color-ocean-900))' }} className="text-white px-4 sm:px-6">
        <div className="flex items-center" style={{ height: '44px' }}>
          {/* Logo + app name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="rounded flex items-center justify-center text-white text-xs font-extrabold"
              style={{ width: 28, height: 28, backgroundColor: 'var(--color-ocean-600)' }}
            >
              M
            </div>
            <span className="text-sm font-semibold text-white hidden sm:inline">HR Resume Filter</span>
          </Link>

          {/* Right side — user info + logout */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className="rounded-full flex items-center justify-center font-bold"
                  style={{
                    width: 24,
                    height: 24,
                    fontSize: '0.625rem',
                    backgroundColor: 'var(--color-warning-500)',
                    color: 'var(--color-ocean-900)',
                  }}
                >
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-300)' }} className="max-w-[160px] truncate">
                  {user.name || user.email}
                </span>
                {isAdmin && <Shield size={12} style={{ color: 'var(--color-warning-500)' }} />}
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2 py-1.5 rounded"
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-gray-400)',
                transition: `all var(--duration-normal) var(--ease-out)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-gray-400)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-nav — page navigation */}
      <div style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }} className="px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto" style={{ height: '38px', fontSize: '0.8125rem' }}>
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === '/'
              ? pathname === '/'
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded whitespace-nowrap"
                style={{
                  transition: `all var(--duration-normal) var(--ease-out)`,
                  color: isActive ? 'var(--color-ocean-700)' : 'var(--color-gray-500)',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? 'var(--color-ocean-50)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
                    e.currentTarget.style.color = 'var(--color-gray-700)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-gray-500)';
                  }
                }}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
