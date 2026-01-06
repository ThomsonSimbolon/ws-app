'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import UserStatsCard from '@/components/user/UserStatsCard';
import DeviceCard from '@/components/user/DeviceCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SkeletonCard from '@/components/ui/SkeletonCard';
import UsageInsights from '@/components/dashboard/UsageInsights';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchUserDashboardData } from '@/store/slices/userDashboardSlice';

export default function UserDashboard() {
  const dispatch = useAppDispatch();
  
  const {
    devices,
    connectedDevices,
    recentChats,
    totalDevices,
    connectedDevicesCount,
    isLoading,
    isLoadingDevices,
    isLoadingChats,
    error,
    devicesError,
    chatsError,
  } = useAppSelector((state) => state.userDashboard);

  useEffect(() => {
    dispatch(fetchUserDashboardData());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Overview of your WhatsApp devices and activity</p>
      </div>

      {/* Error Messages */}
      {(error || devicesError || chatsError) && (
        <div className="bg-danger-soft border border-danger rounded-lg p-4">
          <p className="text-sm text-danger">
            {error || devicesError || chatsError}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <UserStatsCard
              label="Total Devices"
              value={totalDevices}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
            <UserStatsCard
              label="Connected Devices"
              value={connectedDevicesCount}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <UserStatsCard
              label="Messages Today"
              value={0}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <UserStatsCard
              label="Recent Chats"
              value={recentChats.length}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <Link href="/send-message">
          <Button variant="primary">
            Send Message
          </Button>
        </Link>
        <Link href="/devices">
          <Button variant="outline">
            View All Devices
          </Button>
        </Link>
      </div>

      {/* Devices Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">My Devices</h2>
          <Link href="/devices">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
        {isLoadingDevices ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : devices.length === 0 ? (
          <Card padding="md">
            <div className="text-center py-12">
              <p className="text-text-muted mb-4">No devices found</p>
              <p className="text-sm text-text-secondary">Contact admin to add a device</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {devices.slice(0, 6).map((device) => (
              <DeviceCard 
                key={device.deviceId} 
                device={device} 
                onDeviceUpdate={() => {
                  // Refresh dashboard data when device status changes
                  dispatch(fetchUserDashboardData());
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Chats */}
      {recentChats.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Recent Chats</h2>
            <Link href="/chat-history">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          {isLoadingChats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recentChats.map((chat, index) => (
                <Link
                  key={chat.jid}
                  href={`/chat-history?jid=${chat.jid}`}
                  className="block p-3 rounded-lg hover:bg-elevated transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-primary font-medium">
                        {chat.name || chat.phoneNumber || chat.jid}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-sm text-text-muted truncate max-w-md">
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-text-muted">
                        {new Date(chat.lastMessageTime).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Usage Insights */}
      <UsageInsights />
    </div>
  );
}

