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
    <nav className="bg-[#2b3544] text-white sticky top-0 z-50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center h-11">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mr-6 shrink-0">
            <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center text-white text-xs font-extrabold">
              M
            </div>
          </Link>

          {/* Nav items */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            {allItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.to === '/'
                ? pathname === '/'
                : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-800">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-300 max-w-[140px] truncate">
                  {user.name || user.email}
                </span>
                {isAdmin && (
                  <Shield size={12} className="text-amber-400" />
                )}
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-nav / breadcrumb bar */}
      <div className="bg-[#f5f6f8] border-b border-gray-200 px-4 sm:px-6">
        <div className="flex items-center h-9 gap-3 text-xs overflow-x-auto">
          {allItems.map((item) => {
            const isActive = item.to === '/'
              ? pathname === '/'
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1 px-2 py-1 rounded whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-indigo-600 font-semibold bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
