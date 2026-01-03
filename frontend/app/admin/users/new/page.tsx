'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import UserForm from '@/components/admin/UserForm';
import { createUser, CreateUserRequest } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function CreateUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (data: CreateUserRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      await createUser(data);
      router.push('/admin/users');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to create user');
      throw err; // Re-throw to prevent form from closing
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/users');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <button
            onClick={handleCancel}
            className="text-text-muted hover:text-text-primary mb-2 text-sm transition-colors"
          >
            ← Back to Users
          </button>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create New User</h1>
          <p className="text-text-secondary">Add a new user to the system</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* User Form */}
        <UserForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEdit={false}
        />
      </div>
    </AdminLayout>
  );
}

