'use client';

import React from 'react';
import Link from 'next/link';
import DashboardLayout from './DashboardLayout';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import BotEventsListener from '../bot/BotEventsListener';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <DashboardLayout
      renderSidebar={(props) => <AdminSidebar {...props} />}
      renderNavbar={(props) => <AdminNavbar {...props} />}
    >
      <BotEventsListener />
      {children}
    </DashboardLayout>
  );
}

