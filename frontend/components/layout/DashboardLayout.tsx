'use client';

import React, { useState, ReactNode } from 'react';

/**
 * Base DashboardLayout Component
 * 
 * Reusable base layout that accepts sidebar and navbar as render functions.
 * This allows different layouts (Admin/User) to use different sidebars and navbars.
 * 
 * Layout Responsibility:
 * - Handles layout composition ONLY
 * - Manages UI-only state (sidebar open/close on mobile)
 * - Does NOT access Redux
 * - Does NOT contain business logic
 * - All data flows via children or props
 * 
 * Structure:
 * - Fixed sidebar (responsive) - passed as render function
 * - Top navbar - passed as render function
 * - Main content area (scrollable)
 * 
 * CRITICAL: Sidebar width offsets prevent layout shift
 * - Mobile/Tablet (<1280px): ml-0 (sidebar is drawer, no offset)
 * - Desktop (>=1280px): ml-60 (240px expanded) or ml-16 (64px collapsed)
 */

interface DashboardLayoutProps {
  children: ReactNode;
  renderSidebar: (props: { isOpen: boolean; isCollapsed: boolean; onClose: () => void }) => ReactNode;
  renderNavbar: (props: { onMenuClick: () => void; isCollapsed: boolean; onToggleCollapse: () => void }) => ReactNode;
}

export default function DashboardLayout({ children, renderSidebar, renderNavbar }: DashboardLayoutProps) {
  // UI-only state: Sidebar open/close for mobile (LOCAL state, NOT Redux)
  // Initialized to false for consistent SSR/client rendering
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // UI-only state: Desktop sidebar collapse (LOCAL state, NOT Redux)
  // Only applies on desktop (≥xl breakpoint), mobile/tablet always use drawer
  // Initialized to false for consistent SSR/client rendering
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Always render, state is consistent between SSR and client */}
      {renderSidebar({
        isOpen: isSidebarOpen,
        isCollapsed: isCollapsed,
        onClose: () => setIsSidebarOpen(false),
      })}

      {/* Main Content Area - Account for sidebar width to prevent layout shift */}
      {/* Mobile: no offset (sidebar is drawer) */}
      {/* Tablet: no offset (sidebar is drawer) */}
      {/* Desktop: 240px offset (expanded) or 64px offset (collapsed) */}
      <div className={`flex-1 flex flex-col ml-0 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[margin-left] ${isCollapsed ? 'xl:ml-16' : 'xl:ml-60'}`}>
        {/* Navbar - Always render, state is consistent between SSR and client */}
        {renderNavbar({
          onMenuClick: () => setIsSidebarOpen(true),
          isCollapsed: isCollapsed,
          onToggleCollapse: () => setIsCollapsed(!isCollapsed),
        })}

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-app p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
