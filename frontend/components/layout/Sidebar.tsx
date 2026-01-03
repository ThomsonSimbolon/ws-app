'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar Component
 * 
 * Responsive navigation sidebar with breakpoint-specific behaviors.
 * 
 * Layout Responsibility:
 * - Handles layout composition and responsive behavior
 * - Manages UI-only state (sidebar open/close on mobile)
 * - Does NOT access Redux (state is LOCAL)
 * - Does NOT contain business logic
 * 
 * Responsive Behavior (using standard Tailwind breakpoints):
 * - Mobile/Tablet (<1280px): Off-canvas drawer, 75% width, icons + text always visible
 * - Desktop (≥1280px): Fixed sidebar, toggleable between expanded (240px) and collapsed (64px)
 *   - Expanded: 240px width, icons + text visible
 *   - Collapsed: 64px width, icons only (text hidden via CSS)
 * 
 * UX Enhancements:
 * - Close button (×) in mobile header for explicit affordance
 * - Click overlay to close (mobile/tablet only)
 * - Auto-close on menu item click (mobile/tablet only)
 * - Smooth 200-300ms animation (ease-out)
 */

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: 'Devices',
    href: '/admin/devices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Messages',
    href: '/admin/messages',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: 'Groups',
    href: '/admin/groups',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: 'Contacts',
    href: '/admin/contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Jobs',
    href: '/admin/jobs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay - Fades in/out smoothly with sidebar */}
      <div
        className={`
          fixed inset-0 bg-black z-40 xl:hidden
          transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-label="Close sidebar"
      />

      {/* Sidebar - Smooth slide animation from left */}
      {/* Mobile/Tablet (<1280px): Slides in from left (75% width), always shows icons + text */}
      {/* Desktop (>=1280px): Fixed position, toggleable width (240px expanded / 64px collapsed) */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-card border-r border-border z-50
          transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
          will-change-[width,transform]
          w-[75%] max-w-xs
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:translate-x-0
          ${isCollapsed ? 'xl:w-16' : 'xl:w-60'}
        `}
      >
        {/* Header with Logo + Close Button (Mobile Only) */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-divider">
          {/* Logo/Brand */}
          <div className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'xl:justify-center xl:gap-0' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">AD</span>
            </div>
            {/* Text label: visible on mobile/tablet, hidden on desktop when collapsed with fade animation */}
            <span className={`font-semibold text-text-primary whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[opacity,width] ${isCollapsed ? 'xl:opacity-0 xl:w-0 xl:overflow-hidden xl:delay-0' : 'xl:opacity-100 xl:w-auto xl:delay-200'}`}>
              Admin
            </span>
          </div>

          {/* Close Button - Only visible on mobile/tablet */}
          <button
            onClick={onClose}
            className="xl:hidden p-1.5 rounded-lg hover:bg-elevated transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  // Auto-close mobile/tablet drawer on navigation
                  // Desktop sidebar remains open
                  onClose();
                }}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg
                  transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
                  ${isCollapsed ? 'xl:justify-center xl:gap-0' : 'gap-3'}
                  ${
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
                  }
                `}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {/* Text label: visible on mobile/tablet, hidden on desktop when collapsed with fade animation */}
                <span className={`font-medium whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[opacity,width] ${isCollapsed ? 'xl:opacity-0 xl:w-0 xl:overflow-hidden xl:delay-0' : 'xl:opacity-100 xl:w-auto xl:delay-200'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
