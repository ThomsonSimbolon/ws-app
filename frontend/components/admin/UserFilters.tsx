import React from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface UserFiltersProps {
  search: string;
  role: 'admin' | 'user' | '';
  isActive: boolean | '';
  onSearchChange: (value: string) => void;
  onRoleChange: (value: 'admin' | 'user' | '') => void;
  onIsActiveChange: (value: boolean | '') => void;
  onReset: () => void;
}

export default function UserFilters({
  search,
  role,
  isActive,
  onSearchChange,
  onRoleChange,
  onIsActiveChange,
  onReset,
}: UserFiltersProps) {
  return (
    <Card padding="md">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Search by username, email, or name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value as 'admin' | 'user' | '')}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Status Filter */}
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
      {(search || role || isActive !== '') && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset Filters
          </Button>
        </div>
      )}
    </Card>
  );
}

