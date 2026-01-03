'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppDispatch';
import AdminLayout from '@/components/layout/AdminLayout';
import UserForm from '@/components/admin/UserForm';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { getUserDetails, updateUser, UpdateUserRequest } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  const userId = parseInt(params.userId as string);

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getUserDetails(userId);
        setUser(response.user);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to fetch user details');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleSubmit = async (data: UpdateUserRequest) => {
    try {
      setIsSaving(true);
      setError(null);
      await updateUser(userId, data);
      router.push(`/admin/users/${userId}`);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to update user');
      throw err; // Re-throw to prevent form from closing
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/users/${userId}`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <SkeletonCard />
        </div>
      </AdminLayout>
    );
  }

  if (error && !user) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
          <button
            onClick={() => router.push('/admin/users')}
            className="text-primary hover:text-primary-hover"
          >
            Back to Users List
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="text-center py-12">
            <p className="text-text-muted">User not found</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <button
            onClick={() => router.push(`/admin/users/${userId}`)}
            className="text-text-muted hover:text-text-primary mb-2 text-sm transition-colors"
          >
            ← Back to User Details
          </button>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Edit User</h1>
          <p className="text-text-secondary">Update user information</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* User Form */}
        <UserForm
          initialData={{
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSaving}
          isEdit={true}
          currentUserId={currentUser?.id}
        />
      </div>
    </AdminLayout>
  );
}

