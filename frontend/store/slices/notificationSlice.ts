import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Notification Slice
 * 
 * Purpose: Manage user notifications from SSE events
 * Stored in Redux for global state, with localStorage persistence for read/dismissed state
 */

export type NotificationType = 
  | 'device_connected'
  | 'device_disconnected'
  | 'qr_required'
  | 'message_sent'
  | 'message_failed'
  | 'scheduled_sent'
  | 'scheduled_failed'
  | 'session_expired'
  | 'info'
  | 'warning'
  | 'error';

export type NotificationPriority = 'info' | 'warning' | 'error' | 'action';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  hasErrorNotifications: boolean;
  isSSEConnected: boolean;
  lastHeartbeat: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  hasErrorNotifications: false,
  isSSEConnected: false,
  lastHeartbeat: null,
};

// Helper to generate unique notification ID
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Map event types to priorities
const getPriority = (type: NotificationType): NotificationPriority => {
  switch (type) {
    case 'device_disconnected':
    case 'message_failed':
    case 'scheduled_failed':
    case 'session_expired':
    case 'error':
      return 'error';
    case 'qr_required':
      return 'action';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
};

// Max notifications to keep
const MAX_NOTIFICATIONS = 50;

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a new notification
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'read' | 'dismissed' | 'priority'>>) => {
      const newNotification: Notification = {
        ...action.payload,
        id: generateId(),
        priority: getPriority(action.payload.type),
        read: false,
        dismissed: false,
      };

      // Add to beginning of array
      state.notifications.unshift(newNotification);

      // Trim to max
      if (state.notifications.length > MAX_NOTIFICATIONS) {
        state.notifications = state.notifications.slice(0, MAX_NOTIFICATIONS);
      }

      // Update counts
      state.unreadCount = state.notifications.filter(n => !n.read && !n.dismissed).length;
      state.hasErrorNotifications = state.notifications.some(n => n.priority === 'error' && !n.dismissed);
    },

    // Mark notification as read
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
        state.unreadCount = state.notifications.filter(n => !n.read && !n.dismissed).length;
      }
    },

    // Mark all as read
    markAllAsRead: (state) => {
      state.notifications.forEach(n => {
        n.read = true;
      });
      state.unreadCount = 0;
    },

    // Dismiss a notification
    dismissNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.dismissed = true;
        notification.read = true;
        state.unreadCount = state.notifications.filter(n => !n.read && !n.dismissed).length;
        state.hasErrorNotifications = state.notifications.some(n => n.priority === 'error' && !n.dismissed);
      }
    },

    // Dismiss all notifications
    dismissAll: (state) => {
      state.notifications.forEach(n => {
        n.dismissed = true;
        n.read = true;
      });
      state.unreadCount = 0;
      state.hasErrorNotifications = false;
    },

    // Clear old notifications (older than 7 days)
    clearOldNotifications: (state) => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      state.notifications = state.notifications.filter(n => {
        const timestamp = new Date(n.timestamp).getTime();
        return timestamp > sevenDaysAgo || (n.priority === 'error' && !n.dismissed);
      });
      state.unreadCount = state.notifications.filter(n => !n.read && !n.dismissed).length;
      state.hasErrorNotifications = state.notifications.some(n => n.priority === 'error' && !n.dismissed);
    },

    // SSE connection status
    setSSEConnected: (state, action: PayloadAction<boolean>) => {
      state.isSSEConnected = action.payload;
    },

    // Update heartbeat
    updateHeartbeat: (state, action: PayloadAction<string>) => {
      state.lastHeartbeat = action.payload;
    },

    // Load notifications from localStorage
    loadFromStorage: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read && !n.dismissed).length;
      state.hasErrorNotifications = action.payload.some(n => n.priority === 'error' && !n.dismissed);
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAll,
  clearOldNotifications,
  setSSEConnected,
  updateHeartbeat,
  loadFromStorage,
} = notificationSlice.actions;

export default notificationSlice.reducer;
