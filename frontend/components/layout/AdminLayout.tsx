'use client';

import React from 'react';
import DashboardLayout from './DashboardLayout';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <DashboardLayout
      renderSidebar={(props) => <AdminSidebar {...props} />}
      renderNavbar={(props) => <AdminNavbar {...props} />}
    >
      {children}
    </DashboardLayout>
  );
}

