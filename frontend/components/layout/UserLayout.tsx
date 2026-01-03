'use client';

import React from 'react';
import DashboardLayout from './DashboardLayout';
import UserSidebar from './UserSidebar';
import UserNavbar from './UserNavbar';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  return (
    <DashboardLayout
      renderSidebar={(props) => <UserSidebar {...props} />}
      renderNavbar={(props) => <UserNavbar {...props} />}
    >
      {children}
    </DashboardLayout>
  );
}

