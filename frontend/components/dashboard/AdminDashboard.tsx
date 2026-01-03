'use client';

import React, { useEffect } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import DeviceStatusChart from '@/components/dashboard/DeviceStatusChart';
import MessageStatusChart from '@/components/dashboard/MessageStatusChart';
import RecentUsersList from '@/components/dashboard/RecentUsersList';
import RecentDevicesList from '@/components/dashboard/RecentDevicesList';
import RecentMessagesList from '@/components/dashboard/RecentMessagesList';
import SkeletonCard from '@/components/ui/SkeletonCard';
import SkeletonChart from '@/components/ui/SkeletonChart';
import Card from '@/components/ui/Card';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchDashboardData } from '@/store/slices/dashboardSlice';

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  
  const {
    globalStats,
    stats,
    recentUsers,
    recentDevices,
    recentMessages,
    isLoading,
    isLoadingStats,
    isLoadingUsers,
    isLoadingDevices,
    isLoadingMessages,
    error,
    statsError,
    usersError,
    devicesError,
    messagesError,
  } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary">Overview of your WhatsApp service platform</p>
      </div>

      {/* Error Messages */}
      {(error || statsError || usersError || devicesError || messagesError) && (
        <div className="bg-danger-soft border border-danger rounded-lg p-4">
          <p className="text-sm text-danger">
            {error || statsError || usersError || devicesError || messagesError}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoadingStats ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          stats.map((stat, index) => (
            <div key={stat.id} className={`fade-in stagger-${index + 1}`}>
              <StatsCard
                label={stat.label}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
              />
            </div>
          ))
        )}
      </div>

      {/* Activity Last 24 Hours */}
      {globalStats && (
        <Card padding="md">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Activity Last 24 Hours</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-muted mb-1">Messages</p>
              <p className="text-2xl font-bold text-text-primary">
                {globalStats.activity.last24Hours.messages}
              </p>
            </div>
            <div className="bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-muted mb-1">New Users</p>
              <p className="text-2xl font-bold text-text-primary">
                {globalStats.activity.last24Hours.newUsers}
              </p>
            </div>
            <div className="bg-elevated rounded-lg p-4">
              <p className="text-sm text-text-muted mb-1">New Devices</p>
              <p className="text-2xl font-bold text-text-primary">
                {globalStats.activity.last24Hours.newDevices}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoadingStats ? (
          <>
            <SkeletonChart title="Device Status" height="300px" />
            <SkeletonChart title="Message Status" height="300px" />
          </>
        ) : (
          <>
            <DeviceStatusChart
              data={globalStats?.devices.statusDistribution || []}
              className="fade-in"
            />
            <MessageStatusChart
              data={globalStats?.messages.statusDistribution || []}
              className="fade-in"
            />
          </>
        )}
      </div>

      {/* Recent Activity Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RecentUsersList
          users={recentUsers}
          isLoading={isLoadingUsers}
          className="fade-in"
        />
        <RecentDevicesList
          devices={recentDevices}
          isLoading={isLoadingDevices}
          className="fade-in"
        />
        <RecentMessagesList
          messages={recentMessages}
          isLoading={isLoadingMessages}
          className="fade-in"
        />
      </div>
    </div>
  );
}

