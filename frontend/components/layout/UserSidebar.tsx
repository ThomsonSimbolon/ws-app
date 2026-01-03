'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserSidebarProps {
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
    name: 'My Devices',
    href: '/devices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: 'Send Message',
    href: '/send-message',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    name: 'Chat History',
    href: '/chat-history',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

export default function UserSidebar({ isOpen, isCollapsed, onClose }: UserSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`
          fixed inset-0 bg-black z-40 xl:hidden
          transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
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
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-divider">
          <div className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'xl:justify-center xl:gap-0' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">WA</span>
            </div>
            <span className={`font-semibold text-text-primary whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[opacity,width] ${isCollapsed ? 'xl:opacity-0 xl:w-0 xl:overflow-hidden xl:delay-0' : 'xl:opacity-100 xl:w-auto xl:delay-200'}`}>
              WhatsApp
            </span>
          </div>

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

