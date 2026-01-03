'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppDispatch';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UserTable from '@/components/admin/UserTable';
import UserFilters from '@/components/admin/UserFilters';
import DeleteUserModal from '@/components/admin/DeleteUserModal';
import { getUsers, deleteUser, GetUsersParams } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function UsersListPage() {
  const router = useRouter();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | ''>('');
  const [isActive, setIsActive] = useState<boolean | ''>('');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: number | null;
    userName: string;
    hasActiveDevices: boolean;
    activeDeviceCount: number;
  }>({
    isOpen: false,
    userId: null,
    userName: '',
    hasActiveDevices: false,
    activeDeviceCount: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetUsersParams = {
        page,
        limit: 20,
        search: search || undefined,
        role: role || undefined,
        isActive: isActive !== '' ? isActive : undefined,
      };

      const response = await getUsers(params);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [search, role, isActive]);

  // Initial load
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, role, isActive]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchUsers(page);
  };

  // Handle delete
  const handleDeleteClick = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setDeleteModal({
        isOpen: true,
        userId,
        userName: user.fullName || user.username,
        hasActiveDevices: (user.stats?.connectedDevices || 0) > 0,
        activeDeviceCount: user.stats?.connectedDevices || 0,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.userId) return;

    try {
      setIsDeleting(true);
      await deleteUser(deleteModal.userId);
      setDeleteModal({ ...deleteModal, isOpen: false });
      fetchUsers(pagination.currentPage);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setRole('');
    setIsActive('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">User Management</h1>
            <p className="text-text-secondary">Manage users and their permissions</p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/admin/users/new')}
          >
            Create User
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Filters */}
        <UserFilters
          search={search}
          role={role}
          isActive={isActive}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onIsActiveChange={setIsActive}
          onReset={handleResetFilters}
        />

        {/* Users Table */}
        <Card padding="md">
          <UserTable
            users={users}
            isLoading={isLoading}
            onDelete={handleDeleteClick}
            currentUserId={currentUser?.id}
          />
        </Card>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} total users)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNext || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        <DeleteUserModal
          isOpen={deleteModal.isOpen}
          userName={deleteModal.userName}
          hasActiveDevices={deleteModal.hasActiveDevices}
          activeDeviceCount={deleteModal.activeDeviceCount}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal({ ...deleteModal, isOpen: false })}
          isLoading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
}

