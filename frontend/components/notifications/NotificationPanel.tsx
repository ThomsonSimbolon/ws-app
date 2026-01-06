'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAll,
  NotificationType,
  NotificationPriority,
} from '@/store/slices/notificationSlice';

// Icon mappings
const TYPE_ICONS: Record<NotificationType, string> = {
  device_connected: '🟢',
  device_disconnected: '🔴',
  qr_required: '📱',
  message_sent: '✅',
  message_failed: '❌',
  scheduled_sent: '⏰✅',
  scheduled_failed: '⏰❌',
  session_expired: '🔒',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
};

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  info: 'border-l-primary',
  warning: 'border-l-warning',
  error: 'border-l-danger',
  action: 'border-l-info',
};

export default function NotificationPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { 
    notifications, 
    unreadCount, 
    hasErrorNotifications,
    isSSEConnected 
  } = useSelector((state: RootState) => state.notifications);

  // Filter non-dismissed notifications
  const visibleNotifications = notifications.filter(n => !n.dismissed);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark as read when opening panel
  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      dispatch(markAllAsRead());
    }
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(dismissNotification(id));
  };

  const handleDismissAll = () => {
    dispatch(dismissAll());
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Icon */}
      <button
        onClick={togglePanel}
        className="relative p-2 rounded-lg hover:bg-elevated transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6 text-text-secondary hover:text-text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span 
            className={`
              absolute -top-1 -right-1 min-w-[18px] h-[18px] 
              flex items-center justify-center 
              text-xs font-bold text-white rounded-full px-1
              ${hasErrorNotifications ? 'bg-danger' : 'bg-primary'}
            `}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* SSE Status Indicator */}
        <span 
          className={`
            absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background
            ${isSSEConnected ? 'bg-success' : 'bg-text-secondary'}
          `}
          title={isSSEConnected ? 'Connected' : 'Disconnected'}
        />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-elevated">
            <h3 className="font-semibold text-text-primary">Notifications</h3>
            <div className="flex items-center gap-2">
              {visibleNotifications.length > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="text-xs text-text-secondary hover:text-danger transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <div className="text-3xl mb-2">🔔</div>
                <p>No notifications</p>
              </div>
            ) : (
              visibleNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`
                    p-3 border-b border-border last:border-b-0 border-l-4
                    ${PRIORITY_STYLES[notification.priority]}
                    ${!notification.read ? 'bg-primary-soft/30' : 'hover:bg-elevated/50'}
                    transition-colors cursor-pointer
                  `}
                  onClick={() => dispatch(markAsRead(notification.id))}
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <span className="text-lg" role="img" aria-label={notification.type}>
                      {TYPE_ICONS[notification.type]}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm text-text-primary truncate">
                          {notification.title}
                        </h4>
                        <button
                          onClick={(e) => handleDismiss(notification.id, e)}
                          className="text-text-secondary hover:text-danger transition-colors shrink-0"
                          aria-label="Dismiss"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {notification.deviceName && (
                          <span className="text-xs bg-elevated px-1.5 py-0.5 rounded">
                            {notification.deviceName}
                          </span>
                        )}
                        <span className="text-xs text-text-secondary">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {visibleNotifications.length > 5 && (
            <div className="p-2 border-t border-border bg-elevated text-center">
              <span className="text-xs text-text-secondary">
                Showing {visibleNotifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
