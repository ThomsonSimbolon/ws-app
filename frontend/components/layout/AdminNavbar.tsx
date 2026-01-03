'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ToggleTheme from '@/components/ui/ToggleTheme';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { logout } from '@/store/slices/authSlice';

interface AdminNavbarProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AdminNavbar({ onMenuClick, isCollapsed, onToggleCollapse }: AdminNavbarProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const user = useAppSelector((state) => state.auth.user);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setIsProfileOpen(false);
    router.push('/auth/login');
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left: Logo + Mobile Menu Toggle + Desktop Collapse Toggle */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMenuClick}
          className="xl:hidden p-2 rounded-lg hover:bg-elevated transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden xl:flex p-2 rounded-lg hover:bg-elevated transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>

        {/* App Name */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">
            <span className="md:hidden">Admin</span>
            <span className="hidden md:inline">Admin Dashboard</span>
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <ToggleTheme />

        {/* Notification Icon */}
        <button
          className="relative p-2 rounded-lg hover:bg-elevated transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-elevated transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-semibold" suppressHydrationWarning>
                {mounted ? (user?.fullName || user?.username || 'U')?.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text-primary" suppressHydrationWarning>
                {mounted ? (user?.fullName || user?.username || 'User') : 'User'}
              </p>
              <p className="text-xs text-text-muted capitalize" suppressHydrationWarning>
                {mounted ? (user?.role || 'Role') : 'Role'}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-text-muted transition-transform ${
                isProfileOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-20">
                <div className="p-3 border-b border-divider">
                  <p className="text-sm font-medium text-text-primary">
                    {mounted ? (user?.fullName || user?.username || 'User') : 'User'}
                  </p>
                  <p className="text-xs text-text-muted">{mounted ? (user?.email || '') : ''}</p>
                </div>
                <div className="py-2">
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
                  >
                    Profile
                  </a>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
                  >
                    Settings
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-soft transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

