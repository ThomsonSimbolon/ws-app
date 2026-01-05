'use client';

import React, { useState, useEffect } from 'react';
import { getUsers, updateUser, User, PaginationInfo } from '@/lib/adminService';
import UserTable from './UserTable';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useAppSelector } from '@/hooks/useAppDispatch';

export default function UserManagement() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers({
        page,
        limit: 20,
        search: searchQuery
      });
      setUsers(response.users);
      setPagination(response.pagination);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  // Search debounce
  useEffect(() => {
     const timer = setTimeout(() => {
         fetchUsers();
     }, 500);
     return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? 'LOCK' : 'UNLOCK';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await updateUser(userId, { isActive: !currentStatus });
      fetchUsers();
    } catch (err: any) {
       alert(err.message || `Failed to ${action.toLowerCase()} user`);
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    const newPassword = prompt(`Enter new password for user ${username}:`);
    if (!newPassword) return; // Cancelled
    
    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    try {
      await updateUser(userId, { password: newPassword });
      alert(`Password for ${username} has been reset successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const handleDelete = async (userId: number) => {
     // Implement delete user logic if needed, but usually soft delete or just lock
     // For now, let's keep it handled by UserTable's onDelete if passed, but I won't pass it yet unless strictly required
     // The requirement was more about Control (Lock/Unlock)
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary">User Management</h2>
        <Button variant="secondary" size="sm" onClick={fetchUsers}>
          Refresh
        </Button>
      </div>

      <Card padding="md">
        <Input 
          type="text" 
          placeholder="Search users..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {error && (
        <div className="p-4 bg-danger-soft text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <UserTable 
          users={users}
          isLoading={loading}
          currentUserId={currentUser?.id}
          onToggleStatus={handleToggleStatus}
          onResetPassword={handleResetPassword}
        />
        
         {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-divider">
            <div className="text-sm text-text-muted">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrev || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNext || loading}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
