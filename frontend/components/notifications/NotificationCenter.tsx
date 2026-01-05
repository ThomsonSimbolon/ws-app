'use client';

import React, { useState, useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';
import Button from '@/components/ui/Button';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const { status } = useSSE(`${API_BASE_URL}/notifications/stream`, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        addNotification({
          id: Date.now().toString(),
          title: data.title || 'New Notification',
          message: data.message || JSON.stringify(data),
          type: data.type || 'info',
          timestamp: new Date(),
          read: false,
        });
      } catch (e) {
        console.error('Failed to parse SSE message', e);
      }
    }
  });

  const addNotification = (notif: Notification) => {
    setNotifications((prev) => [notif, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {status === 'connected' && (
          <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-success border border-card" title="Real-time updates active"></span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 md:w-96 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-elevated/50">
              <h3 className="font-semibold text-text-primary">Notifications</h3>
              <div className="flex gap-2">
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary-hover"
                >
                  Mark all read
                </button>
                <button 
                  onClick={clearAll}
                  className="text-xs text-text-muted hover:text-danger"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-3 rounded-lg border flex gap-3 ${
                      notif.read ? 'bg-card border-transparent' : 'bg-elevated/30 border-primary/20'
                    }`}
                  >
                     <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                       notif.type === 'success' ? 'bg-success' :
                       notif.type === 'error' ? 'bg-danger' :
                       notif.type === 'warning' ? 'bg-warning' : 'bg-info'
                     }`} />
                     <div className="flex-1 min-w-0">
                       <h4 className={`text-sm font-medium ${notif.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                         {notif.title}
                       </h4>
                       <p className="text-xs text-text-muted mt-0.5 break-words">
                         {notif.message}
                       </p>
                       <span className="text-[10px] text-text-muted mt-2 block">
                         {notif.timestamp.toLocaleTimeString()}
                       </span>
                     </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-2 border-t border-border bg-elevated/30 text-center">
               <span className="text-[10px] text-text-muted">
                 System Status: {status}
               </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
