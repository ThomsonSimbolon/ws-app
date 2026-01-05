'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserLayout from '@/components/layout/UserLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { fetchUserDevices, fetchConnectedDevices } from '@/store/slices/userDashboardSlice';
import { getDailyChatList, getChatHistory, DailyChat, ChatMessage } from '@/lib/userService';
import { ApiError } from '@/lib/api';
import MessageBubble from '@/components/chat-history/MessageBubble';

export default function ChatHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  const { connectedDevices, isLoadingDevices } = useAppSelector((state) => state.userDashboard);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedJid, setSelectedJid] = useState<string>('');
  const [chats, setChats] = useState<DailyChat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    // Get jid and deviceId from query params if available
    const jid = searchParams.get('jid');
    const deviceId = searchParams.get('deviceId');
    if (jid) {
      setSelectedJid(jid);
    }
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    }
  }, [isAuthenticated, user, router, dispatch, searchParams]);

  useEffect(() => {
    if (selectedDeviceId) {
      loadChats();
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    if (selectedDeviceId && selectedJid) {
      loadMessages();
    }
  }, [selectedDeviceId, selectedJid]);

  const loadChats = async () => {
    if (!selectedDeviceId) return;

    setIsLoadingChats(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await getDailyChatList(selectedDeviceId, today);
      setChats(response.chats || []);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load chats');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedDeviceId || !selectedJid) return;

    setIsLoadingMessages(true);
    setError(null);

    try {
      const response = await getChatHistory(selectedDeviceId, selectedJid, 50);
      setMessages(response.messages);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  if (!user || user.role !== 'user') {
    return null;
  }

  // connectedDevices now comes directly from Redux state (via fetchConnectedDevices)
  // which has real-time status from the backend

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Chat History</h1>
          <p className="text-text-secondary">View your WhatsApp chat history</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chat List */}
          <div className="xl:col-span-1">
            <Card padding="md">
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Select Device
                </label>
                {isLoadingDevices ? (
                  <div className="animate-pulse h-10 bg-elevated rounded-lg" />
                ) : connectedDevices.length === 0 ? (
                  <div className="p-4 bg-warning-soft border border-warning rounded-lg">
                    <p className="text-sm text-warning">No connected devices available</p>
                  </div>
                ) : (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      setSelectedJid('');
                      setMessages([]);
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

              {/* Chat List */}
              {selectedDeviceId && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Chats</h3>
                  {isLoadingChats ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse h-16 bg-elevated rounded-lg" />
                      ))}
                    </div>
                  ) : chats.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-8">No chats found</p>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {chats.map((chat, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedJid(chat.jid)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedJid === chat.jid
                              ? 'bg-primary-soft text-primary'
                              : 'hover:bg-elevated text-text-primary'
                          }`}
                        >
                          <p className="font-medium">
                            {chat.name || chat.phoneNumber || chat.jid}
                          </p>
                          {chat.lastMessage && (
                            <p className="text-xs text-text-muted truncate mt-1">
                              {chat.lastMessage}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Messages */}
          <div className="xl:col-span-2">
            <Card padding="md">
              {!selectedJid ? (
                <div className="text-center py-12">
                  <p className="text-text-muted">Select a chat to view messages</p>
                </div>
              ) : isLoadingMessages ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse h-20 bg-elevated rounded-lg" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted">No messages found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {messages.map((msg, index) => (
                    <MessageBubble 
                      key={msg.id || index} 
                      message={msg} 
                      deviceId={selectedDeviceId}
                      onRetrySuccess={() => loadMessages()} // Reload to check if new message appears
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

