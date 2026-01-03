import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getUsers, User, getDevices, Device } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

interface MessageFiltersProps {
  fromNumber: string;
  toNumber: string;
  userId: number | '';
  deviceId: string | '';
  direction: 'incoming' | 'outgoing' | '';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | '';
  startDate: string;
  endDate: string;
  onFromNumberChange: (value: string) => void;
  onToNumberChange: (value: string) => void;
  onUserIdChange: (value: number | '') => void;
  onDeviceIdChange: (value: string | '') => void;
  onDirectionChange: (value: 'incoming' | 'outgoing' | '') => void;
  onStatusChange: (value: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | '') => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
}

export default function MessageFilters({
  fromNumber,
  toNumber,
  userId,
  deviceId,
  direction,
  status,
  startDate,
  endDate,
  onFromNumberChange,
  onToNumberChange,
  onUserIdChange,
  onDeviceIdChange,
  onDirectionChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
  onReset,
}: MessageFiltersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await getUsers({ page: 1, limit: 100 });
        setUsers(response.users);
      } catch (error) {
        console.error('Failed to fetch users for filter:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setIsLoadingDevices(true);
        const response = await getDevices({ page: 1, limit: 100 });
        setDevices(response.devices);
      } catch (error) {
        console.error('Failed to fetch devices for filter:', error);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchDevices();
  }, []);

  const hasActiveFilters = fromNumber || toNumber || userId || deviceId || direction || status || startDate || endDate;

  return (
    <Card padding="md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* From Number Search */}
        <div>
          <Input
            type="text"
            placeholder="From number..."
            value={fromNumber}
            onChange={(e) => onFromNumberChange(e.target.value)}
          />
        </div>

        {/* To Number Search */}
        <div>
          <Input
            type="text"
            placeholder="To number..."
            value={toNumber}
            onChange={(e) => onToNumberChange(e.target.value)}
          />
        </div>

        {/* User Filter */}
        <div>
          <select
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value === '' ? '' : parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
            disabled={isLoadingUsers}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName || user.username}
              </option>
            ))}
          </select>
        </div>

        {/* Device Filter */}
        <div>
          <select
            value={deviceId}
            onChange={(e) => onDeviceIdChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
            disabled={isLoadingDevices}
          >
            <option value="">All Devices</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.deviceName} {device.phoneNumber ? `(${device.phoneNumber})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {/* Direction Filter */}
        <div>
          <select
            value={direction}
            onChange={(e) => onDirectionChange(e.target.value as typeof direction)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Directions</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as typeof status)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          />
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          />
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset Filters
          </Button>
        </div>
      )}
    </Card>
  );
}

