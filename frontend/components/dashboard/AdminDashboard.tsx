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
import DeviceMonitoring from '../admin/DeviceMonitoring';
import JobManager from '../admin/JobManager';
import AuditLogViewer from '../admin/AuditLogViewer';
import UserManagement from '../admin/UserManagement';
import DataExport from '../admin/DataExport';

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = React.useState('overview');
  
  const {
    globalStats,
    stats,
    recentUsers,
    recentDevices,
    recentMessages,
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 fade-in">
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
      case 'devices':
        return <div className="fade-in"><DeviceMonitoring /></div>;
      case 'users':
        return <div className="fade-in"><UserManagement /></div>;
      case 'jobs':
        return <div className="fade-in"><JobManager /></div>;
      case 'audit':
        return <div className="fade-in"><AuditLogViewer /></div>;
      case 'export':
        return <div className="fade-in"><DataExport /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">System Control Center</h1>
          <p className="text-text-secondary">Operational dashboard for system management</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-elevated rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'devices', label: 'Device Monitor' },
            { id: 'users', label: 'User Mgmt' },
            { id: 'jobs', label: 'Job Queue' },
            { id: 'audit', label: 'Audit Logs' },
            { id: 'export', label: 'Export' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Messages */}
      {(error || statsError || usersError || devicesError || messagesError) && (
        <div className="bg-danger-soft border border-danger rounded-lg p-4">
          <p className="text-sm text-danger">
            {error || statsError || usersError || devicesError || messagesError}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[500px]">
        {renderTabContent()}
      </div>
    </div>
  );
}

