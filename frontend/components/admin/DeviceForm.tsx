'use client';

import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getUsers, User } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

interface DeviceFormProps {
  userId?: number; // Pre-selected user ID (optional)
  onSubmit: (data: { userId: number; deviceName?: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function DeviceForm({
  userId: initialUserId,
  onSubmit,
  onCancel,
  isLoading = false,
}: DeviceFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | ''>(initialUserId || '');
  const [deviceName, setDeviceName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
    }
  }, [initialUserId]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await getUsers({ page: 1, limit: 100 });
      setUsers(response.users);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    try {
      await onSubmit({
        userId: selectedUserId as number,
        deviceName: deviceName.trim() || undefined,
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create device');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger-soft border border-danger rounded-lg p-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* User Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          User <span className="text-danger">*</span>
        </label>
        {isLoadingUsers ? (
          <div className="animate-pulse bg-elevated rounded-lg h-10"></div>
        ) : (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            disabled={!!initialUserId}
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName || user.username} ({user.email}) - {user.role}
              </option>
            ))}
          </select>
        )}
        {initialUserId && (
          <p className="text-xs text-text-muted mt-1">
            User is pre-selected and cannot be changed
          </p>
        )}
      </div>

      {/* Device Name */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Device Name
        </label>
        <Input
          type="text"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          placeholder="e.g., Device 1, Office Phone, etc."
          className="w-full"
        />
        <p className="text-xs text-text-muted mt-1">
          Optional. If not provided, a default name will be generated.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-divider">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !selectedUserId || isLoadingUsers}
        >
          {isLoading ? 'Creating...' : 'Create Device'}
        </Button>
      </div>
    </form>
  );
}

