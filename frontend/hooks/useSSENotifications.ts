'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  addNotification,
  setSSEConnected,
  updateHeartbeat,
  loadFromStorage,
  NotificationType,
  Notification,
} from '@/store/slices/notificationSlice';

const STORAGE_KEY = 'ws_notifications';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Map SSE event types to notification types
function mapEventType(type: string): NotificationType {
  const mapping: Record<string, NotificationType> = {
    'connected': 'info',
    'whatsapp-status': 'info',
    'device-connected': 'device_connected',
    'device-disconnected': 'device_disconnected',
    'qr-required': 'qr_required',
    'message-sent': 'message_sent',
    'message-failed': 'message_failed',
    'scheduled-sent': 'scheduled_sent',
    'scheduled-failed': 'scheduled_failed',
    'session-expired': 'session_expired',
    'error': 'error',
  };
  return mapping[type] || 'info';
}

// Generate notification title from event
function getNotificationTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    device_connected: 'Device Connected',
    device_disconnected: 'Device Disconnected',
    qr_required: 'QR Code Required',
    message_sent: 'Message Sent',
    message_failed: 'Message Failed',
    scheduled_sent: 'Scheduled Message Sent',
    scheduled_failed: 'Scheduled Message Failed',
    session_expired: 'Session Expired',
    info: 'Information',
    warning: 'Warning',
    error: 'Error',
  };
  return titles[type] || 'Notification';
}

export function useSSENotifications() {
  const dispatch = useDispatch<AppDispatch>();
  const { isSSEConnected } = useSelector((state: RootState) => state.notifications);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const notifications: Notification[] = JSON.parse(stored);
          // Only load non-dismissed notifications from last 7 days
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const valid = notifications.filter(n => {
            const timestamp = new Date(n.timestamp).getTime();
            return timestamp > sevenDaysAgo && !n.dismissed;
          });
          if (valid.length > 0) {
            dispatch(loadFromStorage(valid));
          }
        }
      } catch (error) {
        console.error('Failed to load notifications from storage:', error);
      }
    }
  }, [dispatch]);

  // Save notifications to localStorage when they change
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  useEffect(() => {
    if (typeof window !== 'undefined' && notifications.length > 0) {
      try {
        // Only save last 30 notifications
        const toSave = notifications.slice(0, 30);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.error('Failed to save notifications to storage:', error);
      }
    }
  }, [notifications]);

  // Handle SSE message
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle heartbeat
      if (data.type === 'heartbeat') {
        dispatch(updateHeartbeat(data.timestamp));
        return;
      }

      // Handle connection confirmation
      if (data.type === 'connected') {
        dispatch(setSSEConnected(true));
        reconnectAttempts.current = 0;
        return;
      }

      // Skip whatsapp-status updates (these are polling, not notifications)
      if (data.type === 'whatsapp-status') {
        return;
      }

      // Create notification from event
      const notificationType = mapEventType(data.type);
      const title = data.title || getNotificationTitle(notificationType);
      const body = data.body || data.message || `${data.type} event received`;

      dispatch(addNotification({
        type: notificationType,
        title,
        body,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        metadata: data.metadata,
        timestamp: data.timestamp || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  }, [dispatch]);

  // Connect to SSE
  const connect = useCallback(() => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!isAuthenticated || !token) {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
    const sseUrl = `${API_BASE_URL}/sse?token=${encodeURIComponent(token)}`;

    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        dispatch(setSSEConnected(true));
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = handleSSEMessage;

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        dispatch(setSSEConnected(false));
        eventSource.close();

        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current - 1);
          console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
    }
  }, [isAuthenticated, handleSSEMessage, dispatch]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    dispatch(setSSEConnected(false));
  }, [dispatch]);

  // Connect on auth change
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  return {
    isConnected: isSSEConnected,
    reconnect: connect,
    disconnect,
  };
}
