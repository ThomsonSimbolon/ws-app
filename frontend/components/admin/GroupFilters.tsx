import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getUsers, User, getDevices, Device } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

interface GroupFiltersProps {
  search: string;
  deviceId: string | '';
  userId: number | '';
  isActive: boolean | '';
  onSearchChange: (value: string) => void;
  onDeviceIdChange: (value: string | '') => void;
  onUserIdChange: (value: number | '') => void;
  onIsActiveChange: (value: boolean | '') => void;
  onReset: () => void;
}

export default function GroupFilters({
  search,
  deviceId,
  userId,
  isActive,
  onSearchChange,
  onDeviceIdChange,
  onUserIdChange,
  onIsActiveChange,
  onReset,
}: GroupFiltersProps) {
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

  const hasActiveFilters = search || deviceId || userId || isActive !== '';

  return (
    <Card padding="md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Search by group name or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {/* Active Filter */}
        <div>
          <select
            value={isActive === '' ? '' : isActive.toString()}
            onChange={(e) => {
              const value = e.target.value;
              onIsActiveChange(value === '' ? '' : value === 'true');
            }}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
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

