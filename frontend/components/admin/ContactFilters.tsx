import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getUsers, User } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

interface ContactFiltersProps {
  search: string;
  userId: number | '';
  isBlocked: boolean | '';
  onSearchChange: (value: string) => void;
  onUserIdChange: (value: number | '') => void;
  onIsBlockedChange: (value: boolean | '') => void;
  onReset: () => void;
}

export default function ContactFilters({
  search,
  userId,
  isBlocked,
  onSearchChange,
  onUserIdChange,
  onIsBlockedChange,
  onReset,
}: ContactFiltersProps) {
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

  const hasActiveFilters = search || userId || isBlocked !== '';

  return (
    <Card padding="md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Search by name, phone, or email..."
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Blocked Filter */}
        <div>
          <select
            value={isBlocked === '' ? '' : isBlocked.toString()}
            onChange={(e) => {
              const value = e.target.value;
              onIsBlockedChange(value === '' ? '' : value === 'true');
            }}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Status</option>
            <option value="false">Not Blocked</option>
            <option value="true">Blocked</option>
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

