'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import GroupTable from '@/components/admin/GroupTable';
import GroupFilters from '@/components/admin/GroupFilters';
import { getGroups, GetGroupsParams } from '@/lib/adminService';
import { ApiError } from '@/lib/api';

export default function GroupsListPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalGroups: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [deviceId, setDeviceId] = useState<string | ''>('');
  const [userId, setUserId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean | ''>('');

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups
  const fetchGroups = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetGroupsParams = {
        page,
        limit: 20,
        search: search || undefined,
        deviceId: deviceId || undefined,
        userId: userId || undefined,
        isActive: isActive !== '' ? isActive : undefined,
      };

      const response = await getGroups(params);
      setGroups(response.groups);
      setPagination(response.pagination);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to fetch groups');
    } finally {
      setIsLoading(false);
    }
  }, [search, deviceId, userId, isActive]);

  // Initial load
  useEffect(() => {
    fetchGroups(1);
  }, [fetchGroups]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroups(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, deviceId, userId, isActive]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchGroups(page);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDeviceId('');
    setUserId('');
    setIsActive('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Groups Management</h1>
          <p className="text-text-secondary">Monitor and manage all WhatsApp groups</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-danger-soft border border-danger rounded-lg p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Filters */}
        <GroupFilters
          search={search}
          deviceId={deviceId}
          userId={userId}
          isActive={isActive}
          onSearchChange={setSearch}
          onDeviceIdChange={setDeviceId}
          onUserIdChange={setUserId}
          onIsActiveChange={setIsActive}
          onReset={handleResetFilters}
        />

        {/* Groups Table */}
        <Card padding="md">
          <GroupTable
            groups={groups}
            isLoading={isLoading}
          />
        </Card>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalGroups} total groups)
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
      </div>
    </AdminLayout>
  );
}

