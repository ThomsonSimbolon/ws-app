import React from 'react';
import { Device } from '@/lib/userService';

interface DeviceTimelineProps {
  device: Device;
}

export default function DeviceTimeline({ device }: DeviceTimelineProps) {
  // Mock timeline events based on device state
  // In a real implementation with history API, this would come from backend
  const getTimelineEvents = () => {
    const events = [
      {
        id: 'registered',
        title: 'Device Registered',
        timestamp: device.createdAt,
        status: 'completed',
        icon: (
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ];

    if (device.lastSeen) {
      events.push({
        id: 'last_seen',
        title: 'Last Active',
        timestamp: device.lastSeen,
        status: 'completed',
        icon: (
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      });
    }

    // Add current status as the latest event
    let statusTitle = 'Unknown Status';
    let statusIcon = null;
    let statusColor = 'text-text-secondary';

    switch (device.status) {
      case 'connected':
        statusTitle = 'Connected & Active';
        statusColor = 'text-success';
        statusIcon = (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        );
        break;
      case 'connecting':
        statusTitle = 'Attempting Connection...';
        statusColor = 'text-warning';
        statusIcon = (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
        break;
      case 'qr_required':
        statusTitle = 'Waiting for Scan';
        statusColor = 'text-info';
        statusIcon = (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zM6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
        break;
      case 'disconnected':
      default:
        statusTitle = 'Disconnected';
        statusColor = 'text-danger';
        statusIcon = (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }

    events.push({
      id: 'current_status',
      title: statusTitle,
      timestamp: new Date().toISOString(), // Information is current
      status: 'current',
      icon: <span className={statusColor}>{statusIcon}</span>,
    });

    // Sort descending by time
    return events.reverse();
  };

  const events = getTimelineEvents();

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated ring-8 ring-card">
                  {event.icon}
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className={`text-sm font-medium ${eventIdx === 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {event.title}
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-text-muted">
                    <time dateTime={event.timestamp}>
                      {new Date(event.timestamp).toLocaleString('id-ID', {
                         month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
