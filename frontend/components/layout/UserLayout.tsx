'use client';

import React from 'react';
import Link from 'next/link';
import DashboardLayout from './DashboardLayout';
import UserSidebar from './UserSidebar';
import UserNavbar from './UserNavbar';
import BotEventsListener from '../bot/BotEventsListener';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  return (
    <DashboardLayout
      renderSidebar={(props) => <UserSidebar {...props} />}
      renderNavbar={(props) => <UserNavbar {...props} />}
    >
      <BotEventsListener />
      {children}
    </DashboardLayout>
  );
}

