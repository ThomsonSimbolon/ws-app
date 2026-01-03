'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchConnectedDevices, fetchUserDevices } from '@/store/slices/userDashboardSlice';
import { getDailyChatList, DailyChat } from '@/lib/userService';
import { ApiError } from '@/lib/api';

function ActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { connectedDevices, isLoadingDevices } = useAppSelector((state) => state.userDashboard);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [chats, setChats] = useState<DailyChat[]>([]);
  const [displayedChats, setDisplayedChats] = useState<DailyChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== 'user') {
      router.push('/dashboard');
      return;
    }

    dispatch(fetchUserDevices());
    dispatch(fetchConnectedDevices());

    const deviceId = searchParams.get('deviceId');
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    }
  }, [mounted, isAuthenticated, user, router, dispatch, searchParams]);

  const loadChats = useCallback(async () => {
    if (!selectedDeviceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getDailyChatList(selectedDeviceId, selectedDate);
      const allChats = response.chats || [];
      // Filter out groups - only show contact chats
      const contactChats = allChats.filter((chat) => !chat.isGroup);
      setChats(contactChats);
      setDisplayedChats(contactChats.slice(0, ITEMS_PER_PAGE));
      setPage(1);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 403) {
        setError('You do not have permission to access this device.');
      } else {
        setError(apiError.message || 'Failed to load activity');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId, selectedDate]);

  useEffect(() => {
    if (selectedDeviceId) {
      loadChats();
    }
  }, [selectedDeviceId, selectedDate, loadChats]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    setDisplayedChats(chats.slice(0, endIndex));
    setPage(nextPage);
  };

  const handleChatClick = (chat: DailyChat) => {
    router.push(`/chat-history?jid=${encodeURIComponent(chat.jid)}&deviceId=${selectedDeviceId}`);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!mounted) return null;
  if (!user || user.role !== 'user') return null;

  const hasMore = displayedChats.length < chats.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Activity</h1>
        <p className="text-text-secondary">View your daily WhatsApp chat activity</p>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger rounded-lg p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <Card padding="md">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Device Selector */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Select Device
            </label>
            {isLoadingDevices ? (
              <div className="animate-pulse h-10 bg-elevated rounded-lg" />
            ) : connectedDevices.length === 0 ? (
              <div className="p-4 bg-warning-soft border border-warning rounded-lg">
                <p className="text-sm text-warning">
                  No connected devices available.
                </p>
              </div>
            ) : (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setChats([]);
                  setDisplayedChats([]);
                }}
                className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
              >
                <option value="">Select a device</option>
                {connectedDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.deviceName} {device.phoneNumber ? `(${device.phoneNumber})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
            />
          </div>
        </div>

        {/* Activity List */}
        {selectedDeviceId && (
          <div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse h-20 bg-elevated rounded-lg" />
                ))}
              </div>
            ) : displayedChats.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-text-muted opacity-50 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-text-muted">No chat activity found for this date</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-muted mb-4">
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''} on {new Date(selectedDate).toLocaleDateString()}
                </p>
                <div className="space-y-2">
                  {displayedChats.map((chat, index) => (
                    <button
                      key={chat.jid || index}
                      onClick={() => handleChatClick(chat)}
                      className="w-full text-left p-4 rounded-lg bg-elevated hover:bg-primary-soft transition-colors flex items-center gap-4"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-lg">
                          {(chat.name || chat.phoneNumber || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-text-primary truncate">
                            {chat.name || chat.phoneNumber || chat.jid}
                          </p>
                          {chat.lastMessageTime && (
                            <span className="text-xs text-text-muted flex-shrink-0 ml-2">
                              {formatTime(chat.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-sm text-text-muted truncate">
                            {chat.lastMessage}
                          </p>
                        )}
                      </div>
                      {/* Unread Badge */}
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-white font-medium">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        </div>
                      )}
                      {/* Arrow */}
                      <svg
                        className="w-5 h-5 text-text-muted flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <Button variant="ghost" onClick={handleLoadMore}>
                      Load More ({chats.length - displayedChats.length} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function ActivityFallback() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Activity</h1>
        <p className="text-text-secondary">View your daily WhatsApp chat activity</p>
      </div>
      <Card padding="md">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-10 bg-elevated rounded-lg" />
            <div className="h-10 bg-elevated rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-elevated rounded-lg" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <UserLayout>
      <Suspense fallback={<ActivityFallback />}>
        <ActivityContent />
      </Suspense>
    </UserLayout>
  );
}
