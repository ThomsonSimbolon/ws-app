import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getUsers, User } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

interface DeviceFiltersProps {
  search: string;
  userId: number | '';
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_required' | '';
  isActive: boolean | '';
  onSearchChange: (value: string) => void;
  onUserIdChange: (value: number | '') => void;
  onStatusChange: (value: 'connected' | 'disconnected' | 'connecting' | 'qr_required' | '') => void;
  onIsActiveChange: (value: boolean | '') => void;
  onReset: () => void;
}

export default function DeviceFilters({
  search,
  userId,
  status,
  isActive,
  onSearchChange,
  onUserIdChange,
  onStatusChange,
  onIsActiveChange,
  onReset,
}: DeviceFiltersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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

  const hasActiveFilters = search || userId || status || isActive !== '';

  return (
    <Card padding="md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Search by device name, phone, or ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
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

        {/* Status Filter */}
        <div>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as typeof status)}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Status</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
            <option value="connecting">Connecting</option>
            <option value="qr_required">QR Required</option>
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
            <option value="">All Active Status</option>
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

