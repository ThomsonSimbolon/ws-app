'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Job progress data structure from SSE events
 */
export interface JobProgressData {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
}

/**
 * SSE event data for job-progress type
 */
interface JobProgressEvent {
  type: 'job-progress';
  data: JobProgressData;
  timestamp: string;
}

interface UseJobSSEOptions {
  /** Called when a job progress update is received */
  onJobProgress?: (data: JobProgressData) => void;
  /** Connection status change callback */
  onConnectionChange?: (connected: boolean) => void;
  /** Enable/disable the SSE connection */
  enabled?: boolean;
}

interface UseJobSSEReturn {
  /** Current connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  /** Map of job IDs to their latest progress data */
  jobProgress: Map<string, JobProgressData>;
  /** Get progress for a specific job */
  getJobProgress: (jobId: string) => JobProgressData | undefined;
  /** Clear progress tracking for a specific job */
  clearJobProgress: (jobId: string) => void;
  /** Force reconnect */
  reconnect: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Custom hook for subscribing to job progress updates via SSE
 * 
 * This hook establishes an SSE connection to the backend and listens
 * for 'job-progress' events. It maintains a map of job IDs to their
 * latest progress data for easy access.
 * 
 * @example
 * const { connectionStatus, getJobProgress } = useJobSSE({
 *   onJobProgress: (data) => {
 *     console.log(`Job ${data.jobId}: ${data.progress.completed}/${data.progress.total}`);
 *   }
 * });
 */
export function useJobSSE(options: UseJobSSEOptions = {}): UseJobSSEReturn {
  const { onJobProgress, onConnectionChange, enabled = true } = options;
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [jobProgress, setJobProgress] = useState<Map<string, JobProgressData>>(new Map());
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onJobProgressRef = useRef(onJobProgress);
  const onConnectionChangeRef = useRef(onConnectionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onJobProgressRef.current = onJobProgress;
  }, [onJobProgress]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  const connect = useCallback(() => {
    if (!enabled) return;
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      console.warn('[useJobSSE] No token available, skipping SSE connection');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/events?token=${token}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    setConnectionStatus('connecting');

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      onConnectionChangeRef.current?.(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        // Handle job-progress events
        if (parsed.type === 'job-progress') {
          const progressEvent = parsed as JobProgressEvent;
          const progressData = progressEvent.data;
          
          // Update job progress map
          setJobProgress(prev => {
            const updated = new Map(prev);
            updated.set(progressData.jobId, progressData);
            return updated;
          });
          
          // Notify callback
          onJobProgressRef.current?.(progressData);
        }
      } catch (error) {
        console.error('[useJobSSE] Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      onConnectionChangeRef.current?.(false);
      eventSource.close();
      
      // Auto-reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // Connect/disconnect based on enabled flag
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  const getJobProgress = useCallback((jobId: string): JobProgressData | undefined => {
    return jobProgress.get(jobId);
  }, [jobProgress]);

  const clearJobProgress = useCallback((jobId: string): void => {
    setJobProgress(prev => {
      const updated = new Map(prev);
      updated.delete(jobId);
      return updated;
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  return {
    connectionStatus,
    jobProgress,
    getJobProgress,
    clearJobProgress,
    reconnect
  };
}
